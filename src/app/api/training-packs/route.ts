import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { trainingPackOptions, trainingTiers } from "@/db/schema";
import { jsonError, parseJson } from "@/lib/api";
import {
  canManageClasses,
  forbiddenResponse,
  requireSession,
  unauthorizedResponse,
} from "@/lib/auth";

const createPackSchema = z.object({
  tierId: z.string().uuid(),
  label: z.string().trim().min(1).max(255),
  sessionCount: z.coerce.number().int().min(1).max(100).optional().nullable(),
  price: z.coerce.number().min(0).max(99999),
  isPayAsYouGo: z.boolean().optional(),
  note: z.string().trim().max(500).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(100).optional(),
  active: z.boolean().optional(),
});

function formatPrice(value: number) {
  return value.toFixed(2);
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
  const parsed = parseJson(createPackSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const db = getDb();
  const tier = await db.query.trainingTiers.findFirst({
    where: and(
      eq(trainingTiers.id, parsed.data.tierId),
      eq(trainingTiers.tenantId, session.tenantId),
    ),
    with: { packs: true },
  });

  if (!tier) {
    return jsonError("Tier not found", 404);
  }

  const sortOrder = parsed.data.sortOrder ?? tier.packs.length + 1;
  const isPayAsYouGo = parsed.data.isPayAsYouGo ?? false;

  const [pack] = await db
    .insert(trainingPackOptions)
    .values({
      tenantId: session.tenantId,
      tierId: tier.id,
      label: parsed.data.label,
      sessionCount: isPayAsYouGo ? null : (parsed.data.sessionCount ?? null),
      price: formatPrice(parsed.data.price),
      isPayAsYouGo,
      note: parsed.data.note?.trim() || null,
      sortOrder,
      active: parsed.data.active ?? true,
    })
    .returning();

  return Response.json({ pack }, { status: 201 });
}
