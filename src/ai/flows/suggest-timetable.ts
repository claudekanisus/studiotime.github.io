
'use server';
/**
 * @fileOverview A timetable suggestion AI agent for generating schedules for multiple classes simultaneously,
 * ensuring staff availability and preventing clashes across classes.
 *
 * - suggestAllTimetables - A function that handles the timetable suggestion process for all specified classes.
 * - SuggestAllTimetablesInput - The input type for the suggestAllTimetables function.
 * - SuggestAllTimetablesOutput - The return type for the suggestAllTimetables function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StaffDetailSchema = z.object({
  id: z.string().describe('A unique identifier for the staff member, typically their index as a string (e.g., "0", "1").'),
  assignedClasses: z.array(z.string()).describe('A list of classes this staff member is assigned to teach.'),
});

// Schema for a single activity within a timetable slot
const TimetableActivitySchema = z.object({
  staffId: z.string().describe('The ID (index from input staffDetails) of the staff member assigned to this slot.'),
});

// Schema for a single day's schedule (array of periods, each with an array of activities)
const TimetableDaySchema = z.array(z.array(TimetableActivitySchema.nullable()));

// Schema for a full timetable for one class (array of days)
const TimetableDataSchema = z.array(TimetableDaySchema);


const SuggestAllTimetablesInputSchema = z.object({
  staffDetails: z.array(StaffDetailSchema).describe('An array of ALL staff members with their details, including their unique "id" (original index) and the "assignedClasses" they can teach.'),
  classNames: z.array(z.string()).describe('A list of all class names for which timetables must be generated (e.g., ["LKG", "Class 1", "Class 2"]).'),
  periodsPerDay: z.number().describe('The number of teaching periods per day for each class (e.g., 8).'),
  daysPerWeek: z.number().describe('The number of days per week the school operates (e.g., 5).'),
  breakCount: z.number().describe('The number of breaks to be scheduled per day for EACH class (e.g., 2).'),
});
export type SuggestAllTimetablesInput = z.infer<typeof SuggestAllTimetablesInputSchema>;

const SuggestAllTimetablesOutputSchema = z.object({
  timetablesByClass: z.record(TimetableDataSchema).describe('An object where each key is a class name from the input classNames list, and the value is its 3D timetable array [day][period][activitySlot]. Each activitySlot contains the staffId assigned or null. Staff must not have clashing assignments across different class timetables for the same period.'),
});
export type SuggestAllTimetablesOutput = z.infer<typeof SuggestAllTimetablesOutputSchema>;

export async function suggestAllTimetables(input: SuggestAllTimetablesInput): Promise<SuggestAllTimetablesOutput> {
  return suggestAllTimetablesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAllTimetablesPrompt',
  input: {schema: SuggestAllTimetablesInputSchema},
  output: {schema: SuggestAllTimetablesOutputSchema},
  prompt: `You are an AI assistant that generates school timetables for ALL specified classes simultaneously, ensuring no staff member has conflicting schedules.

  Input Parameters:
  - staffDetails: A list of all staff members. Each staff member has an 'id' (their original index, e.g., "0", "1") and a list of 'assignedClasses' they are qualified to teach.
    {{#each staffDetails}}
    - Staff ID (index): {{{this.id}}}, Teaches: {{#if assignedClasses}}{{#each assignedClasses}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None{{/if}}
    {{/each}}
  - classNames: A list of all class names for which you must generate a timetable. Example: {{#each classNames}}"{{{this}}"{{#unless @last}}, {{/unless}}{{/each}}.
  - periodsPerDay: {{{periodsPerDay}}} (number of teaching periods, excluding breaks).
  - daysPerWeek: {{{daysPerWeek}}}.
  - breakCount: {{{breakCount}}} (number of breaks per day for EACH class).

  Output Specification:
  - You must return a JSON object with a single key: "timetablesByClass".
  - The value of "timetablesByClass" must be an object where each key is a class name from the input 'classNames' list (e.g., "LKG", "Class 1").
  - The value for each class name key must be its 3D timetable array: [dayIndex][periodIndex][activitySlotIndex].
    - dayIndex: 0 to ({{{daysPerWeek}}} - 1).
    - periodIndex: 0 to ({{{periodsPerDay}}} - 1) for teaching periods. Break slots are handled by making the activitySlotIndex null.
    - activitySlotIndex: For simplicity, assume one primary activity per period, so this innermost array will typically have one element: { staffId: "staff_input_index" } or null.
  - A 'null' value in an activity slot means it's a break for that class or unassigned.

  CRITICAL CONSTRAINTS FOR GENERATING ALL TIMETABLES:
  1.  **Global Staff Uniqueness Per Slot**: This is the MOST IMPORTANT rule. A staff member (identified by their 'id' from 'staffDetails') can ONLY be assigned to ONE activity (a lesson in ONE class, or be on a personal break implicitly if not teaching) in any given period across the ENTIRE school.
      - If Staff '0' is teaching 'Class 1' on Monday, Period 1, they CANNOT simultaneously teach 'Class 2' or any other class on Monday, Period 1. Their time slot is globally occupied.
      - When you assign a staff member to a class for a specific day and period, that staff member is unavailable for any other class at that exact same day and period.
  2.  **Staff-Class Qualification**: A staff member can only teach a class if that class name is present in their 'assignedClasses' list from the 'staffDetails' input.
  3.  **Breaks Per Class**: For EACH class in 'classNames', you must schedule '{{{breakCount}}}' breaks. These should be distributed reasonably throughout the day (e.g., not all at the start or end). During a class's break period, its timetable slots for that period should be 'null'. A staff member is considered free during a class's break slot *unless they are actively teaching another class during that same period*.
  4.  **Complete Coverage**: You MUST generate and return a timetable for EVERY class name listed in the 'classNames' input.
  5.  **Valid Staff IDs**: The 'staffId' in the output timetables MUST correspond to the 'id' (which is the stringified index) provided in the 'staffDetails' input.
  6.  **Fairness (Optional but good):** Try to distribute teaching load and avoid scheduling one teacher for too many consecutive periods for the same class if other qualified teachers are available for that class.

  Process:
  - Iterate through each class in 'classNames'.
  - For each class, construct its timetable day by day, period by period.
  - For each teaching slot, select an appropriate staff member who is qualified for that class AND is globally available (not teaching any other class at that exact time).
  - Ensure all constraints, especially global staff uniqueness, are met.

  Return a single JSON object matching the output schema.
  `,
});

const suggestAllTimetablesFlow = ai.defineFlow(
  {
    name: 'suggestAllTimetablesFlow',
    inputSchema: SuggestAllTimetablesInputSchema,
    outputSchema: SuggestAllTimetablesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Ensure the output is not null and timetablesByClass is present
    if (!output || !output.timetablesByClass) {
        // Attempt to construct a valid empty response if AI fails badly
        const emptyTimetables: Record<string, [][][]> = {};
        if (input.classNames && Array.isArray(input.classNames)) {
            input.classNames.forEach(className => {
                emptyTimetables[className] = Array(input.daysPerWeek).fill(null).map(() => Array(input.periodsPerDay).fill(null).map(() => [null]));
            });
        }
         // Log the error and the fallback being returned
        console.error("AI output was null or malformed. Returning fallback empty timetables. AI Input:", input);
        return { timetablesByClass: emptyTimetables };
    }
    return output;
  }
);

    