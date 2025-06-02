"use client";

import type { StaffMember } from "@/lib/types";
import { StaffListItem } from "./StaffListItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface StaffListProps {
  staffMembers: StaffMember[];
  onEdit: (staffMember: StaffMember) => void;
  onDelete: (staffId: string) => void;
}

export function StaffList({ staffMembers, onEdit, onDelete }: StaffListProps) {
  if (staffMembers.length === 0) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <Users className="h-5 w-5" />
            Staff Members
            </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground font-body">No staff members added yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          <Users className="h-5 w-5" />
          Staff Members ({staffMembers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {staffMembers.map((staff) => (
            <StaffListItem
              key={staff.id}
              staffMember={staff}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
