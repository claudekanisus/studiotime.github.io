"use client";

import type { StaffMember, TimetableSlotInfo, TimetableActivity } from "@/lib/types";
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

interface EditSlotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  slotInfo: TimetableSlotInfo | null;
  staffList: StaffMember[];
  onSave: (dayIndex: number, aiPeriodIndex: number, activitySlotIndex: number, newStaffId: string | null) => void;
}

// Helper to map AI period index to display label (considering breaks)
const getDisplayPeriodLabelFromAiIndex = (aiPeriodIndex: number): string => {
  let displayIndex = 0;
  let currentAiPeriod = 0;
  while(currentAiPeriod < aiPeriodIndex && displayIndex < DISPLAY_PERIOD_LABELS.length -1) {
    if (!DISPLAY_PERIOD_LABELS[displayIndex].toLowerCase().includes('break')) {
      currentAiPeriod++;
    }
    displayIndex++;
  }
  // Ensure we find the correct teaching period label
  while(DISPLAY_PERIOD_LABELS[displayIndex].toLowerCase().includes('break') && displayIndex < DISPLAY_PERIOD_LABELS.length -1) {
    displayIndex++;
  }
  return DISPLAY_PERIOD_LABELS[displayIndex] || `Period ${aiPeriodIndex + 1}`;
};


export function EditSlotDialog({ isOpen, onClose, slotInfo, staffList, onSave }: EditSlotDialogProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  useEffect(() => {
    if (slotInfo && slotInfo.currentAssignment) {
      // The AI might return "0", "1" etc. Map this to actual staff ID if needed or use as is.
      // For manual edit, we should use the StaffMember.id (UUID)
      // If currentAssignment.staffId is numeric, map it to staffList[id].id
      const aiStaffId = slotInfo.currentAssignment.staffId;
      const staffIndex = parseInt(aiStaffId, 10);
      if (!isNaN(staffIndex) && staffIndex >= 0 && staffIndex < staffList.length) {
        setSelectedStaffId(staffList[staffIndex].id);
      } else {
        // If it's already a UUID (from previous manual edit)
        setSelectedStaffId(aiStaffId);
      }
    } else {
      setSelectedStaffId(null);
    }
  }, [slotInfo, staffList]);

  if (!slotInfo) return null;

  const handleSave = () => {
    onSave(slotInfo.dayIndex, slotInfo.periodIndex, slotInfo.activitySlotIndex, selectedStaffId);
    onClose();
  };

  const dayName = DAYS_OF_WEEK[slotInfo.dayIndex] || `Day ${slotInfo.dayIndex + 1}`;
  const periodName = getDisplayPeriodLabelFromAiIndex(slotInfo.periodIndex);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline">
            <Edit3 className="h-5 w-5" /> Edit Timetable Slot
          </DialogTitle>
          <DialogDescription>
            Assign a staff member to {dayName}, {periodName} (Activity Slot {slotInfo.activitySlotIndex + 1}).
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
              {staffList.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.name}
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
