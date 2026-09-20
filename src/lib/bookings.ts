import { and, asc, count, eq, lt, ne, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { bookings } from "@/db/schema";

export type ScheduleCapacitySource = {
  capacityOverride: number | null;
  class: { capacity: number };
};

/**
 * A session can override the capacity set on its class type, so a one-off
 * Saturday Hyrox can run smaller than the weekday sessions.
 */
export function resolveScheduleCapacity(schedule: ScheduleCapacitySource) {
  return schedule.capacityOverride ?? schedule.class.capacity;
}

export async function countConfirmedBookings(scheduleId: string) {
  const db = getDb();

  const [row] = await db
    .select({ value: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.scheduleId, scheduleId),
        eq(bookings.bookingStatus, "confirmed"),
      ),
    );

  return Number(row?.value ?? 0);
}

/**
 * Finds a member's live booking for a session. Cancelled rows are ignored so a
 * member can rebook after cancelling, which is also what the partial unique
 * index `bookings_schedule_member_active_idx` enforces at the database level.
 */
export async function findActiveBooking(scheduleId: string, memberId: string) {
  const db = getDb();

  return db.query.bookings.findFirst({
    where: and(
      eq(bookings.scheduleId, scheduleId),
      eq(bookings.memberId, memberId),
      ne(bookings.bookingStatus, "cancelled"),
    ),
  });
}

/**
 * 1-based place in the queue, ordered by when the member joined it.
 */
export async function getWaitlistPosition(booking: {
  id: string;
  scheduleId: string;
  createdAt: Date | null;
}) {
  const db = getDb();
  const joinedAt = booking.createdAt ?? new Date(0);

  const [row] = await db
    .select({ value: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.scheduleId, booking.scheduleId),
        eq(bookings.bookingStatus, "waitlisted"),
        or(
          lt(bookings.createdAt, joinedAt),
          and(eq(bookings.createdAt, joinedAt), lt(bookings.id, booking.id)),
        ),
      ),
    );

  return Number(row?.value ?? 0) + 1;
}

export async function listWaitlist(scheduleId: string) {
  const db = getDb();

  return db.query.bookings.findMany({
    where: and(
      eq(bookings.scheduleId, scheduleId),
      eq(bookings.bookingStatus, "waitlisted"),
    ),
    with: { member: true },
    orderBy: [asc(bookings.createdAt), asc(bookings.id)],
  });
}

/**
 * Moves the longest-waiting member into the freed spot.
 *
 * The Neon HTTP driver cannot hold an interactive transaction open, so this
 * deliberately runs as a single UPDATE: the row to promote and the re-check
 * that the class is still under capacity are both subqueries, which keeps two
 * concurrent cancellations from over-filling the session. Returns null when the
 * queue is empty or the class is already full.
 */
export async function promoteNextFromWaitlist(
  scheduleId: string,
  capacity: number,
) {
  const db = getDb();

  const [promoted] = await db
    .update(bookings)
    .set({ bookingStatus: "confirmed", promotedAt: new Date() })
    .where(
      and(
        eq(
          bookings.id,
          sql`(
            SELECT w."id"
            FROM "bookings" w
            WHERE w."schedule_id" = ${scheduleId}
              AND w."booking_status" = 'waitlisted'
            ORDER BY w."created_at" ASC, w."id" ASC
            LIMIT 1
          )`,
        ),
        sql`(
          SELECT count(*)
          FROM "bookings" c
          WHERE c."schedule_id" = ${scheduleId}
            AND c."booking_status" = 'confirmed'
        ) < ${capacity}`,
      ),
    )
    .returning();

  return promoted ?? null;
}

/**
 * Promotes waitlisted members until the session is full again. Used when
 * capacity is raised after people have already queued up.
 */
export async function fillOpenSpotsFromWaitlist(
  scheduleId: string,
  capacity: number,
) {
  const promoted: Awaited<ReturnType<typeof promoteNextFromWaitlist>>[] = [];

  // Bounded by capacity so a promotion that keeps succeeding can never spin.
  for (let attempt = 0; attempt < capacity; attempt += 1) {
    const next = await promoteNextFromWaitlist(scheduleId, capacity);

    if (!next) {
      break;
    }

    promoted.push(next);
  }

  return promoted;
}
