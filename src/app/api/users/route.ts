import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { requireSession, unauthorizedResponse } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");

  const db = getDb();

  const whereClause = role
    ? and(
        eq(users.tenantId, session.tenantId),
        inArray(users.role, role.split(",") as Array<typeof users.$inferSelect.role>),
      )
    : eq(users.tenantId, session.tenantId);

  const userList = await db.query.users.findMany({
    where: whereClause,
  });

  return Response.json({ users: userList });
}
