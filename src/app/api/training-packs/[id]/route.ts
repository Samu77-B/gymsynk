import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { trainingPackOptions } from "@/db/schema";
import { jsonError, parseJson } from "@/lib/api";
import {
  canManageClasses,
  forbiddenResponse,
  requireSession,
  unauthorizedResponse,
} from "@/lib/auth";

const updatePackSchema = z.object({
  label: z.string().trim().min(1).max(255).optional(),
  sessionCount: z.coerce.number().int().min(1).max(100).optional().nullable(),
  price: z.coerce.number().min(0).max(99999).optional(),
  isPayAsYouGo: z.boolean().optional(),
  note: z.string().trim().max(500).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(100).optional(),
  active: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

function formatPrice(value: number) {
  return value.toFixed(2);
}

async function loadPack(id: string, tenantId: string) {
  return getDb().query.trainingPackOptions.findFirst({
    where: and(
      eq(trainingPackOptions.id, id),
      eq(trainingPackOptions.tenantId, tenantId),
    ),
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
  const pack = await loadPack(id, session.tenantId);

  if (!pack) {
    return jsonError("Pack option not found", 404);
  }

  const body = await request.json();
  const parsed = parseJson(updatePackSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const isPayAsYouGo =
    parsed.data.isPayAsYouGo !== undefined
      ? parsed.data.isPayAsYouGo
      : pack.isPayAsYouGo;

  const [updated] = await getDb()
    .update(trainingPackOptions)
    .set(
      Object.fromEntries(
        Object.entries({
          label: parsed.data.label,
          sessionCount:
            parsed.data.sessionCount !== undefined
              ? isPayAsYouGo
                ? null
                : parsed.data.sessionCount
              : parsed.data.isPayAsYouGo !== undefined && isPayAsYouGo
                ? null
                : undefined,
          price:
            parsed.data.price !== undefined
              ? formatPrice(parsed.data.price)
              : undefined,
          isPayAsYouGo: parsed.data.isPayAsYouGo,
          note:
            parsed.data.note !== undefined
              ? parsed.data.note?.trim() || null
              : undefined,
          sortOrder: parsed.data.sortOrder,
          active: parsed.data.active,
        }).filter(([, value]) => value !== undefined),
      ),
    )
    .where(eq(trainingPackOptions.id, pack.id))
    .returning();

  return Response.json({ pack: updated });
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
  const pack = await loadPack(id, session.tenantId);

  if (!pack) {
    return jsonError("Pack option not found", 404);
  }

  await getDb()
    .delete(trainingPackOptions)
    .where(eq(trainingPackOptions.id, pack.id));

  return Response.json({ ok: true });
}
