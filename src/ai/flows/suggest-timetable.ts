// src/ai/flows/suggest-timetable.ts
'use server';
/**
 * @fileOverview A timetable suggestion AI agent.
 *
 * - suggestTimetable - A function that handles the timetable suggestion process.
 * - SuggestTimetableInput - The input type for the suggestTimetable function.
 * - SuggestTimetableOutput - The return type for the suggestTimetable function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StaffDetailSchema = z.object({
  id: z.string().describe('A unique identifier for the staff member, typically their index as a string (e.g., "0", "1").'),
  assignedClasses: z.array(z.string()).describe('A list of classes this staff member is assigned to teach.'),
  // We can add subject here later if needed for more complex scheduling logic by the AI
  // subject: z.string().describe('The primary subject this staff member teaches.'), 
});

const SuggestTimetableInputSchema = z.object({
  staffDetails: z.array(StaffDetailSchema).describe('An array of staff members with their details.'),
  periodsPerDay: z.number().describe('The number of periods per day (e.g., 8).'),
  daysPerWeek: z.number().describe('The number of days per week (e.g., 5).'),
  breakCount: z.number().describe('The number of breaks per day (e.g. 2)'),
});
export type SuggestTimetableInput = z.infer<typeof SuggestTimetableInputSchema>;

const SuggestTimetableOutputSchema = z.object({
  timetable: z.array(
    z.array(
      z.array(
        z.object({
          staffId: z.string().describe('The ID (index from input staffDetails) of the staff member assigned to this slot.'),
        }).nullable()
      )
    )
  ).describe('A 3D array representing the timetable. [day][period][activity]. Each element contains the staffId assigned to that slot, or null if the slot is empty. Activities are assumed to be lessons unless they are breaks. Staff cannot be assigned to overlapping lessons or breaks. Breaks must be assigned to one or more slots.'),
});
export type SuggestTimetableOutput = z.infer<typeof SuggestTimetableOutputSchema>;

export async function suggestTimetable(input: SuggestTimetableInput): Promise<SuggestTimetableOutput> {
  return suggestTimetableFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTimetablePrompt',
  input: {schema: SuggestTimetableInputSchema},
  output: {schema: SuggestTimetableOutputSchema},
  prompt: `You are an AI assistant that generates a school timetable.

  You will receive details for each staff member, including their unique 'id' (which is their index in the input array) and a list of 'assignedClasses' they are qualified to teach.
  The timetable should be structured as a 3D array: [day][period][activitySlot].
  Each activitySlot should contain the staffId (the 'id' from the input staffDetails) assigned to that slot, or null if the slot is empty.
  There can be more than one activity in a period if your structure allows, but for now, assume one primary staff assignment per slot in the innermost array.

  CRITICAL CONSTRAINTS:
  1.  Staff Member Availability: A staff member (identified by their 'id') can ONLY be assigned to ONE activity (lesson or break) in any given period. They CANNOT teach two different classes simultaneously, nor teach a class while on break, nor be assigned to two lessons for the same or different classes at the same time.
  2.  Class Relevance: When a staff member is assigned to a lesson, that lesson must be for one of the classes listed in their 'assignedClasses'. The AI must decide which of their assigned classes they are teaching in that slot.
  3.  Breaks: Distribute breaks as evenly as possible. Staff should have adequate breaks.
  4.  Fairness: Try not to have the same staff member teaching continuously all day without breaks.

  Configuration Parameters:
  Staff Details:
  {{#each staffDetails}}
  - Staff ID (index): {{{this.id}}}, Assigned Classes: {{#each this.assignedClasses}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  {{/each}}
  Periods per day (excluding breaks for AI's period indexing): {{{periodsPerDay}}}
  Days per week: {{{daysPerWeek}}}
  Number of breaks to insert per day: {{{breakCount}}}

  Generate a timetable that adheres to ALL these constraints. Return a JSON object matching the output schema.
  Ensure that the generated timetable is valid, conflict-free for all staff, and efficient.
  The 'staffId' in the output timetable must correspond to the 'id' (index) provided in the 'staffDetails' input.
  `,
});

const suggestTimetableFlow = ai.defineFlow(
  {
    name: 'suggestTimetableFlow',
    inputSchema: SuggestTimetableInputSchema,
    outputSchema: SuggestTimetableOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

    