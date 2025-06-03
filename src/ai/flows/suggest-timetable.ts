
'use server';
/**
 * @fileOverview A timetable suggestion AI agent for generating schedules for multiple classes simultaneously,
 * ensuring staff availability and preventing clashes across classes.
 *
 * - suggestAllTimetables - A function that handles the timetable suggestion process for all specified classes.
 * - SuggestAllTimetablesInput - The input type for the suggestAllTimetables function.
 * - SuggestAllTimetablesOutput - The return type for the suggestAllTimetables function (a record mapping class names to their timetables).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { TimetableData } from '@/lib/types'; // Ensure TimetableData is imported if it's defined elsewhere and used by TimetableDataSchema

const StaffDetailSchema = z.object({
  id: z.string().describe('A unique identifier for the staff member, typically their index as a string (e.g., "0", "1").'),
  assignedClasses: z.array(z.string()).describe('A list of classes this staff member is assigned to teach.'),
});

const TimetableActivitySchema = z.object({
  staffId: z.string().describe('The ID (index from input staffDetails) of the staff member assigned to this slot.'),
});

const TimetableDaySchema = z.array(z.array(TimetableActivitySchema.nullable()));

// This schema defines the structure of TimetableData as expected by the AI and flow.
// It's an array of days, where each day is an array of periods,
// and each period is an array of activity slots (usually one).
const TimetableDataSchema = z.array(TimetableDaySchema).describe("The 3D timetable array for a single class: [dayIndex][periodIndex][activitySlotIndex]. Each activitySlot contains the staffId assigned or null.");


const SuggestAllTimetablesInputSchema = z.object({
  staffDetails: z.array(StaffDetailSchema).describe('An array of ALL staff members with their details, including their unique "id" (original index) and the "assignedClasses" they can teach.'),
  classNames: z.array(z.string()).describe('A list of all class names for which timetables must be generated (e.g., ["LKG", "Class 1", "Class 2"]).'),
  periodsPerDay: z.number().describe('The number of teaching periods per day for each class (e.g., 8).'),
  daysPerWeek: z.number().describe('The number of days per week the school operates (e.g., 5).'),
  breakCount: z.number().describe('The number of breaks to be scheduled per day for EACH class (e.g., 2).'),
});
export type SuggestAllTimetablesInput = z.infer<typeof SuggestAllTimetablesInputSchema>;

// Schema for the output of the suggestAllTimetables FLOW (and function)
// This is what the frontend consumes: a record mapping class names to their timetables.
const FlowOutputSchema = z.object({
  timetablesByClass: z.record(z.string(), TimetableDataSchema).describe('An object where each key is a class name from the input classNames list, and the value is its 3D timetable array [dayIndex][periodIndex][activitySlot]. Staff must not have clashing assignments across different class timetables for the same period.'),
});
export type SuggestAllTimetablesOutput = z.infer<typeof FlowOutputSchema>;


// Schema for what the AI PROMPT is asked to generate
const ClassTimetableEntrySchema = z.object({
  className: z.string().describe("The name of the class, matching one of the input classNames."),
  data: TimetableDataSchema // Re-uses the TimetableDataSchema defined above
});

const PromptOutputSchema = z.object({
  allClassTimetables: z.array(ClassTimetableEntrySchema).describe("An array of timetable objects, one for each class name provided in the input. Each object contains the 'className' and its corresponding 'data' (the timetable array). Ensure every class from the input 'classNames' has an entry here.")
});


export async function suggestAllTimetables(input: SuggestAllTimetablesInput): Promise<SuggestAllTimetablesOutput> {
  return suggestAllTimetablesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAllTimetablesPrompt',
  input: {schema: SuggestAllTimetablesInputSchema},
  output: {schema: PromptOutputSchema}, // AI is asked to produce this array structure
  prompt: `You are an AI assistant that generates school timetables for ALL specified classes simultaneously, ensuring no staff member has conflicting schedules.

  Input Parameters:
  - staffDetails: A list of all staff members. Each staff member has an 'id' (their original index, e.g., "0", "1") and a list of 'assignedClasses' they are qualified to teach.
    {{#each staffDetails}}
    - Staff ID (index): {{{this.id}}}, Teaches: {{#if assignedClasses}}{{#each assignedClasses}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None{{/if}}
    {{/each}}
  - classNames: A list of all class names for which you must generate a timetable. Example: {{#each classNames}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.
  - periodsPerDay: {{{periodsPerDay}}} (number of teaching periods, excluding breaks).
  - daysPerWeek: {{{daysPerWeek}}}.
  - breakCount: {{{breakCount}}} (number of breaks per day for EACH class).

  Output Specification:
  - You must return a JSON object with a single key: "allClassTimetables".
  - The value of "allClassTimetables" must be an array of objects.
  - Each object in this array must have exactly two keys:
    1. "className": A string representing the class name (e.g., "LKG", "Class 1"), which must be one of the names from the input 'classNames' list.
    2. "data": The 3D timetable array for that specific class: [dayIndex][periodIndex][activitySlotIndex].
       - dayIndex: 0 to ({{{daysPerWeek}}} - 1).
       - periodIndex: 0 to ({{{periodsPerDay}}} - 1) for teaching periods. Break slots are handled by making the activitySlotIndex null.
       - activitySlotIndex: For simplicity, assume one primary activity per period, so this innermost array will typically have one element: { staffId: "staff_input_index" } or null.
  - A 'null' value in an activity slot means it's a break for that class or unassigned.
  - Ensure an entry is generated for EVERY class name listed in the 'classNames' input.

  CRITICAL CONSTRAINTS FOR GENERATING ALL TIMETABLES:
  1.  **Global Staff Uniqueness Per Slot**: This is the MOST IMPORTANT rule. A staff member (identified by their 'id' from 'staffDetails') can ONLY be assigned to ONE activity (a lesson in ONE class, or be on a personal break implicitly if not teaching) in any given period across the ENTIRE school.
      - If Staff '0' is teaching 'Class 1' on Monday, Period 1, they CANNOT simultaneously teach 'Class 2' or any other class on Monday, Period 1. Their time slot is globally occupied.
      - When you assign a staff member to a class for a specific day and period, that staff member is unavailable for any other class at that exact same day and period.
  2.  **Staff-Class Qualification**: A staff member can only teach a class if that class name is present in their 'assignedClasses' list from the 'staffDetails' input.
  3.  **Breaks Per Class**: For EACH class in 'classNames', you must schedule '{{{breakCount}}}' breaks in its "data". These should be distributed reasonably throughout the day. During a class's break period, its timetable slots for that period should be 'null'.
  4.  **Complete Coverage**: You MUST generate and return an entry in "allClassTimetables" for EVERY class name listed in the 'classNames' input.
  5.  **Valid Staff IDs**: The 'staffId' in the output timetable "data" MUST correspond to the 'id' (which is the stringified index) provided in the 'staffDetails' input.
  6.  **Fairness (Optional but good):** Try to distribute teaching load and avoid scheduling one teacher for too many consecutive periods for the same class if other qualified teachers are available for that class.

  Process:
  - Consider all class names from the 'classNames' input.
  - For each class, construct its timetable "data" day by day, period by period.
  - When assigning a staff member to a class for a specific day and period, that staff member is unavailable for any other class at that exact same day and period.
  - Package each class's timetable "data" along with its "className" into an object.
  - Collect all these objects into the "allClassTimetables" array.

  Return a single JSON object matching the output schema with the "allClassTimetables" key.
  `,
});

const suggestAllTimetablesFlow = ai.defineFlow(
  {
    name: 'suggestAllTimetablesFlow',
    inputSchema: SuggestAllTimetablesInputSchema,
    outputSchema: FlowOutputSchema, // Flow returns the Record structure to the frontend
  },
  async (input): Promise<SuggestAllTimetablesOutput> => {
    const {output: aiOutputUntyped} = await prompt(input);
    const aiOutput = aiOutputUntyped as z.infer<typeof PromptOutputSchema> | null;

    // Prepare a complete fallback structure
    const fallbackTimetablesRecord: Record<string, TimetableData> = {};
    if (input.classNames && Array.isArray(input.classNames)) {
        input.classNames.forEach(className => {
            fallbackTimetablesRecord[className] = Array(input.daysPerWeek).fill(null).map(() => Array(input.periodsPerDay).fill(null).map(() => [null]));
        });
    }

    if (!aiOutput || !aiOutput.allClassTimetables || !Array.isArray(aiOutput.allClassTimetables)) {
        console.error("AI output was null, malformed, or allClassTimetables was not an array. Returning fallback empty timetables. AI Input:", input, "AI Output:", aiOutput);
        return { timetablesByClass: fallbackTimetablesRecord };
    }

    const transformedTimetables: Record<string, TimetableData> = {};
    const providedClassNames = new Set<string>();

    aiOutput.allClassTimetables.forEach(entry => {
      if (entry && typeof entry.className === 'string' && entry.data && Array.isArray(entry.data)) {
        // Ensure the structure of entry.data matches TimetableData (array of days, etc.)
        // This basic check might need to be more thorough if AI produces malformed data arrays
        if (entry.data.every(day => Array.isArray(day) && day.every(period => Array.isArray(period)))) {
            transformedTimetables[entry.className] = entry.data;
            providedClassNames.add(entry.className);
        } else {
            console.warn(`Malformed 'data' array for class ${entry.className} in AI output. Skipping.`);
        }
      } else {
        console.warn("Malformed entry in AI's allClassTimetables, missing className or data:", entry);
      }
    });

    // Ensure all input class names are present in the final result, using fallback if AI missed any
    input.classNames.forEach(inputClassName => {
        if (!providedClassNames.has(inputClassName)) {
            console.warn(`AI did not return a timetable for class ${inputClassName}. Using fallback empty schedule.`);
            transformedTimetables[inputClassName] = fallbackTimetablesRecord[inputClassName] || Array(input.daysPerWeek).fill(null).map(() => Array(input.periodsPerDay).fill(null).map(() => [null]));
        }
    });
    
    // Filter out any classes returned by AI that were not in the input (just in case)
    const finalTimetablesByClass: Record<string, TimetableData> = {};
    input.classNames.forEach(cn => {
      if (transformedTimetables[cn]) { // Ensure the class exists in transformedTimetables before assigning
        finalTimetablesByClass[cn] = transformedTimetables[cn];
      } else {
        // This case should be covered by the previous loop that adds fallbacks,
        // but as a safeguard:
        console.warn(`Class ${cn} was in input but missing from AI output and fallback. Creating empty.`);
        finalTimetablesByClass[cn] = fallbackTimetablesRecord[cn] || Array(input.daysPerWeek).fill(null).map(() => Array(input.periodsPerDay).fill(null).map(() => [null]));
      }
    });


    if (Object.keys(finalTimetablesByClass).length === 0 && input.classNames.length > 0) {
        console.error("Transformation resulted in empty timetablesByClass, though input classes were present. Using fallback. AI Output:", aiOutput);
        return { timetablesByClass: fallbackTimetablesRecord }; // Return the full fallback
    }
    
    return { timetablesByClass: finalTimetablesByClass };
  }
);

