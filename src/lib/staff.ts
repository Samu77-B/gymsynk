import type { SessionUser } from "@/lib/auth";

export type StaffRole = "trainer" | "admin";

export const staffRoles: StaffRole[] = ["trainer", "admin"];

export function isStaffRole(role: string) {
  return role === "owner" || role === "admin" || role === "trainer";
}

export function serializeStaffUser(user: {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  bio: string | null;
  photoUrl1: string | null;
  photoUrl2: string | null;
  photoUrl3: string | null;
  createdAt: Date | null;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    bio: user.bio,
    photoUrl1: user.photoUrl1,
    photoUrl2: user.photoUrl2,
    photoUrl3: user.photoUrl3,
    createdAt: user.createdAt,
  };
}

export function canManageTargetStaff(
  actorRole: SessionUser["role"],
  targetRole: string,
) {
  if (actorRole === "owner") {
    return targetRole === "trainer" || targetRole === "admin";
  }

  if (actorRole === "admin") {
    return targetRole === "trainer";
  }

  return false;
}

export function assignableStaffRoles(actorRole: SessionUser["role"]): StaffRole[] {
  if (actorRole === "owner") {
    return ["trainer", "admin"];
  }

  if (actorRole === "admin") {
    return ["trainer"];
  }

  return [];
}
