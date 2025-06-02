
"use client";

import * as React from "react";
import type { StaffMember, TimetableData, TimetableActivity, TimetableSlotInfo } from "@/lib/types";
import { DAYS_OF_WEEK, DISPLAY_PERIOD_LABELS } from "@/lib/constants";
import { TimetableCell } from "./TimetableCell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStaffMemberByIdOrIndex } from "@/lib/utils";

interface TimetableGridProps {
  timetable: TimetableData | null;
  staffList: StaffMember[];
  onEditSlotRequest: (slotInfo: TimetableSlotInfo) => void;
  selectedStaffIdForFilter: string | null;
  selectedClassView: string; // "all" or a specific class name
}

export function TimetableGrid({ timetable, staffList, onEditSlotRequest, selectedStaffIdForFilter, selectedClassView }: TimetableGridProps) {
  const gridTitle = selectedClassView === "all" 
    ? "Overall School Timetable" 
    : `School Timetable for ${selectedClassView}`;

  if (!timetable) {
    return (
      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {gridTitle}
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
  if (selectedClassView !== "all" && staffList.filter(s => s.assignedClass === selectedClassView).length === 0) {
     return (
      <Card className="shadow-lg w-full">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {gridTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground font-body text-center py-10">
            No staff assigned to {selectedClassView}. Assign staff to this class to see their timetable.
          </p>
        </CardContent>
      </Card>
    );
  }


  const handleCellEdit = (dayIndex: number, aiPeriodIndex: number, activitySlotIndex: number, currentAssignment: TimetableActivity | null) => {
    onEditSlotRequest({ dayIndex, periodIndex: aiPeriodIndex, activitySlotIndex, currentAssignment });
  };

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
           <CalendarDays className="h-5 w-5" /> {gridTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-px bg-border border rounded-md overflow-hidden" 
             style={{ gridTemplateColumns: `minmax(100px, auto) repeat(${DAYS_OF_WEEK.length}, minmax(150px, 1fr))` }}>
          
          <div className="p-3 font-semibold bg-primary/10 text-primary-foreground text-center sticky left-0 z-10">Period</div>
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="p-3 font-semibold bg-primary/10 text-primary-foreground text-center">
              {day}
            </div>
          ))}

          {DISPLAY_PERIOD_LABELS.map((periodLabel, displayRowIndex) => (
            <React.Fragment key={periodLabel}>
              <div className="p-3 font-semibold bg-secondary/30 text-secondary-foreground text-center sticky left-0 z-10 flex items-center justify-center">
                {periodLabel}
              </div>
              {DAYS_OF_WEEK.map((_day, dayIndex) => {
                const isBreak = periodLabel.toLowerCase().includes("break");
                let aiPeriodIndex = -1;
                
                // Assignments after class filtering (done in page.tsx)
                const assignmentsAfterClassFilter = (timetable[dayIndex] && !isBreak)
                  ? timetable[dayIndex][getAiPeriodIndex(displayRowIndex)] || []
                  : [];
                
                if (!isBreak) {
                    aiPeriodIndex = getAiPeriodIndex(displayRowIndex);
                }

                let finalCellAssignments = assignmentsAfterClassFilter;
                if (selectedStaffIdForFilter && !isBreak) {
                    finalCellAssignments = assignmentsAfterClassFilter.filter(assignment => {
                        if (!assignment?.staffId) return false;
                        const staffMember = getStaffMemberByIdOrIndex(assignment.staffId, staffList);
                        return staffMember?.id === selectedStaffIdForFilter;
                    });
                }
                
                const wasPotentiallyActive = assignmentsAfterClassFilter.some(a => a !== null);
                const isEmptyAfterStaffFilter = !finalCellAssignments.some(a => a !== null);
                const isDimmed = selectedStaffIdForFilter && !isBreak && wasPotentiallyActive && isEmptyAfterStaffFilter;

                return (
                  <div key={`${dayIndex}-${displayRowIndex}`} className={cn("bg-background p-0.5", isDimmed ? "opacity-30" : "")}>
                    <TimetableCell
                      dayIndex={dayIndex}
                      periodLabel={periodLabel}
                      isBreak={isBreak}
                      assignments={finalCellAssignments} // Pass the finally filtered assignments
                      staffList={staffList}
                      onEditSlot={handleCellEdit}
                      aiPeriodIndex={aiPeriodIndex} 
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
