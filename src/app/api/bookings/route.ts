import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { bookings, classSchedules } from "@/db/schema";
import { parseJson } from "@/lib/api";
import { requireSession, unauthorizedResponse } from "@/lib/auth";
import {
  countConfirmedBookings,
  findActiveBooking,
  resolveScheduleCapacity,
} from "@/lib/bookings";
import { userCanBookClasses } from "@/lib/membership";

const createBookingSchema = z.object({
  scheduleId: z.string().uuid(),
  memberId: z.string().uuid().optional(),
});

/**
 * Waitlist position is global per session, so it cannot be derived from a
 * member-filtered result set. This resolves the full queue for the sessions in
 * play and ranks them in one extra query.
 */
async function buildWaitlistPositions(scheduleIds: string[]) {
  const positions = new Map<string, number>();

  if (scheduleIds.length === 0) {
    return positions;
  }

  const queue = await getDb().query.bookings.findMany({
    where: and(
      inArray(bookings.scheduleId, scheduleIds),
      eq(bookings.bookingStatus, "waitlisted"),
    ),
    columns: { id: true, scheduleId: true },
    orderBy: [asc(bookings.createdAt), asc(bookings.id)],
  });

  const nextPosition = new Map<string, number>();

  for (const row of queue) {
    const position = (nextPosition.get(row.scheduleId) ?? 0) + 1;
    nextPosition.set(row.scheduleId, position);
    positions.set(row.id, position);
  }

  return positions;
}

export async function GET(request: Request) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get("scheduleId");
  const includeCancelled = searchParams.get("includeCancelled") === "true";

  const db = getDb();

  const filters = [eq(bookings.tenantId, session.tenantId)];

  if (scheduleId) {
    filters.push(eq(bookings.scheduleId, scheduleId));
  }

  // Members may only ever read their own bookings.
  if (session.role === "member") {
    filters.push(eq(bookings.memberId, session.userId));
  }

  if (!includeCancelled) {
    filters.push(ne(bookings.bookingStatus, "cancelled"));
  }

  const rows = await db.query.bookings.findMany({
    where: and(...filters),
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

  const waitlistedScheduleIds = [
    ...new Set(
      rows
        .filter((row) => row.bookingStatus === "waitlisted")
        .map((row) => row.scheduleId),
    ),
  ];

  const positions = await buildWaitlistPositions(waitlistedScheduleIds);

  return Response.json({
    bookings: rows.map((row) => ({
      ...row,
      waitlistPosition: positions.get(row.id) ?? null,
    })),
  });
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

  const existing = await findActiveBooking(schedule.id, memberId);

  if (existing) {
    return Response.json(
      {
        error:
          existing.bookingStatus === "waitlisted"
            ? "Already on the waitlist"
            : "Already booked",
      },
      { status: 409 },
    );
  }

  const capacity = resolveScheduleCapacity(schedule);
  const confirmedCount = await countConfirmedBookings(schedule.id);
  const bookingStatus = confirmedCount >= capacity ? "waitlisted" : "confirmed";

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
