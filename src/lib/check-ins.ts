import { and, count, desc, eq, gte } from "drizzle-orm";
import { startOfDay } from "date-fns";

import { getDb } from "@/db";
import { memberCheckIns } from "@/db/schema";

export async function recordCheckIn(options: {
  tenantId: string;
  userId: string;
  allowed: boolean;
  denialReason?: string;
  scannedByUserId: string;
}) {
  const [row] = await getDb()
    .insert(memberCheckIns)
    .values({
      tenantId: options.tenantId,
      userId: options.userId,
      result: options.allowed ? "granted" : "denied",
      denialReason: options.allowed ? null : options.denialReason ?? "Access denied",
      method: "qr",
      scannedByUserId: options.scannedByUserId,
    })
    .returning();

  return row;
}

export async function countCheckInsToday(tenantId: string) {
  const since = startOfDay(new Date());

  const [row] = await getDb()
    .select({ total: count() })
    .from(memberCheckIns)
    .where(
      and(
        eq(memberCheckIns.tenantId, tenantId),
        eq(memberCheckIns.result, "granted"),
        gte(memberCheckIns.createdAt, since),
      ),
    );

  return row?.total ?? 0;
}

export async function listRecentCheckIns(tenantId: string, limit = 25) {
  return getDb().query.memberCheckIns.findMany({
    where: eq(memberCheckIns.tenantId, tenantId),
    orderBy: [desc(memberCheckIns.createdAt)],
    limit,
    with: {
      user: {
        columns: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
      scannedBy: {
        columns: {
          id: true,
          fullName: true,
        },
      },
    },
  });
}
