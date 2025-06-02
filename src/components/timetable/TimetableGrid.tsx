"use client";

import type { StaffMember, TimetableData, TimetableActivity, TimetableSlotInfo } from "@/lib/types";
import { DAYS_OF_WEEK, DISPLAY_PERIOD_LABELS } from "@/lib/constants";
import { TimetableCell } from "./TimetableCell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, VenetianMask } from "lucide-react";

interface TimetableGridProps {
  timetable: TimetableData | null;
  staffList: StaffMember[];
  onEditSlotRequest: (slotInfo: TimetableSlotInfo) => void;
  selectedStaffIdForFilter: string | null;
}

export function TimetableGrid({ timetable, staffList, onEditSlotRequest, selectedStaffIdForFilter }: TimetableGridProps) {
  if (!timetable) {
    return (
      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            School Timetable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground font-body text-center py-10">
            No timetable generated yet. Click "Generate Timetable" to start.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleCellEdit = (dayIndex: number, aiPeriodIndex: number, activitySlotIndex: number, currentAssignment: TimetableActivity | null) => {
    onEditSlotRequest({ dayIndex, periodIndex: aiPeriodIndex, activitySlotIndex, currentAssignment });
  };

  // Helper to map display row index to AI period index
  const getAiPeriodIndex = (displayRowIndex: number): number => {
    let aiPeriodIdx = 0;
    let currentDisplayRow = 0;
    while(currentDisplayRow < displayRowIndex) {
      if (!DISPLAY_PERIOD_LABELS[currentDisplayRow].toLowerCase().includes('break')) {
        aiPeriodIdx++;
      }
      currentDisplayRow++;
    }
    return aiPeriodIdx;
  };


  return (
    <Card className="shadow-lg w-full overflow-x-auto">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
           <CalendarDays className="h-5 w-5" /> School Timetable
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-px bg-border border rounded-md overflow-hidden" 
             style={{ gridTemplateColumns: `minmax(100px, auto) repeat(${DAYS_OF_WEEK.length}, minmax(150px, 1fr))` }}>
          {/* Header Row: Empty + Days */}
          <div className="p-3 font-semibold bg-primary/10 text-primary-foreground text-center sticky left-0 z-10">Period</div>
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="p-3 font-semibold bg-primary/10 text-primary-foreground text-center">
              {day}
            </div>
          ))}

          {/* Timetable Rows */}
          {DISPLAY_PERIOD_LABELS.map((periodLabel, displayRowIndex) => (
            <React.Fragment key={periodLabel}>
              <div className="p-3 font-semibold bg-secondary/30 text-secondary-foreground text-center sticky left-0 z-10 flex items-center justify-center">
                {periodLabel}
              </div>
              {DAYS_OF_WEEK.map((_day, dayIndex) => {
                const isBreak = periodLabel.toLowerCase().includes("break");
                let assignments: (TimetableActivity | null)[] = [];
                let aiPeriodIndex = -1;

                if (!isBreak && timetable[dayIndex]) {
                  aiPeriodIndex = getAiPeriodIndex(displayRowIndex);
                  if (timetable[dayIndex][aiPeriodIndex]) {
                     assignments = timetable[dayIndex][aiPeriodIndex];
                  }
                }
                
                // Apply filter
                let cellAssignments = assignments;
                if (selectedStaffIdForFilter && !isBreak) {
                    cellAssignments = assignments.map(assignment => {
                        if (assignment?.staffId) {
                            const staffMemberIndex = parseInt(assignment.staffId, 10);
                            if (!isNaN(staffMemberIndex) && staffMemberIndex >= 0 && staffMemberIndex < staffList.length) {
                                return staffList[staffMemberIndex].id === selectedStaffIdForFilter ? assignment : null;
                            }
                            // If staffId is already a UUID
                            return assignment.staffId === selectedStaffIdForFilter ? assignment : null;
                        }
                        return null;
                    });
                }
                
                const hasVisibleAssignment = cellAssignments.some(a => a !== null);
                const isDimmed = selectedStaffIdForFilter && !isBreak && !hasVisibleAssignment;


                return (
                  <div key={`${dayIndex}-${displayRowIndex}`} className={cn("bg-background p-0.5", isDimmed ? "opacity-30" : "")}>
                    <TimetableCell
                      dayIndex={dayIndex}
                      periodLabel={periodLabel}
                      isBreak={isBreak}
                      assignments={cellAssignments}
                      staffList={staffList}
                      onEditSlot={handleCellEdit}
                      aiPeriodIndex={aiPeriodIndex} // Pass the original AI period index
                    />
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
