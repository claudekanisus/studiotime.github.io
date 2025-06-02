"use client";

import type { StaffMember, TimetableActivity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MAX_ACTIVITIES_PER_SLOT_DISPLAY } from "@/lib/constants";

interface TimetableCellProps {
  dayIndex: number;
  periodLabel: string; // e.g., "Period 1", "Break 1"
  isBreak: boolean;
  assignments: (TimetableActivity | null)[]; // Array of assignments for this slot from AI
  staffList: StaffMember[];
  onEditSlot: (dayIndex: number, aiPeriodIndex: number, activitySlotIndex: number, currentAssignment: TimetableActivity | null) => void;
  aiPeriodIndex: number; // The original 0-7 period index from AI, needed for editing
}

export function TimetableCell({
  periodLabel,
  isBreak,
  assignments,
  staffList,
  onEditSlot,
  dayIndex,
  aiPeriodIndex
}: TimetableCellProps) {
  
  const getStaffName = (staffId: string): string | undefined => {
    // AI might return "0", "1", etc. This maps to staffList by index.
    const staffIndex = parseInt(staffId, 10);
    if (!isNaN(staffIndex) && staffIndex >= 0 && staffIndex < staffList.length) {
      return staffList[staffIndex]?.name;
    }
    // Fallback for UUIDs or other ID formats if used during manual edit
    return staffList.find(s => s.id === staffId)?.name;
  };

  const cellContent = () => {
    if (isBreak) {
      return <span className="font-semibold text-muted-foreground">{periodLabel}</span>;
    }

    if (!assignments || assignments.length === 0) {
      return <span className="text-muted-foreground italic">Empty</span>;
    }
    
    const validAssignments = assignments.slice(0, MAX_ACTIVITIES_PER_SLOT_DISPLAY).map((assignment, index) => {
      if (assignment && assignment.staffId !== null) {
        const staffName = getStaffName(assignment.staffId);
        return (
          <div key={index} className="truncate text-sm p-1 bg-primary/20 rounded-sm">
            {staffName || `Staff ID: ${assignment.staffId}`}
          </div>
        );
      }
      return (
         <div key={index} className="truncate text-sm p-1 text-muted-foreground italic">
            Empty
          </div>
      );
    });
    
    if (validAssignments.every(va => va.props.children === 'Empty')) {
       return <span className="text-muted-foreground italic">Empty</span>;
    }

    return <div className="space-y-1">{validAssignments}</div>;
  };


  return (
    <Button
      variant="outline"
      className={cn(
        "h-24 w-full text-left p-2 flex flex-col items-start justify-start relative overflow-hidden whitespace-normal break-words shadow",
        isBreak ? "bg-muted hover:bg-muted cursor-default" : "hover:bg-secondary/80 transition-colors duration-150",
        "focus-visible:ring-accent focus-visible:ring-2 focus-visible:ring-offset-2"
      )}
      onClick={() => {
        if (!isBreak) {
          // For simplicity, always edit the first activity slot if multiple exist.
          // A more complex UI could allow choosing which sub-slot to edit.
          onEditSlot(dayIndex, aiPeriodIndex, 0, assignments?.[0] || null);
        }
      }}
      disabled={isBreak}
      aria-label={isBreak ? `${periodLabel}` : `Edit slot for ${periodLabel}`}
    >
      {cellContent()}
    </Button>
  );
}
