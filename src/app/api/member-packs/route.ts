import { addMonths } from "date-fns";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { memberPacks, trainingPackOptions, users } from "@/db/schema";
import { jsonError, parseJson } from "@/lib/api";
import {
  canManageClasses,
  forbiddenResponse,
  requireSession,
  unauthorizedResponse,
} from "@/lib/auth";
import {
  listPacksForTenant,
  listPacksForUser,
  serializePack,
} from "@/lib/packs";

const grantPackSchema = z
  .object({
    userId: z.string().uuid(),
    // Granting from a catalogue option snapshots its tier, price and size.
    packOptionId: z.string().uuid().optional(),
    label: z.string().trim().min(2).max(255).optional(),
    tierId: z.string().uuid().optional().nullable(),
    sessionsPerPeriod: z.coerce.number().int().min(1).max(500).optional().nullable(),
    price: z.coerce.number().min(0).max(99999).optional().nullable(),
    startDate: z.string().datetime().optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((value) => Boolean(value.packOptionId || value.label), {
    message: "Provide either packOptionId or a label",
    path: ["label"],
  });

export async function GET(request: Request) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  // Members may only ever see their own packs.
  if (session.role === "member") {
    const packs = await listPacksForUser(session.tenantId, session.userId);
    return Response.json({ packs: packs.map(serializePack) });
  }

  const packs = userId
    ? await listPacksForUser(session.tenantId, userId)
    : await listPacksForTenant(session.tenantId);

  return Response.json({ packs: packs.map(serializePack) });
}

export async function POST(request: Request) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageClasses(session.role)) {
    return forbiddenResponse();
  }

  const body = await request.json();
  const parsed = parseJson(grantPackSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const db = getDb();

  const member = await db.query.users.findFirst({
    where: and(
      eq(users.id, parsed.data.userId),
      eq(users.tenantId, session.tenantId),
    ),
  });

  if (!member) {
    return jsonError("Member not found", 404);
  }

  let label = parsed.data.label ?? null;
  let tierId = parsed.data.tierId ?? null;
  let sessionsPerPeriod = parsed.data.sessionsPerPeriod ?? null;
  let price =
    parsed.data.price === null || parsed.data.price === undefined
      ? null
      : parsed.data.price.toFixed(2);

  if (parsed.data.packOptionId) {
    const option = await db.query.trainingPackOptions.findFirst({
      where: and(
        eq(trainingPackOptions.id, parsed.data.packOptionId),
        eq(trainingPackOptions.tenantId, session.tenantId),
      ),
    });

    if (!option) {
      return jsonError("Pack option not found", 404);
    }

    // Explicit values in the request still win, so staff can override a
    // one-off without editing the catalogue.
    label = label ?? option.label;
    tierId = tierId ?? option.tierId;
    sessionsPerPeriod = sessionsPerPeriod ?? option.sessionCount;
    price = price ?? option.price;
  }

  if (!label) {
    return jsonError("A pack label is required", 400);
  }

  const periodStart = parsed.data.startDate
    ? new Date(parsed.data.startDate)
    : new Date();

  if (Number.isNaN(periodStart.getTime())) {
    return jsonError("Invalid start date", 400);
  }

  const [pack] = await db
    .insert(memberPacks)
    .values({
      tenantId: session.tenantId,
      userId: member.id,
      tierId,
      packOptionId: parsed.data.packOptionId ?? null,
      label,
      sessionsPerPeriod,
      price,
      source: "admin",
      currentPeriodStart: periodStart,
      currentPeriodEnd: addMonths(periodStart, 1),
      notes: parsed.data.notes?.trim() || null,
    })
    .returning();

  return Response.json({ pack }, { status: 201 });
}
