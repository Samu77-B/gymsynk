import { and, count, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { bookings, classSchedules } from "@/db/schema";
import { parseJson } from "@/lib/api";
import { requireSession, unauthorizedResponse } from "@/lib/auth";
import { userCanBookClasses } from "@/lib/membership";

const createBookingSchema = z.object({
  scheduleId: z.string().uuid(),
  memberId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get("scheduleId");

  const db = getDb();

  const whereClause = scheduleId
    ? and(
        eq(bookings.tenantId, session.tenantId),
        eq(bookings.scheduleId, scheduleId),
      )
    : eq(bookings.tenantId, session.tenantId);

  const rows = await db.query.bookings.findMany({
    where: whereClause,
    with: {
      member: true,
      schedule: {
        with: {
          class: true,
        },
      },
    },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  return Response.json({ bookings: rows });
}

export async function POST(request: Request) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const parsed = parseJson(createBookingSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const memberId =
    session.role === "member"
      ? session.userId
      : parsed.data.memberId ?? session.userId;

  if (session.role === "member") {
    const access = await userCanBookClasses(
      session.tenantId,
      session.userId,
      session.role,
    );

    if (!access.allowed) {
      return Response.json({ error: access.reason }, { status: 403 });
    }
  }

  const db = getDb();

  const schedule = await db.query.classSchedules.findFirst({
    where: and(
      eq(classSchedules.id, parsed.data.scheduleId),
      eq(classSchedules.tenantId, session.tenantId),
    ),
    with: {
      class: true,
    },
  });

  if (!schedule || schedule.status !== "scheduled") {
    return Response.json({ error: "Schedule not available" }, { status: 404 });
  }

  const existing = await db.query.bookings.findFirst({
    where: and(
      eq(bookings.scheduleId, schedule.id),
      eq(bookings.memberId, memberId),
      eq(bookings.bookingStatus, "confirmed"),
    ),
  });

  if (existing) {
    return Response.json({ error: "Already booked" }, { status: 409 });
  }

  const [{ confirmedCount }] = await db
    .select({ confirmedCount: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.scheduleId, schedule.id),
        eq(bookings.bookingStatus, "confirmed"),
      ),
    );

  const capacity = schedule.class.capacity;
  const bookingStatus =
    Number(confirmedCount) >= capacity ? "waitlisted" : "confirmed";

  const [booking] = await db
    .insert(bookings)
    .values({
      tenantId: session.tenantId,
      scheduleId: schedule.id,
      memberId,
      bookingStatus,
      paymentStatus: "pending",
    })
    .returning();

  return Response.json({ booking }, { status: 201 });
}
