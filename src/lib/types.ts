export interface StaffMember {
  id: string;
  name: string;
  subject: string; // Added subject field
}

// Matches the AI output structure for a single activity/assignment
export interface TimetableActivity {
  staffId: string; // This will be an ID like "0", "1", referring to index in staff list
}

// Timetable structure: [dayIndex][periodIndex][activitySlotIndex]
// where activitySlotIndex refers to parallel activities within the same period.
// For now, we assume the AI might return multiple activities per period.
export type TimetableData = (TimetableActivity | null)[][][];

export interface TimetableSlotInfo {
  dayIndex: number;
  periodIndex: number; // This is the AI's period index (0-7)
  activitySlotIndex: number; // Index within the innermost array from AI
  currentAssignment: TimetableActivity | null;
}
