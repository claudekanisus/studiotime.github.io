
"use client";

import type { StaffMember, TimetableActivity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MAX_ACTIVITIES_PER_SLOT_DISPLAY } from "@/lib/constants";
import { getStaffMemberByIdOrIndex } from "@/lib/utils"; // Import the utility

interface TimetableCellProps {
  dayIndex: number;
  periodLabel: string; 
  isBreak: boolean;
  assignments: (TimetableActivity | null)[]; 
  staffList: StaffMember[];
  onEditSlot: (dayIndex: number, aiPeriodIndex: number, activitySlotIndex: number, currentAssignment: TimetableActivity | null) => void;
  aiPeriodIndex: number; 
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
    const staffMember = getStaffMemberByIdOrIndex(staffId, staffList);
    return staffMember?.name;
  };

  const cellContent = () => {
    if (isBreak) {
      return <span className="font-semibold text-muted-foreground">{periodLabel}</span>;
    }

    // Filter out null assignments before mapping, if assignments can be [null, null] after filtering
    const actualAssignments = assignments.filter(a => a !== null);

    if (!actualAssignments || actualAssignments.length === 0) {
      return <span className="text-muted-foreground italic">Empty</span>;
    }
    
    const validAssignmentsToDisplay = actualAssignments.slice(0, MAX_ACTIVITIES_PER_SLOT_DISPLAY).map((assignment, index) => {
      if (assignment && assignment.staffId !== null) { // assignment itself is not null here
        const staffName = getStaffName(assignment.staffId);
        return (
          <div key={index} className="truncate text-sm p-1 bg-primary/20 rounded-sm">
            {staffName || `Staff ID: ${assignment.staffId}`}
          </div>
        );
      }
      // This case should ideally not be reached if actualAssignments filters nulls
      return (
         <div key={index} className="truncate text-sm p-1 text-muted-foreground italic">
            Empty
          </div>
      );
    });
    
    if (validAssignmentsToDisplay.every(va => va.props.children === 'Empty')) {
       return <span className="text-muted-foreground italic">Empty</span>;
    }

    return <div className="space-y-1">{validAssignmentsToDisplay}</div>;
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
          // Edit the first activity slot. `assignments` here are already filtered.
          // If assignments is empty, currentAssignment will be null.
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
