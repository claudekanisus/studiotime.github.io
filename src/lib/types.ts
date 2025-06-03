
export interface StaffMember {
  id: string;
  name: string;
  subject: string;
  assignedClass: string[]; // Can be assigned to multiple classes
}

// Matches the AI output structure for a single activity/assignment
export interface TimetableActivity {
  staffId: string; // This will be an ID like "0", "1", referring to index in staff list
}

// Timetable structure for a single class: [dayIndex][periodIndex][activitySlotIndex]
// where activitySlotIndex refers to parallel activities within the same period.
export type TimetableData = (TimetableActivity | null)[][][];

export interface TimetableSlotInfo {
  dayIndex: number;
  periodIndex: number; // This is the AI's period index (0-7 for teaching periods)
  activitySlotIndex: number; // Index within the innermost array from AI
  currentAssignment: TimetableActivity | null;
  className: string; // The class whose timetable this slot belongs to
}
