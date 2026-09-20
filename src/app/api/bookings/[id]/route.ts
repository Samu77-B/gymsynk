import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { bookings } from "@/db/schema";
import { jsonError } from "@/lib/api";
import { forbiddenResponse, requireSession, unauthorizedResponse } from "@/lib/auth";
import { promoteNextFromWaitlist, resolveScheduleCapacity } from "@/lib/bookings";
import {
  applyPackCreditToBooking,
  refundCreditForBooking,
} from "@/lib/packs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const db = getDb();

  const booking = await db.query.bookings.findFirst({
    where: and(eq(bookings.id, id), eq(bookings.tenantId, session.tenantId)),
    with: {
      schedule: {
        with: { class: true },
      },
    },
  });

  if (!booking) {
    return jsonError("Booking not found", 404);
  }

  if (session.role === "member" && booking.memberId !== session.userId) {
    return forbiddenResponse();
  }

  if (booking.bookingStatus === "cancelled") {
    return jsonError("Booking already cancelled", 409);
  }

  const [cancelled] = await db
    .update(bookings)
    .set({ bookingStatus: "cancelled", cancelledAt: new Date() })
    .where(eq(bookings.id, booking.id))
    .returning();

  const refundedPack = await refundCreditForBooking(booking);

  // Only a confirmed booking frees a spot; dropping off the waitlist just
  // shortens the queue for everyone behind them.
  const promoted =
    booking.bookingStatus === "confirmed"
      ? await promoteNextFromWaitlist(
          booking.scheduleId,
          resolveScheduleCapacity(booking.schedule),
        )
      : null;

  // The promoted member is now confirmed, so their own pack settles the spot.
  if (promoted) {
    await applyPackCreditToBooking({
      tenantId: promoted.tenantId,
      userId: promoted.memberId,
      bookingId: promoted.id,
      trainingTierId: booking.schedule.class.trainingTierId,
      actorUserId: session.userId,
    });
  }

  return Response.json({
    booking: cancelled,
    promoted,
    creditRefunded: refundedPack
      ? { packId: refundedPack.id, label: refundedPack.label }
      : null,
  });
}
