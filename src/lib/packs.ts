import { addMonths, isAfter } from "date-fns";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { bookings, memberPacks, packCredits } from "@/db/schema";

export type MemberPack = typeof memberPacks.$inferSelect;

export type PackBalance = {
  pack: MemberPack;
  /** Null when the pack is unlimited for the period. */
  remaining: number | null;
  used: number;
  unlimited: boolean;
};

/**
 * Packs refill each period instead of accumulating, so the period window is
 * advanced lazily whenever a pack is read. Doing it on read rather than on a
 * schedule means there is no cron job to miss and no drift if the app is idle.
 */
export async function rollPackPeriodForward(pack: MemberPack, now = new Date()) {
  if (pack.status !== "active" || !isAfter(now, pack.currentPeriodEnd)) {
    return pack;
  }

  let start = pack.currentPeriodStart;
  let end = pack.currentPeriodEnd;

  // Guarded so a pack left dormant for years cannot spin here.
  for (let step = 0; step < 240 && isAfter(now, end); step += 1) {
    start = end;
    end = addMonths(end, 1);
  }

  const [updated] = await getDb()
    .update(memberPacks)
    .set({
      currentPeriodStart: start,
      currentPeriodEnd: end,
      updatedAt: new Date(),
    })
    .where(eq(memberPacks.id, pack.id))
    .returning();

  return updated ?? pack;
}

async function sumDeltasByPack(packIds: string[], periodStarts: Date[]) {
  const totals = new Map<string, number>();

  if (packIds.length === 0) {
    return totals;
  }

  const rows = await getDb()
    .select({
      memberPackId: packCredits.memberPackId,
      total: sql<number>`coalesce(sum(${packCredits.delta}), 0)`,
    })
    .from(packCredits)
    .where(
      and(
        inArray(packCredits.memberPackId, packIds),
        inArray(packCredits.periodStart, periodStarts),
      ),
    )
    .groupBy(packCredits.memberPackId);

  for (const row of rows) {
    totals.set(row.memberPackId, Number(row.total));
  }

  return totals;
}

export async function describePacks(packs: MemberPack[]): Promise<PackBalance[]> {
  const rolled = await Promise.all(
    packs.map((pack) => rollPackPeriodForward(pack)),
  );

  const totals = await sumDeltasByPack(
    rolled.map((pack) => pack.id),
    rolled.map((pack) => pack.currentPeriodStart),
  );

  return rolled.map((pack) => {
    const net = totals.get(pack.id) ?? 0;
    const unlimited = pack.sessionsPerPeriod === null;

    return {
      pack,
      unlimited,
      used: Math.max(-net, 0),
      remaining: unlimited ? null : (pack.sessionsPerPeriod ?? 0) + net,
    };
  });
}

