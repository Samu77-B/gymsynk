import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { users } from "@/db/schema";

function randomMemberNumber() {
  return String(Math.floor(10_000_000 + Math.random() * 90_000_000));
}

function isUniqueViolation(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    if ((error as { code?: string }).code === "23505") {
      return true;
    }
  }

  return error instanceof Error && error.message.includes("member_number");
}

/** Eight digits, unique inside one gym. Created once and then kept. */
export async function ensureMemberNumber(tenantId: string, userId: string) {
  const db = getDb();

  const existing = await db.query.users.findFirst({
    where: and(eq(users.id, userId), eq(users.tenantId, tenantId)),
    columns: { memberNumber: true },
  });

  if (!existing) {
    throw new Error("Member not found.");
  }

  if (existing.memberNumber) {
    return existing.memberNumber;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const [updated] = await db
        .update(users)
        .set({ memberNumber: randomMemberNumber() })
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
        .returning({ memberNumber: users.memberNumber });

      if (updated?.memberNumber) {
        return updated.memberNumber;
      }
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
    }
  }

  throw new Error("Could not assign a member number.");
}

export function normalizeMemberNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return /^\d{8}$/.test(digits) ? digits : null;
}

export function formatMemberNumber(value: string) {
  return `${value.slice(0, 4)} ${value.slice(4)}`;
}
