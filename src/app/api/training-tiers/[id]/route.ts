import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { trainingTiers } from "@/db/schema";
import { jsonError, parseJson } from "@/lib/api";
import {
  canManageClasses,
  forbiddenResponse,
  requireSession,
  unauthorizedResponse,
} from "@/lib/auth";

const updateTierSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  subtitle: z.string().trim().max(255).optional().nullable(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  pricePerClass: z.coerce.number().min(0).max(99999).optional(),
  sortOrder: z.coerce.number().int().min(0).max(100).optional(),
  active: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

function formatPrice(value: number) {
  return value.toFixed(2);
}

async function loadTier(id: string, tenantId: string) {
  return getDb().query.trainingTiers.findFirst({
    where: and(eq(trainingTiers.id, id), eq(trainingTiers.tenantId, tenantId)),
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageClasses(session.role)) {
    return forbiddenResponse();
  }

  const { id } = await context.params;
  const tier = await loadTier(id, session.tenantId);

  if (!tier) {
    return jsonError("Tier not found", 404);
  }

  const body = await request.json();
  const parsed = parseJson(updateTierSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const db = getDb();
  const nextSlug = parsed.data.slug?.toLowerCase() ?? tier.slug;

  if (nextSlug !== tier.slug) {
    const duplicate = await db.query.trainingTiers.findFirst({
      where: and(
        eq(trainingTiers.tenantId, session.tenantId),
        eq(trainingTiers.slug, nextSlug),
      ),
    });

    if (duplicate && duplicate.id !== tier.id) {
      return jsonError("A tier with this slug already exists", 409);
    }
  }

  const [updated] = await db
    .update(trainingTiers)
    .set(
      Object.fromEntries(
        Object.entries({
          name: parsed.data.name,
          subtitle:
            parsed.data.subtitle !== undefined
              ? parsed.data.subtitle?.trim() || null
              : undefined,
          slug: parsed.data.slug ? nextSlug : undefined,
          pricePerClass:
            parsed.data.pricePerClass !== undefined
              ? formatPrice(parsed.data.pricePerClass)
              : undefined,
          sortOrder: parsed.data.sortOrder,
          active: parsed.data.active,
        }).filter(([, value]) => value !== undefined),
      ),
    )
    .where(eq(trainingTiers.id, tier.id))
    .returning();

  return Response.json({ tier: updated });
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
  const tier = await loadTier(id, session.tenantId);

  if (!tier) {
    return jsonError("Tier not found", 404);
  }

  await getDb().delete(trainingTiers).where(eq(trainingTiers.id, tier.id));

  return Response.json({ ok: true });
}
