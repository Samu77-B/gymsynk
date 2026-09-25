import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getActiveMembershipForUser } from "@/lib/membership";

const staffRoles = new Set(["owner", "admin", "trainer"]);

export type GymAccessDecision =
  | { allowed: true; kind: "staff" | "membership" }
  | { allowed: false; reason: string };

export async function evaluateGymAccess(
  tenantId: string,
  userId: string,
): Promise<GymAccessDecision> {
  const user = await getDb().query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      tenantId: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || user.tenantId !== tenantId) {
    return { allowed: false, reason: "Member not found for this gym." };
  }

  if (!user.isActive) {
    return { allowed: false, reason: "This account is inactive." };
  }

  if (staffRoles.has(user.role)) {
    return { allowed: true, kind: "staff" };
  }

  const membership = await getActiveMembershipForUser(tenantId, userId);

  if (!membership) {
    return {
      allowed: false,
      reason: "No active membership. Ask reception to sign you up.",
    };
  }

  if (membership.status === "trialing" || membership.status === "active") {
    return { allowed: true, kind: "membership" };
  }

  if (membership.status === "past_due") {
    return {
      allowed: false,
      reason: "Membership payment is overdue. Please update billing.",
    };
  }

  return {
    allowed: false,
    reason: "Membership is not active. Please renew to enter.",
  };
}

export function canScanDoorAccess(role: string) {
  return staffRoles.has(role);
}
