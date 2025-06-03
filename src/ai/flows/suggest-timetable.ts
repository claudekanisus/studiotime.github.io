
// src/ai/flows/suggest-timetable.ts
'use server';
/**
 * @fileOverview A timetable suggestion AI agent for a specific class.
 *
 * - suggestTimetable - A function that handles the timetable suggestion process for a single class.
 * - SuggestTimetableInput - The input type for the suggestTimetable function.
 * - SuggestTimetableOutput - The return type for the suggestTimetable function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StaffDetailSchema = z.object({
  id: z.string().describe('A unique identifier for the staff member, typically their index as a string (e.g., "0", "1").'),
  assignedClasses: z.array(z.string()).describe('A list of classes this staff member is assigned to teach.'),
});

const SuggestTimetableInputSchema = z.object({
  staffDetails: z.array(StaffDetailSchema).describe('An array of ALL staff members with their details. The AI should filter these based on the target className.'),
  className: z.string().describe('The specific class for which to generate the timetable (e.g., "Class 1", "LKG").'),
  periodsPerDay: z.number().describe('The number of periods per day (e.g., 8).'),
  daysPerWeek: z.number().describe('The number of days per week (e.g., 5).'),
  breakCount: z.number().describe('The number of breaks per day (e.g. 2) to be scheduled for this class.'),
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
  ).describe('A 3D array representing the timetable for the specified class. [day][period][activity]. Each element contains the staffId assigned to that slot, or null if the slot is empty (e.g. a break for this class or unassigned). Activities are assumed to be lessons unless they are breaks. Staff cannot be assigned to overlapping lessons or breaks.'),
});
export type SuggestTimetableOutput = z.infer<typeof SuggestTimetableOutputSchema>;

export async function suggestTimetable(input: SuggestTimetableInput): Promise<SuggestTimetableOutput> {
  return suggestTimetableFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTimetablePrompt',
  input: {schema: SuggestTimetableInputSchema},
  output: {schema: SuggestTimetableOutputSchema},
  prompt: `You are an AI assistant that generates a school timetable for a *specific class*: **{{{className}}}**.

  You will receive details for ALL staff members, including their unique 'id' (which is their index in the input array) and a list of 'assignedClasses' they are qualified to teach.
  You must ONLY consider and schedule staff members whose 'assignedClasses' list *contains* the target class: **{{{className}}}**.
  If a staff member is assigned to {{{className}}}, they can teach it during a period.

  The timetable should be structured as a 3D array for THIS CLASS ONLY: [day][period][activitySlot].
  Each activitySlot should contain the 'staffId' (which is the 'id' from the input staffDetails, i.e., their original index) of the staff member assigned to teach a lesson for **{{{className}}}** in that slot.
  If the slot is a break for this class, or if no staff member is teaching {{{className}}} in that slot, it should be null.
  There can be more than one activity in a period if your structure allows, but for now, assume one primary staff assignment per slot in the innermost array for lessons.

  CRITICAL CONSTRAINTS for scheduling staff for class {{{className}}}:
  1.  Staff Member Availability: A staff member (identified by their 'id') can ONLY be assigned to ONE activity (a lesson for {{{className}}}, a lesson for another class they might be teaching simultaneously if not specified here, or a break) in any given period across the entire school. Since you are only generating for {{{className}}}, ensure that if you assign a staff here, they are not implicitly double-booked if they teach other classes. For the scope of this request, focus on this class's schedule. Assume other class schedules will respect this staff member's assignment here.
  2.  Relevance to {{{className}}}: When a staff member is assigned to a lesson in this timetable, that lesson IS for **{{{className}}}**.
  3.  Breaks for {{{className}}}: Distribute '{{{breakCount}}}' breaks throughout the day for this class as evenly as possible. During a break slot for {{{className}}}, the activitySlot should be null.
  4.  Fairness: Try not to have the same staff member teaching {{{className}}} continuously all day without breaks, if multiple teachers are available for {{{className}}}.

  Configuration Parameters:
  Target Class for this Timetable: **{{{className}}}**
  All Staff Details (filter these based on {{{className}}} for assignments):
  {{#each staffDetails}}
  - Staff ID (index): {{{this.id}}}, Assigned Classes: {{#each this.assignedClasses}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  {{/each}}
  Periods per day (excluding breaks for AI's period indexing): {{{periodsPerDay}}}
  Days per week: {{{daysPerWeek}}}
  Number of breaks to insert per day for class {{{className}}}: {{{breakCount}}}

  Generate a timetable specifically for class **{{{className}}}** that adheres to ALL these constraints. Return a JSON object matching the output schema.
  Ensure that the generated timetable is valid, conflict-free for all staff teaching {{{className}}}, and efficient.
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
