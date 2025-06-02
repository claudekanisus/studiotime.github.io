import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { StaffMember } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Retrieves a staff member from a list by their ID (UUID) or index (string from AI).
 * @param staffId The ID (string UUID) or index (string "0", "1", etc.) of the staff member.
 * @param staffList The list of staff members to search within.
 * @returns The found StaffMember object, or undefined if not found.
 */
export function getStaffMemberByIdOrIndex(staffId: string | null | undefined, staffList: StaffMember[]): StaffMember | undefined {
  if (!staffId) return undefined;

  // Check if the staffId is a UUID (typical format for crypto.randomUUID())
  const staffByUuid = staffList.find(s => s.id === staffId);
  if (staffByUuid) {
    return staffByUuid;
  }

  // Check if the staffId is an index (string like "0", "1")
  const staffIndex = parseInt(staffId, 10);
  if (!isNaN(staffIndex) && staffIndex >= 0 && staffIndex < staffList.length) {
    return staffList[staffIndex];
  }

  return undefined;
}
