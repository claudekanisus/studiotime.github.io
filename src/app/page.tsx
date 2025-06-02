"use client";

import { useState, useEffect } from "react";
import type { StaffMember, TimetableData, TimetableSlotInfo, TimetableActivity } from "@/lib/types";
import { StaffForm } from "@/components/staff/StaffForm";
import { StaffList } from "@/components/staff/StaffList";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { EditSlotDialog } from "@/components/timetable/EditSlotDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { suggestTimetable, type SuggestTimetableInput, type SuggestTimetableOutput } from "@/ai/flows/suggest-timetable";
import { AI_PERIODS_PER_DAY, AI_DAYS_PER_WEEK, AI_BREAK_COUNT, DAYS_OF_WEEK } from "@/lib/constants";
import { AppLogo } from "@/components/icons";
import { Separator } from "@/components/ui/separator";
import { Loader2, Bot, Users, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSlotInfo, setEditingSlotInfo] = useState<TimetableSlotInfo | null>(null);
  const [selectedStaffIdForFilter, setSelectedStaffIdForFilter] = useState<string | null>(null);


  const { toast } = useToast();

  // Load staff from localStorage on initial render
  useEffect(() => {
    const storedStaff = localStorage.getItem("timetableGeniusStaff");
    if (storedStaff) {
      setStaffMembers(JSON.parse(storedStaff));
    }
    const storedTimetable = localStorage.getItem("timetableGeniusTimetable");
    if (storedTimetable) {
      setTimetable(JSON.parse(storedTimetable));
    }
  }, []);

  // Save staff to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("timetableGeniusStaff", JSON.stringify(staffMembers));
  }, [staffMembers]);

  // Save timetable to localStorage
  useEffect(() => {
    if (timetable) {
      localStorage.setItem("timetableGeniusTimetable", JSON.stringify(timetable));
    }
  }, [timetable]);


  const handleStaffSubmit = (data: { name: string }) => {
    if (editingStaff) {
      setStaffMembers(
        staffMembers.map((s) =>
          s.id === editingStaff.id ? { ...s, name: data.name } : s
        )
      );
      toast({ title: "Staff Updated", description: `${data.name} has been updated.` });
      setEditingStaff(null);
    } else {
      const newStaff: StaffMember = { id: crypto.randomUUID(), name: data.name };
      setStaffMembers([...staffMembers, newStaff]);
      toast({ title: "Staff Added", description: `${data.name} has been added.` });
    }
  };

  const handleEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
  };

  const handleDeleteStaff = (staffId: string) => {
    setStaffMembers(staffMembers.filter((s) => s.id !== staffId));
    toast({ title: "Staff Deleted", description: `Staff member has been deleted.` });
    if (editingStaff?.id === staffId) {
      setEditingStaff(null);
    }
  };

  const handleGenerateTimetable = async () => {
    if (staffMembers.length === 0) {
      toast({
        title: "Cannot Generate Timetable",
        description: "Please add at least one staff member.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const input: SuggestTimetableInput = {
        staffCount: staffMembers.length,
        periodsPerDay: AI_PERIODS_PER_DAY,
        daysPerWeek: AI_DAYS_PER_WEEK,
        breakCount: AI_BREAK_COUNT,
      };
      const result: SuggestTimetableOutput = await suggestTimetable(input);
      // The AI returns a 3D array: [day][period][activity_slot_object_or_null_array]
      // Ensure it's always an array for the innermost, even if schema says nullable obj
      // The schema is already z.array(z.array(z.array(z.object({ staffId: string }).nullable())))
      // So result.timetable IS TimetableData
      setTimetable(result.timetable);
      toast({
        title: "Timetable Generated",
        description: "A new timetable has been suggested by AI.",
      });
    } catch (error) {
      console.error("Error generating timetable:", error);
      toast({
        title: "Generation Failed",
        description: "Could not generate timetable. Check console for errors.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEditSlotRequest = (slotInfo: TimetableSlotInfo) => {
    setEditingSlotInfo(slotInfo);
    setIsEditDialogOpen(true);
  };

  const handleSaveSlot = (dayIndex: number, aiPeriodIndex: number, activitySlotIndex: number, newStaffId: string | null) => {
    if (!timetable) return;

    const newTimetable = timetable.map(daySchedule => 
      daySchedule.map(periodActivities => [...periodActivities])
    );
    
    // Ensure the structure exists
    if (!newTimetable[dayIndex]) newTimetable[dayIndex] = [];
    if (!newTimetable[dayIndex][aiPeriodIndex]) newTimetable[dayIndex][aiPeriodIndex] = [];

    // Update the specific activity slot
    newTimetable[dayIndex][aiPeriodIndex][activitySlotIndex] = newStaffId ? { staffId: newStaffId } : null;
    
    setTimetable(newTimetable);
    toast({ title: "Slot Updated", description: "Timetable slot has been manually updated." });
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-background font-body">
      <header className="w-full max-w-6xl mb-8 text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-3">
          <AppLogo className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-headline font-bold text-primary-foreground mix-blend-multiply">TimeTableGenius</h1>
        </div>
        <p className="text-muted-foreground mt-2">
          Intelligent school timetable creation and management.
        </p>
      </header>

      <main className="w-full max-w-6xl space-y-8">
        <section id="staff-management" className="flex flex-col md:flex-row gap-8 items-start">
          <StaffForm
            staffMember={editingStaff}
            onSubmit={handleStaffSubmit}
            onCancel={editingStaff ? () => setEditingStaff(null) : undefined}
          />
          <StaffList
            staffMembers={staffMembers}
            onEdit={handleEditStaff}
            onDelete={handleDeleteStaff}
          />
        </section>

        <Separator className="my-8" />

        <section id="timetable-controls" className="space-y-4">
            <Card className="shadow-lg">
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <Button onClick={handleGenerateTimetable} disabled={isLoading} size="lg">
                        {isLoading ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                        <Bot className="mr-2 h-5 w-5" />
                        )}
                        {timetable ? "Regenerate Timetable" : "Generate Timetable"}
                    </Button>
                    {staffMembers.length > 0 && timetable && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Filter className="h-5 w-5 text-muted-foreground"/>
                            <Select
                                value={selectedStaffIdForFilter || "all"}
                                onValueChange={(value) => setSelectedStaffIdForFilter(value === "all" ? null : value)}
                                
                            >
                                <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Filter by staff..." />
                                </SelectTrigger>
                                <SelectContent>
                                <SelectItem value="all">
                                    <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" /> Show All Staff
                                    </div>
                                </SelectItem>
                                {staffMembers.map((staff) => (
                                    <SelectItem key={staff.id} value={staff.id}>
                                    {staff.name}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
            </Card>
        </section>


        <section id="timetable-display">
          <TimetableGrid 
            timetable={timetable} 
            staffList={staffMembers} 
            onEditSlotRequest={handleEditSlotRequest}
            selectedStaffIdForFilter={selectedStaffIdForFilter}
          />
        </section>
      </main>

      <EditSlotDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        slotInfo={editingSlotInfo}
        staffList={staffMembers}
        onSave={handleSaveSlot}
      />
      
      <footer className="w-full max-w-6xl mt-16 pt-8 border-t text-center text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} TimeTableGenius. Built with intelligence.</p>
      </footer>
    </div>
  );
}
