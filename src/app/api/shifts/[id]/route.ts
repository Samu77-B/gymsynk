import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { staffShifts, users } from "@/db/schema";
import { parseJson } from "@/lib/api";
import {
  canManageStaff,
  requireSession,
  unauthorizedResponse,
} from "@/lib/auth";

const updateShiftSchema = z.object({
  staffId: z.string().uuid().optional(),
  shiftStart: z.string().datetime().optional(),
  shiftEnd: z.string().datetime().optional(),
  roleAssigned: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageStaff(session.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const parsed = parseJson(updateShiftSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const db = getDb();

  const existing = await db.query.staffShifts.findFirst({
    where: and(eq(staffShifts.id, id), eq(staffShifts.tenantId, session.tenantId)),
  });

  if (!existing) {
    return Response.json({ error: "Shift not found" }, { status: 404 });
  }

  if (parsed.data.staffId) {
    const staff = await db.query.users.findFirst({
      where: and(
        eq(users.id, parsed.data.staffId),
        eq(users.tenantId, session.tenantId),
      ),
    });

    if (!staff) {
      return Response.json({ error: "Staff member not found" }, { status: 404 });
    }
  }

  const [shift] = await db
    .update(staffShifts)
    .set({
      staffId: parsed.data.staffId ?? existing.staffId,
      shiftStart: parsed.data.shiftStart
        ? new Date(parsed.data.shiftStart)
        : existing.shiftStart,
      shiftEnd: parsed.data.shiftEnd
        ? new Date(parsed.data.shiftEnd)
        : existing.shiftEnd,
      roleAssigned:
        parsed.data.roleAssigned !== undefined
          ? parsed.data.roleAssigned
          : existing.roleAssigned,
      notes:
        parsed.data.notes !== undefined ? parsed.data.notes : existing.notes,
    })
    .where(eq(staffShifts.id, id))
    .returning();

  return Response.json({ shift });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageStaff(session.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const db = getDb();

  const [deleted] = await db
    .delete(staffShifts)
    .where(
      and(eq(staffShifts.id, id), eq(staffShifts.tenantId, session.tenantId)),
    )
    .returning();

  if (!deleted) {
    return Response.json({ error: "Shift not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
