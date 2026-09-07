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
  const activeOnly = searchParams.get("active") === "true";

  const db = getDb();

  const conditions = [eq(users.tenantId, session.tenantId)];

  if (role) {
    conditions.push(
      inArray(
        users.role,
        role.split(",") as Array<typeof users.$inferSelect.role>,
      ),
    );
  }

  if (activeOnly) {
    conditions.push(eq(users.isActive, true));
  }

  const userList = await db.query.users.findMany({
    where: and(...conditions),
  });

  return Response.json({ users: userList });
}