export async function listPacksForUser(tenantId: string, userId: string) {
  const packs = await getDb().query.memberPacks.findMany({
    where: and(
      eq(memberPacks.tenantId, tenantId),
      eq(memberPacks.userId, userId),
    ),
    with: { tier: true },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  const balances = await describePacks(packs);
  const tierByPackId = new Map(packs.map((pack) => [pack.id, pack.tier]));

  return balances.map((balance) => ({
    ...balance,
    tier: tierByPackId.get(balance.pack.id) ?? null,
  }));
}

export async function listPacksForTenant(tenantId: string) {
  const packs = await getDb().query.memberPacks.findMany({
    where: eq(memberPacks.tenantId, tenantId),
    with: { tier: true, user: true },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  const balances = await describePacks(packs);
  const detailById = new Map(packs.map((pack) => [pack.id, pack]));

  return balances.map((balance) => {
    const detail = detailById.get(balance.pack.id);

    return {
      ...balance,
      tier: detail?.tier ?? null,
      user: detail?.user ?? null,
    };
  });
}

export function serializePack(entry: {
  pack: MemberPack;
  remaining: number | null;
  used: number;
  unlimited: boolean;
  tier?: { id: string; name: string } | null;
  user?: { id: string; fullName: string; email: string } | null;
}) {
  return {
    id: entry.pack.id,
    label: entry.pack.label,
    status: entry.pack.status,
    source: entry.pack.source,
    sessionsPerPeriod: entry.pack.sessionsPerPeriod,
    price: entry.pack.price,
    unlimited: entry.unlimited,
    remaining: entry.remaining,
    used: entry.used,
    currentPeriodStart: entry.pack.currentPeriodStart,
    currentPeriodEnd: entry.pack.currentPeriodEnd,
    notes: entry.pack.notes,
    tier: entry.tier ? { id: entry.tier.id, name: entry.tier.name } : null,
    member: entry.user
      ? {
          id: entry.user.id,
          fullName: entry.user.fullName,
          email: entry.user.email,
        }
      : null,
  };
}

/**
 * Chooses which pack should pay for a class. A pack scoped to the class's tier
 * is preferred over a gym-wide pack, and a limited pack is spent before an
 * unlimited one so the member keeps the more flexible entitlement.
 */
export async function findPackToSpend(
  tenantId: string,
  userId: string,
  trainingTierId: string | null,
) {
  const tierMatch = trainingTierId
    ? or(eq(memberPacks.tierId, trainingTierId), isNull(memberPacks.tierId))
    : isNull(memberPacks.tierId);

  const candidates = await getDb().query.memberPacks.findMany({
    where: and(
      eq(memberPacks.tenantId, tenantId),
      eq(memberPacks.userId, userId),
      eq(memberPacks.status, "active"),
      tierMatch,
    ),
  });

  if (candidates.length === 0) {
    return null;
  }

  const spendable = (await describePacks(candidates)).filter(
    (balance) => balance.unlimited || (balance.remaining ?? 0) > 0,
  );

  if (spendable.length === 0) {
    return null;
  }

  spendable.sort((a, b) => {
    const aScoped = a.pack.tierId === trainingTierId && trainingTierId !== null;
    const bScoped = b.pack.tierId === trainingTierId && trainingTierId !== null;

    if (aScoped !== bScoped) {
      return aScoped ? -1 : 1;
    }

    if (a.unlimited !== b.unlimited) {
      return a.unlimited ? 1 : -1;
    }

    return a.pack.currentPeriodEnd.getTime() - b.pack.currentPeriodEnd.getTime();
  });

  return spendable[0];
}

/**
 * Spends one credit on a booking.
 *
 * The insert is conditional on the balance still being positive and is written
 * as a single statement, because the Neon HTTP driver cannot hold a
 * transaction open across a read and a write. The partial unique index on
 * (booking_id, reason) additionally makes a retry a no-op rather than a
 * double spend. Returns null when there was nothing to spend.
 */
export async function spendCreditForBooking(options: {
  tenantId: string;
  pack: MemberPack;
  bookingId: string;
  actorUserId?: string | null;
}) {
  const { tenantId, pack, bookingId, actorUserId } = options;
  const db = getDb();

  const balanceGuard =
    pack.sessionsPerPeriod === null
      ? sql`true`
      : sql`(
          ${pack.sessionsPerPeriod} + coalesce((
            SELECT sum(c."delta")
            FROM "pack_credits" c
            WHERE c."member_pack_id" = ${pack.id}
              AND c."period_start" = ${pack.currentPeriodStart}
          ), 0)
        ) > 0`;

  const inserted = await db.execute(sql`
    INSERT INTO "pack_credits" (
      "tenant_id", "member_pack_id", "booking_id", "delta", "reason",
      "period_start", "created_by_user_id"
    )
    SELECT ${tenantId}, ${pack.id}, ${bookingId}, -1, 'booking',
           ${pack.currentPeriodStart}, ${actorUserId ?? null}
    WHERE ${balanceGuard}
    ON CONFLICT DO NOTHING
    RETURNING "id"
  `);

  if (inserted.rows.length === 0) {
    return null;
  }

  // The pack was paid for up front, so a session it covers is already settled.
  await db
    .update(bookings)
    .set({ memberPackId: pack.id, paymentStatus: "paid" })
    .where(eq(bookings.id, bookingId));

  return pack;
}

/**
 * Spends a credit on a newly confirmed booking if the member holds a pack that
 * covers the class. Returns null when they do not, which leaves the booking as
 * pay-as-you-go rather than blocking it.
 */
export async function applyPackCreditToBooking(options: {
  tenantId: string;
  userId: string;
  bookingId: string;
  trainingTierId: string | null;
  actorUserId?: string | null;
}) {
  const match = await findPackToSpend(
    options.tenantId,
    options.userId,
    options.trainingTierId,
  );

  if (!match) {
    return null;
  }

  return spendCreditForBooking({
    tenantId: options.tenantId,
    pack: match.pack,
    bookingId: options.bookingId,
    actorUserId: options.actorUserId,
  });
}

/**
 * Hands a credit back when a booking that spent one is cancelled. Safe to call
 * for any booking; it no-ops when no credit was spent or one was already
 * refunded.
 */
export async function refundCreditForBooking(booking: {
  id: string;
  tenantId: string;
  memberPackId: string | null;
}) {
  if (!booking.memberPackId) {
    return null;
  }

  const db = getDb();

  const pack = await db.query.memberPacks.findFirst({
    where: eq(memberPacks.id, booking.memberPackId),
  });

  if (!pack) {
    return null;
  }

  const spend = await db.query.packCredits.findFirst({
    where: and(
      eq(packCredits.bookingId, booking.id),
      eq(packCredits.reason, "booking"),
    ),
  });

  if (!spend) {
    return null;
  }

  // Refund into the period the credit was taken from. If that period has
  // already rolled over the credit is simply gone, which matches packs that
  // do not roll over.
  const refunded = await db.execute(sql`
    INSERT INTO "pack_credits" (
      "tenant_id", "member_pack_id", "booking_id", "delta", "reason", "period_start"
    )
    VALUES (
      ${booking.tenantId}, ${pack.id}, ${booking.id}, 1, 'booking_cancelled',
      ${spend.periodStart}
    )
    ON CONFLICT DO NOTHING
    RETURNING "id"
  `);

  return refunded.rows.length > 0 ? pack : null;
}
