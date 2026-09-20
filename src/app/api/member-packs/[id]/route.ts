import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { memberPacks, packCredits } from "@/db/schema";
import { jsonError, parseJson } from "@/lib/api";
import {
  canManageClasses,
  forbiddenResponse,
  requireSession,
  unauthorizedResponse,
} from "@/lib/auth";
import { describePacks, rollPackPeriodForward, serializePack } from "@/lib/packs";

const updatePackSchema = z.object({
  status: z.enum(["active", "paused", "cancelled", "expired"]).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
  // Positive grants extra sessions this period, negative takes them away.
  adjustCredits: z.coerce.number().int().min(-500).max(500).optional(),
  adjustmentNote: z.string().trim().max(500).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageClasses(session.role)) {
    return forbiddenResponse();
  }

  const { id } = await context.params;
  const db = getDb();

  const existing = await db.query.memberPacks.findFirst({
    where: and(
      eq(memberPacks.id, id),
      eq(memberPacks.tenantId, session.tenantId),
    ),
  });

  if (!existing) {
    return jsonError("Pack not found", 404);
  }

  const body = await request.json();
  const parsed = parseJson(updatePackSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const pack = await rollPackPeriodForward(existing);

  if (parsed.data.adjustCredits) {
    await db.insert(packCredits).values({
      tenantId: session.tenantId,
      memberPackId: pack.id,
      delta: parsed.data.adjustCredits,
      reason: "admin_adjustment",
      periodStart: pack.currentPeriodStart,
      createdByUserId: session.userId,
    });
  }

  const changes: Partial<typeof memberPacks.$inferInsert> = {};

  if (parsed.data.status) {
    changes.status = parsed.data.status;
  }

  if (parsed.data.notes !== undefined) {
    changes.notes = parsed.data.notes?.trim() || null;
  }

  if (Object.keys(changes).length > 0) {
    changes.updatedAt = new Date();
    await db
      .update(memberPacks)
      .set(changes)
      .where(eq(memberPacks.id, pack.id));
  }

  const refreshed = await db.query.memberPacks.findFirst({
    where: eq(memberPacks.id, pack.id),
    with: { tier: true, user: true },
  });

  if (!refreshed) {
    return jsonError("Pack not found", 404);
  }

  const [balance] = await describePacks([refreshed]);

  return Response.json({
    pack: serializePack({
      ...balance,
      tier: refreshed.tier,
      user: refreshed.user,
    }),
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageClasses(session.role)) {
    return forbiddenResponse();
  }

  const { id } = await context.params;
  const db = getDb();

  const existing = await db.query.memberPacks.findFirst({
    where: and(
      eq(memberPacks.id, id),
      eq(memberPacks.tenantId, session.tenantId),
    ),
  });

  if (!existing) {
    return jsonError("Pack not found", 404);
  }

  // Cancelled rather than deleted, so the credit ledger stays auditable.
  const [cancelled] = await db
    .update(memberPacks)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(memberPacks.id, existing.id))
    .returning();

  return Response.json({ pack: cancelled });
}
