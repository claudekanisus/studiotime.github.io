
export const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const AI_PERIODS_PER_DAY = 8; // Number of periods AI generates
export const AI_DAYS_PER_WEEK = 5;
export const AI_BREAK_COUNT = 2;

// Visual representation: 8 periods + 2 breaks = 10 rows
// Break 1 is after the 3rd teaching period (index 2)
// Break 2 is after the 5th teaching period (index 4, considering 0-indexed AI periods)
// AI period indices: 0, 1, 2, (Break1), 3, 4, (Break2), 5, 6, 7

export const DISPLAY_PERIOD_LABELS = [
  "Period 1", "Period 2", "Period 3",
  "Break 1",
  "Period 4", "Period 5",
  "Break 2",
  "Period 6", "Period 7", "Period 8"
];

// Max number of parallel activities/staff the UI will attempt to render per slot
export const MAX_ACTIVITIES_PER_SLOT_DISPLAY = 2;

export const CLASS_LEVELS = [
  "LKG",
  "UKG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
];
