import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { staffShifts, users } from "@/db/schema";
import { parseJson } from "@/lib/api";
import {
  canManageStaff,
  requireSession,
  unauthorizedResponse,
} from "@/lib/auth";

const shiftSchema = z.object({
  staffId: z.string().uuid(),
  shiftStart: z.string().datetime(),
  shiftEnd: z.string().datetime(),
  roleAssigned: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const db = getDb();

  const shifts = await db
    .select({
      id: staffShifts.id,
      shiftStart: staffShifts.shiftStart,
      shiftEnd: staffShifts.shiftEnd,
      roleAssigned: staffShifts.roleAssigned,
      notes: staffShifts.notes,
      staffId: users.id,
      staffName: users.fullName,
      staffRole: users.role,
    })
    .from(staffShifts)
    .innerJoin(users, eq(staffShifts.staffId, users.id))
    .where(eq(staffShifts.tenantId, session.tenantId))
    .orderBy(asc(staffShifts.shiftStart));

  return Response.json({ shifts });
}

export async function POST(request: Request) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageStaff(session.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = parseJson(shiftSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const db = getDb();
  const staff = await db.query.users.findFirst({
    where: and(
      eq(users.id, parsed.data.staffId),
      eq(users.tenantId, session.tenantId),
    ),
  });

  if (!staff) {
    return Response.json({ error: "Staff member not found" }, { status: 404 });
  }

  const [shift] = await db
    .insert(staffShifts)
    .values({
      tenantId: session.tenantId,
      staffId: parsed.data.staffId,
      shiftStart: new Date(parsed.data.shiftStart),
      shiftEnd: new Date(parsed.data.shiftEnd),
      roleAssigned: parsed.data.roleAssigned ?? null,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  return Response.json({ shift }, { status: 201 });
}
