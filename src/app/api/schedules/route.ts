import { and, asc, eq, gte, lte } from "drizzle-orm";
import { addDays, endOfDay, parseISO, startOfDay } from "date-fns";
import { z } from "zod";

import { getDb } from "@/db";
import { classSchedules, classes, users } from "@/db/schema";
import { parseJson } from "@/lib/api";
import {
  canManageSchedules,
  requireSession,
  unauthorizedResponse,
} from "@/lib/auth";

const createScheduleSchema = z.object({
  classId: z.string().uuid(),
  trainerId: z.string().uuid().optional().nullable(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
});

export async function GET(request: Request) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  const rangeStart = startParam
    ? startOfDay(parseISO(startParam))
    : startOfDay(new Date());
  const rangeEnd = endParam
    ? endOfDay(parseISO(endParam))
    : endOfDay(addDays(new Date(), 7));

  const db = getDb();

  const rows = await db.query.classSchedules.findMany({
    where: and(
      eq(classSchedules.tenantId, session.tenantId),
      gte(classSchedules.startTime, rangeStart),
      lte(classSchedules.startTime, rangeEnd),
    ),
    with: {
      class: true,
      trainer: true,
      bookings: true,
    },
    orderBy: [asc(classSchedules.startTime)],
  });

  const schedules = rows.map((row) => {
    const confirmedCount = row.bookings.filter(
      (booking) => booking.bookingStatus === "confirmed",
    ).length;

    return {
      id: row.id,
      startTime: row.startTime,
      endTime: row.endTime,
      status: row.status,
      classId: row.class.id,
      classTitle: row.class.title,
      capacity: row.class.capacity,
      price: row.class.price,
      trainerId: row.trainer?.id ?? null,
      trainerName: row.trainer?.fullName ?? "Unassigned",
      confirmedCount,
      fillRate:
        row.class.capacity > 0
          ? Math.round((confirmedCount / row.class.capacity) * 100)
          : 0,
      spotsLeft: Math.max(row.class.capacity - confirmedCount, 0),
    };
  });

  return Response.json({ schedules, rangeStart, rangeEnd });
}

export async function POST(request: Request) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageSchedules(session.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = parseJson(createScheduleSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const { classId, trainerId, startTime, endTime, status } = parsed.data;
  const db = getDb();

  const classRecord = await db.query.classes.findFirst({
    where: and(eq(classes.id, classId), eq(classes.tenantId, session.tenantId)),
  });

  if (!classRecord) {
    return Response.json({ error: "Class not found" }, { status: 404 });
  }

  if (trainerId) {
    const trainer = await db.query.users.findFirst({
      where: and(eq(users.id, trainerId), eq(users.tenantId, session.tenantId)),
    });

    if (!trainer) {
      return Response.json({ error: "Trainer not found" }, { status: 404 });
    }
  }

  const [schedule] = await db
    .insert(classSchedules)
    .values({
      tenantId: session.tenantId,
      classId,
      trainerId: trainerId ?? null,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: status ?? "scheduled",
    })
    .returning();

  return Response.json({ schedule }, { status: 201 });
}
