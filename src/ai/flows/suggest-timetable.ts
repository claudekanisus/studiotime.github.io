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

const SuggestTimetableInputSchema = z.object({
  staffCount: z.number().describe('The number of staff members.'),
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
          staffId: z.string().describe('The ID of the staff member assigned to this slot.'),
        }).nullable()
      )
    )
  ).describe('A 3D array representing the timetable. [day][period][activity].  Each element contains the staffId assigned to that slot, or null if the slot is empty. Activities are assumed to be lessons unless they are breaks. Staff cannot be assigned to overlapping lessons or breaks. Breaks must be assigned to one or more slots.'),
});
export type SuggestTimetableOutput = z.infer<typeof SuggestTimetableOutputSchema>;

export async function suggestTimetable(input: SuggestTimetableInput): Promise<SuggestTimetableOutput> {
  return suggestTimetableFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTimetablePrompt',
  input: {schema: SuggestTimetableInputSchema},
  output: {schema: SuggestTimetableOutputSchema},
  prompt: `You are an AI assistant that generates a school timetable based on the number of staff, periods per day, and days per week.

  The timetable should be structured as a 3D array: [day][period][activity].
  Each slot should contain the staffId assigned to that slot, or null if the slot is empty. There can be more than one activity in a period. For example, a class may be split into two groups and two staff are needed.
  Staff cannot be assigned to overlapping lessons or breaks.
  Try to make break times even.
  Try not to have the same staff member teaching all day with no breaks.

  Here are the configuration parameters for the timetable:
  Number of staff: {{{staffCount}}}
  Periods per day: {{{periodsPerDay}}}
  Days per week: {{{daysPerWeek}}}
  Number of breaks per day: {{{breakCount}}}

  Generate a timetable that adheres to these constraints. Return a JSON object.
  Ensure that the generated timetable is valid and efficient.
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
