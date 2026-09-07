import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { classSchedules, classes, users } from "@/db/schema";
import { jsonError, parseJson } from "@/lib/api";
import {
  canManageSchedules,
  forbiddenResponse,
  requireSession,
  unauthorizedResponse,
} from "@/lib/auth";

const updateScheduleSchema = z.object({
  classId: z.string().uuid().optional(),
  trainerId: z.string().uuid().optional().nullable(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function loadSchedule(id: string, tenantId: string) {
  const db = getDb();

  return db.query.classSchedules.findFirst({
    where: and(eq(classSchedules.id, id), eq(classSchedules.tenantId, tenantId)),
    with: {
      class: true,
      trainer: true,
      bookings: true,
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageSchedules(session.role)) {
    return forbiddenResponse();
  }

  const { id } = await context.params;
  const schedule = await loadSchedule(id, session.tenantId);

  if (!schedule) {
    return jsonError("Schedule not found", 404);
  }

  const body = await request.json();
  const parsed = parseJson(updateScheduleSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const db = getDb();
  const nextClassId = parsed.data.classId ?? schedule.classId;
  const nextTrainerId =
    parsed.data.trainerId !== undefined
      ? parsed.data.trainerId
      : schedule.trainerId;
  const nextStart = parsed.data.startTime
    ? new Date(parsed.data.startTime)
    : schedule.startTime;
  const nextEnd = parsed.data.endTime
    ? new Date(parsed.data.endTime)
    : schedule.endTime;

  if (parsed.data.classId) {
    const classRecord = await db.query.classes.findFirst({
      where: and(
        eq(classes.id, parsed.data.classId),
        eq(classes.tenantId, session.tenantId),
      ),
    });

    if (!classRecord) {
      return jsonError("Class not found", 404);
    }
  }

  if (nextTrainerId) {
    const trainer = await db.query.users.findFirst({
      where: and(
        eq(users.id, nextTrainerId),
        eq(users.tenantId, session.tenantId),
      ),
    });

    if (!trainer) {
      return jsonError("Trainer not found", 404);
    }
  }

  if (
    Number.isNaN(nextStart.getTime()) ||
    Number.isNaN(nextEnd.getTime()) ||
    nextEnd <= nextStart
  ) {
    return jsonError("End time must be after start time", 400);
  }

  const [updated] = await db
    .update(classSchedules)
    .set(
      Object.fromEntries(
        Object.entries({
          classId: nextClassId,
          trainerId: nextTrainerId,
          startTime: nextStart,
          endTime: nextEnd,
          status: parsed.data.status,
        }).filter(([, value]) => value !== undefined),
      ),
    )
    .where(eq(classSchedules.id, schedule.id))
    .returning();

  return Response.json({ schedule: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageSchedules(session.role)) {
    return forbiddenResponse();
  }

  const { id } = await context.params;
  const schedule = await loadSchedule(id, session.tenantId);

  if (!schedule) {
    return jsonError("Schedule not found", 404);
  }

  const db = getDb();
  await db.delete(classSchedules).where(eq(classSchedules.id, schedule.id));

  return Response.json({ ok: true });
}
