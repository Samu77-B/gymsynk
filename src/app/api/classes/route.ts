import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { classes } from "@/db/schema";
import { requireSession, unauthorizedResponse } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const db = getDb();
  const classList = await db.query.classes.findMany({
    where: eq(classes.tenantId, session.tenantId),
  });

  return Response.json({ classes: classList });
}
