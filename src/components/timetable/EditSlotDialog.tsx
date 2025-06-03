
"use client";

import type { StaffMember, TimetableSlotInfo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { XCircle, CheckCircle, Edit3 } from "lucide-react";
import { DAYS_OF_WEEK, DISPLAY_PERIOD_LABELS } from "@/lib/constants";
import { getStaffMemberByIdOrIndex } from "@/lib/utils";

interface EditSlotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  slotInfo: TimetableSlotInfo | null; // Now includes className
  staffList: StaffMember[];
  onSave: (dayIndex: number, aiPeriodIndex: number, activitySlotIndex: number, newStaffId: string | null) => void;
}

const getDisplayPeriodLabelFromAiIndex = (aiPeriodIndex: number): string => {
  if (aiPeriodIndex < 0) return "Invalid Period";
  let currentAiPeriod = 0;
  for (let i = 0; i < DISPLAY_PERIOD_LABELS.length; i++) {
    if (currentAiPeriod === aiPeriodIndex && !DISPLAY_PERIOD_LABELS[i].toLowerCase().includes('break')) {
      return DISPLAY_PERIOD_LABELS[i];
    }
    if (!DISPLAY_PERIOD_LABELS[i].toLowerCase().includes('break')) {
      currentAiPeriod++;
    }
  }
  return DISPLAY_PERIOD_LABELS[DISPLAY_PERIOD_LABELS.length - 1] || `Period ${aiPeriodIndex + 1}`;
};


export function EditSlotDialog({ isOpen, onClose, slotInfo, staffList, onSave }: EditSlotDialogProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && slotInfo && slotInfo.currentAssignment && slotInfo.currentAssignment.staffId) {
      const staffMember = getStaffMemberByIdOrIndex(slotInfo.currentAssignment.staffId, staffList);
      setSelectedStaffId(staffMember ? staffMember.id : null);
    } else if (isOpen) {
      setSelectedStaffId(null);
    }
  }, [isOpen, slotInfo, staffList]);


  if (!slotInfo) return null;

  const handleSave = () => {
    onSave(slotInfo.dayIndex, slotInfo.periodIndex, slotInfo.activitySlotIndex, selectedStaffId);
    onClose();
  };

  const dayName = DAYS_OF_WEEK[slotInfo.dayIndex] || `Day ${slotInfo.dayIndex + 1}`;
  const periodName = getDisplayPeriodLabelFromAiIndex(slotInfo.periodIndex);
  // Filter staffList to only those assigned to the slotInfo.className
  const availableStaffForClass = staffList.filter(staff => staff.assignedClass.includes(slotInfo.className));


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline">
            <Edit3 className="h-5 w-5" /> Edit Timetable Slot
          </DialogTitle>
          <DialogDescription>
            Assign a staff member to {dayName}, {periodName} (Activity Slot {slotInfo.activitySlotIndex + 1}) for class {slotInfo.className}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Select
            value={selectedStaffId || "unassigned"}
            onValueChange={(value) => setSelectedStaffId(value === "unassigned" ? null : value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select staff member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-muted-foreground" /> Unassigned
                </div>
              </SelectItem>
              {availableStaffForClass.map((staff) => ( // Use filtered list
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.name} ({staff.assignedClass.join(', ')})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            <CheckCircle className="mr-2 h-4 w-4" /> Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
