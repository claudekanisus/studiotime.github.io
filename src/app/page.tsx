
"use client";

import { useState, useEffect, useMemo } from "react";
import type { StaffMember, TimetableData, TimetableSlotInfo } from "@/lib/types";
import { StaffForm } from "@/components/staff/StaffForm";
import { StaffList } from "@/components/staff/StaffList";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { EditSlotDialog } from "@/components/timetable/EditSlotDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { suggestAllTimetables, type SuggestAllTimetablesInput, type SuggestAllTimetablesOutput } from "@/ai/flows/suggest-timetable";
import { AI_PERIODS_PER_DAY, AI_DAYS_PER_WEEK, AI_BREAK_COUNT } from "@/lib/constants";
import { AppLogo } from "@/components/icons";
import { Separator } from "@/components/ui/separator";
import { Loader2, Bot, Users, Filter, Columns, School } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { getStaffMemberByIdOrIndex } from "@/lib/utils";

export default function HomePage() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [timetables, setTimetables] = useState<Record<string, TimetableData> | null>(null);
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
        assignedClass: Array.isArray(staff.assignedClass) ? staff.assignedClass : (staff.assignedClass ? [staff.assignedClass] : [])
      }));
      setStaffMembers(staffWithDetailsEnsured as StaffMember[]);
    }
    const storedTimetables = localStorage.getItem("timetableGeniusTimetables");
    if (storedTimetables) {
      setTimetables(JSON.parse(storedTimetables));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("timetableGeniusStaff", JSON.stringify(staffMembers));
  }, [staffMembers]);

  useEffect(() => {
    if (timetables) {
      localStorage.setItem("timetableGeniusTimetables", JSON.stringify(timetables));
    }
  }, [timetables]);


  const handleStaffSubmit = (data: { name: string; subject: string; assignedClass: string[] }) => {
    if (editingStaff) {
      setStaffMembers(
        staffMembers.map((s) =>
          s.id === editingStaff.id ? { ...s, name: data.name, subject: data.subject, assignedClass: data.assignedClass.sort() } : s
        )
      );
      toast({ title: "Staff Updated", description: `${data.name} (${data.subject}, ${data.assignedClass.join(', ')}) has been updated.` });
      setEditingStaff(null);
    } else {
      const newStaff: StaffMember = {
        id: crypto.randomUUID(),
        name: data.name,
        subject: data.subject,
        assignedClass: data.assignedClass.sort()
      };
      setStaffMembers([...staffMembers, newStaff]);
      toast({ title: "Staff Added", description: `${data.name} (${data.subject}, ${data.assignedClass.join(', ')}) has been added.` });
    }
  };

  const handleEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
  };

  const handleDeleteStaff = (staffId: string) => {
    const deletedStaffMember = staffMembers.find(s => s.id === staffId);
    setStaffMembers(staffMembers.filter((s) => s.id !== staffId));
    toast({ title: "Staff Deleted", description: `Staff member has been deleted.` });

    if (editingStaff?.id === staffId) {
      setEditingStaff(null);
    }
    if (selectedStaffIdForFilter === staffId) {
      setSelectedStaffIdForFilter(null);
    }
    
    // If the deleted staff member was the last one assigned to the currently selected class view,
    // and that view is not "all", reset the view to "all".
    if (deletedStaffMember && selectedClassView !== "all") {
        const remainingStaffForClass = staffMembers
            .filter(s => s.id !== staffId) // Exclude the one being deleted
            .some(s => s.assignedClass.includes(selectedClassView));
        if (!remainingStaffForClass) {
            setSelectedClassView("all");
        }
    }
  };

  const classesWithStaff = useMemo(() => {
    const uniqueClasses = Array.from(
      new Set(staffMembers.flatMap(s => s.assignedClass || []).filter(Boolean))
    );
    uniqueClasses.sort((a, b) => {
        const aStr = String(a);
        const bStr = String(b);
        const aLKG = aStr === "LKG";
        const bLKG = bStr === "LKG";
        const aUKG = aStr === "UKG";
        const bUKG = bStr === "UKG";

        if (aLKG && !bLKG) return -1;
        if (!aLKG && bLKG) return 1;
        if (aUKG && !bUKG && !bLKG) return -1;
        if (!aUKG && bUKG && !aLKG) return 1;

        if (aLKG && bUKG) return -1;
        if (aUKG && bLKG) return 1;
        
        const aNum = parseInt(aStr.replace("Class ", ""), 10);
        const bNum = parseInt(bStr.replace("Class ", ""), 10);

        if (!isNaN(aNum) && isNaN(bNum)) return 1;
        if (isNaN(aNum) && !isNaN(bNum)) return -1;

        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        return aStr.localeCompare(bStr);
    });
    return uniqueClasses;
  }, [staffMembers]);

  const availableClassesForSelect = useMemo(() => ["all", ...classesWithStaff], [classesWithStaff]);


  const handleGenerateAllTimetables = async () => {
    if (staffMembers.length === 0) {
      toast({
        title: "Cannot Generate Timetables",
        description: "Please add at least one staff member.",
        variant: "destructive",
      });
      return;
    }
    if (classesWithStaff.length === 0) {
        toast({
            title: "No Classes Defined",
            description: "No staff members are assigned to any classes. Assign staff to classes first.",
            variant: "destructive",
        });
        return;
    }

    setIsLoading(true);
    try {
      const staffDetailsForAI = staffMembers.map((staff, index) => ({
        id: index.toString(), 
        assignedClasses: staff.assignedClass,
      }));

      const input: SuggestAllTimetablesInput = {
        staffDetails: staffDetailsForAI,
        classNames: classesWithStaff, // Pass all classes that have staff
        periodsPerDay: AI_PERIODS_PER_DAY,
        daysPerWeek: AI_DAYS_PER_WEEK,
        breakCount: AI_BREAK_COUNT,
      };
      const result: SuggestAllTimetablesOutput = await suggestAllTimetables(input);

      if (result.timetablesByClass && Object.keys(result.timetablesByClass).length > 0) {
        setTimetables(result.timetablesByClass);
        toast({
            title: "All Timetables Generated",
            description: `New timetables have been suggested by AI for all relevant classes.`,
        });
      } else {
        toast({
            title: "Generation Issue",
            description: "AI did not return timetables. It's possible no valid schedules could be formed.",
            variant: "default"
        });
         // Set timetables to an empty object or handle as per desired UX
        setTimetables({});
      }

    } catch (error) {
      console.error(`Error generating all timetables:`, error);
      let description = "Could not generate timetables. Check console for errors.";
      if (error instanceof Error && (error.message.includes('503') || error.message.toLowerCase().includes('service unavailable') || error.message.toLowerCase().includes('model is overloaded'))) {
        description = "The AI model is currently overloaded or unavailable. Please try again in a few moments.";
      }
      toast({
        title: "Generation Failed",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSlotRequest = (slotInfo: Omit<TimetableSlotInfo, 'className'>) => {
    if (selectedClassView === "all") {
        toast({ title: "Error", description: "Cannot edit slot when 'All Classes' view is selected.", variant: "destructive"});
        return;
    }
    setEditingSlotInfo({...slotInfo, className: selectedClassView });
    setIsEditDialogOpen(true);
  };

  const handleSaveSlot = (dayIndex: number, aiPeriodIndex: number, activitySlotIndex: number, newStaffId: string | null) => {
    if (!editingSlotInfo || !timetables || !timetables[editingSlotInfo.className]) return;

    const className = editingSlotInfo.className;
    const currentClassTimetable = timetables[className];

    const newClassTimetable = currentClassTimetable.map(daySchedule =>
      daySchedule.map(periodActivities => [...periodActivities])
    );

    if (!newClassTimetable[dayIndex]) newClassTimetable[dayIndex] = [];
    if (!newClassTimetable[dayIndex][aiPeriodIndex]) newClassTimetable[dayIndex][aiPeriodIndex] = [];

    let staffIdForTimetable: string | null = null;
    if (newStaffId) {
      const staffIndex = staffMembers.findIndex(s => s.id === newStaffId);
      if (staffIndex !== -1) {
        staffIdForTimetable = staffIndex.toString();
      } else {
        console.warn("Could not find AI index for selected staff UUID:", newStaffId);
        toast({ title: "Error Updating Slot", description: "Could not map selected staff to AI index.", variant: "destructive" });
        return;
      }
    }

    newClassTimetable[dayIndex][aiPeriodIndex][activitySlotIndex] = staffIdForTimetable ? { staffId: staffIdForTimetable } : null;

    setTimetables(prevTimetables => ({
      ...(prevTimetables || {}),
      [className]: newClassTimetable
    }));
    toast({ title: "Slot Updated", description: `Timetable slot for ${className} has been manually updated.` });
  };


  const timetableForDisplay: TimetableData | null = useMemo(() => {
    if (!timetables || selectedClassView === "all" || !timetables[selectedClassView]) {
      return null;
    }
    return timetables[selectedClassView];
  }, [timetables, selectedClassView]);


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
                    <Button 
                        onClick={handleGenerateAllTimetables} 
                        disabled={isLoading || staffMembers.length === 0 || classesWithStaff.length === 0}
                        size="lg" 
                        className="w-full sm:w-auto"
                        title={staffMembers.length === 0 || classesWithStaff.length === 0 ? "Add staff and assign them to classes first" : "Generate timetables for all classes"}
                    >
                        {isLoading ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                        <School className="mr-2 h-5 w-5" /> // Using School icon
                        )}
                        {isLoading ? "Generating All..." : "Generate All Timetables"}
                    </Button>
                    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-stretch">
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
                                {availableClassesForSelect.map((classLevel) => (
                                    <SelectItem key={classLevel} value={classLevel}>
                                    {classLevel === "all" ? "All Classes (Select a class)" : classLevel}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {staffMembers.length > 0 && timetableForDisplay && ( 
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
                                    {staffMembers
                                        .filter(staff => selectedClassView === "all" || (timetableForDisplay && staff.assignedClass.includes(selectedClassView))) 
                                        .map((staff) => (
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

    