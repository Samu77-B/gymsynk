import { and, asc, eq } from "drizzle-orm";
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

const createTierSchema = z.object({
  name: z.string().trim().min(1).max(255),
  subtitle: z.string().trim().max(255).optional().nullable(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens"),
  pricePerClass: z.coerce.number().min(0).max(99999),
  sortOrder: z.coerce.number().int().min(0).max(100).optional(),
  active: z.boolean().optional(),
});

function formatPrice(value: number) {
  return value.toFixed(2);
}

function serializeTier(
  tier: typeof trainingTiers.$inferSelect & {
    packs: Array<typeof trainingPackOptions.$inferSelect>;
    classes: Array<{ id: string; title: string }>;
  },
) {
  return {
    id: tier.id,
    name: tier.name,
    subtitle: tier.subtitle,
    slug: tier.slug,
    pricePerClass: tier.pricePerClass,
    sortOrder: tier.sortOrder,
    active: tier.active,
    packs: tier.packs.map((pack) => ({
      id: pack.id,
      label: pack.label,
      sessionCount: pack.sessionCount,
      price: pack.price,
      isPayAsYouGo: pack.isPayAsYouGo,
      note: pack.note,
      sortOrder: pack.sortOrder,
      active: pack.active,
    })),
    classes: tier.classes.map((item) => ({
      id: item.id,
      title: item.title,
    })),
  };
}

export async function GET() {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageClasses(session.role)) {
    return forbiddenResponse();
  }

  const db = getDb();
  const tiers = await db.query.trainingTiers.findMany({
    where: eq(trainingTiers.tenantId, session.tenantId),
    with: {
      packs: {
        orderBy: [asc(trainingPackOptions.sortOrder)],
      },
      classes: {
        columns: { id: true, title: true },
      },
    },
    orderBy: [asc(trainingTiers.sortOrder)],
  });

  return Response.json({ tiers: tiers.map(serializeTier) });
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
  const parsed = parseJson(createTierSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const db = getDb();
  const slug = parsed.data.slug.toLowerCase();

  const duplicate = await db.query.trainingTiers.findFirst({
    where: and(
      eq(trainingTiers.tenantId, session.tenantId),
      eq(trainingTiers.slug, slug),
    ),
  });

  if (duplicate) {
    return jsonError("A tier with this slug already exists", 409);
  }

  const existingTiers = await db.query.trainingTiers.findMany({
    where: eq(trainingTiers.tenantId, session.tenantId),
  });

  const sortOrder = parsed.data.sortOrder ?? existingTiers.length + 1;

  const [tier] = await db
    .insert(trainingTiers)
    .values({
      tenantId: session.tenantId,
      name: parsed.data.name,
      subtitle: parsed.data.subtitle?.trim() || null,
      slug,
      pricePerClass: formatPrice(parsed.data.pricePerClass),
      sortOrder,
      active: parsed.data.active ?? true,
    })
    .returning();

  return Response.json(
    {
      tier: serializeTier({
        ...tier,
        packs: [],
        classes: [],
      }),
    },
    { status: 201 },
  );
}
