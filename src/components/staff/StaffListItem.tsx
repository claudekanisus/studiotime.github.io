"use client";

import type { StaffMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, User, BookOpen } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface StaffListItemProps {
  staffMember: StaffMember;
  onEdit: (staffMember: StaffMember) => void;
  onDelete: (staffId: string) => void;
}

export function StaffListItem({ staffMember, onEdit, onDelete }: StaffListItemProps) {
  return (
    <li className="flex items-center justify-between p-3 bg-card hover:bg-secondary/80 rounded-md shadow transition-colors">
      <div className="flex items-center gap-3">
        <User className="h-5 w-5 text-primary shrink-0" />
        <div className="flex flex-col">
            <span className="font-body font-semibold">{staffMember.name}</span>
            {staffMember.subject && (
                 <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <BookOpen className="h-3 w-3"/> {staffMember.subject}
                 </span>
            )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" onClick={() => onEdit(staffMember)} aria-label="Edit staff member">
          <Edit className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Delete staff member">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the staff member "{staffMember.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(staffMember.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}
