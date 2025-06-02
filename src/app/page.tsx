
"use client";

import { useState, useEffect, useMemo } from "react";
import type { StaffMember, TimetableData, TimetableSlotInfo, TimetableActivity } from "@/lib/types";
import { StaffForm } from "@/components/staff/StaffForm";
import { StaffList } from "@/components/staff/StaffList";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { EditSlotDialog } from "@/components/timetable/EditSlotDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { suggestTimetable, type SuggestTimetableInput, type SuggestTimetableOutput } from "@/ai/flows/suggest-timetable";
import { AI_PERIODS_PER_DAY, AI_DAYS_PER_WEEK, AI_BREAK_COUNT, CLASS_LEVELS } from "@/lib/constants";
import { AppLogo } from "@/components/icons";
import { Separator } from "@/components/ui/separator";
import { Loader2, Bot, Users, Filter, BookOpen, Columns } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStaffMemberByIdOrIndex } from "@/lib/utils";

export default function HomePage() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [timetable, setTimetable] = useState<TimetableData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSlotInfo, setEditingSlotInfo] = useState<TimetableSlotInfo | null>(null);
  const [selectedStaffIdForFilter, setSelectedStaffIdForFilter] = useState<string | null>(null);
  const [selectedClassView, setSelectedClassView] = useState<string>("all");


  const { toast } = useToast();

  useEffect(() => {
    const storedStaff = localStorage.getItem("timetableGeniusStaff");
    if (storedStaff) {
      const parsedStaff = JSON.parse(storedStaff) as Partial<StaffMember>[];
      const staffWithDetailsEnsured = parsedStaff.map(staff => ({
        id: staff.id || crypto.randomUUID(),
        name: staff.name || "Unknown",
        subject: staff.subject || "", 
        assignedClass: staff.assignedClass || "",
      }));
      setStaffMembers(staffWithDetailsEnsured as StaffMember[]);
    }
    const storedTimetable = localStorage.getItem("timetableGeniusTimetable");
    if (storedTimetable) {
      setTimetable(JSON.parse(storedTimetable));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("timetableGeniusStaff", JSON.stringify(staffMembers));
  }, [staffMembers]);

  useEffect(() => {
    if (timetable) {
      localStorage.setItem("timetableGeniusTimetable", JSON.stringify(timetable));
    }
  }, [timetable]);


  const handleStaffSubmit = (data: { name: string; subject: string; assignedClass: string }) => {
    if (editingStaff) {
      setStaffMembers(
        staffMembers.map((s) =>
          s.id === editingStaff.id ? { ...s, name: data.name, subject: data.subject, assignedClass: data.assignedClass } : s
        )
      );
      toast({ title: "Staff Updated", description: `${data.name} (${data.subject}, ${data.assignedClass}) has been updated.` });
      setEditingStaff(null);
    } else {
      const newStaff: StaffMember = { 
        id: crypto.randomUUID(), 
        name: data.name, 
        subject: data.subject,
        assignedClass: data.assignedClass 
      };
      setStaffMembers([...staffMembers, newStaff]);
      toast({ title: "Staff Added", description: `${data.name} (${data.subject}, ${data.assignedClass}) has been added.` });
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
     // If the deleted staff was the one being filtered by, clear the filter
    if (selectedStaffIdForFilter === staffId) {
      setSelectedStaffIdForFilter(null);
    }
    // If the deleted staff's class is no longer present, reset class view if it was selected
    const remainingClasses = new Set(staffMembers.filter(s => s.id !== staffId).map(s => s.assignedClass).filter(Boolean));
    if (selectedClassView !== "all" && !remainingClasses.has(selectedClassView)) {
        setSelectedClassView("all");
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
    
    if (!newTimetable[dayIndex]) newTimetable[dayIndex] = [];
    if (!newTimetable[dayIndex][aiPeriodIndex]) newTimetable[dayIndex][aiPeriodIndex] = [];

    newTimetable[dayIndex][aiPeriodIndex][activitySlotIndex] = newStaffId ? { staffId: newStaffId } : null;
    
    setTimetable(newTimetable);
    toast({ title: "Slot Updated", description: "Timetable slot has been manually updated." });
  };

  const availableClasses = useMemo(() => {
    const uniqueClasses = Array.from(new Set(staffMembers.map(s => s.assignedClass).filter(Boolean)));
    // Sort class levels logically
    uniqueClasses.sort((a, b) => {
        const aLKG = a === "LKG";
        const bLKG = b === "LKG";
        const aUKG = a === "UKG";
        const bUKG = b === "UKG";

        if (aLKG && !bLKG) return -1;
        if (!aLKG && bLKG) return 1;
        if (aUKG && !bUKG && !bLKG) return -1;
        if (!aUKG && bUKG && !aLKG) return 1;
        
        if (aLKG && bUKG) return -1; // LKG before UKG
        if (aUKG && bLKG) return 1;  // UKG after LKG


        const aNum = parseInt(a.replace("Class ", ""), 10);
        const bNum = parseInt(b.replace("Class ", ""), 10);

        if (!isNaN(aNum) && isNaN(bNum)) return 1; // numbers after LKG/UKG
        if (isNaN(aNum) && !isNaN(bNum)) return -1;


        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return a.localeCompare(b); // Fallback for LKG/UKG vs each other or other non-numeric
    });
    return ["all", ...uniqueClasses];
  }, [staffMembers]);

  const timetableForDisplay = useMemo(() => {
    if (!timetable) return null;
    if (selectedClassView === "all") return timetable;

    return timetable.map(daySchedule =>
      daySchedule.map(periodActivities =>
        periodActivities.map(activity => {
          if (!activity || !activity.staffId) return null;
          const staffMember = getStaffMemberByIdOrIndex(activity.staffId, staffMembers);
          if (staffMember && staffMember.assignedClass === selectedClassView) {
            return activity;
          }
          return null;
        })
      )
    );
  }, [timetable, selectedClassView, staffMembers]);


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
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-start justify-between flex-wrap">
                    <Button onClick={handleGenerateTimetable} disabled={isLoading} size="lg" className="w-full sm:w-auto">
                        {isLoading ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                        <Bot className="mr-2 h-5 w-5" />
                        )}
                        {timetable ? "Regenerate Timetable" : "Generate Timetable"}
                    </Button>
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-stretch">
                        {timetable && (
                             <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Columns className="h-5 w-5 text-muted-foreground"/>
                                <Select
                                    value={selectedClassView}
                                    onValueChange={setSelectedClassView}
                                >
                                    <SelectTrigger className="w-full sm:w-[200px]">
                                    <SelectValue placeholder="View timetable for..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                    {availableClasses.map((classLevel) => (
                                        <SelectItem key={classLevel} value={classLevel}>
                                        {classLevel === "all" ? "All Classes" : classLevel}
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
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
                    </div>
                </CardContent>
            </Card>
        </section>


        <section id="timetable-display">
          <TimetableGrid 
            timetable={timetableForDisplay} 
            staffList={staffMembers} 
            onEditSlotRequest={handleEditSlotRequest}
            selectedStaffIdForFilter={selectedStaffIdForFilter}
            selectedClassView={selectedClassView}
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

