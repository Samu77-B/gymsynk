import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { classes, classSchedules } from "@/db/schema";
import { jsonError, parseJson } from "@/lib/api";
import {
  canManageClasses,
  forbiddenResponse,
  requireSession,
  unauthorizedResponse,
} from "@/lib/auth";

const updateClassSchema = z.object({
  title: z.string().trim().min(2).max(255).optional(),
  description: z.string().trim().max(5000).optional().nullable(),
  capacity: z.coerce.number().int().min(1).max(500).optional(),
  durationMinutes: z.coerce.number().int().min(5).max(480).optional(),
  price: z.coerce.number().min(0).max(99999).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

function formatPrice(value: number) {
  return value.toFixed(2);
}

function serializeClass(row: typeof classes.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    capacity: row.capacity,
    durationMinutes: row.durationMinutes,
    price: row.price,
  };
}

async function loadClass(id: string, tenantId: string) {
  const db = getDb();

  return db.query.classes.findFirst({
    where: and(eq(classes.id, id), eq(classes.tenantId, tenantId)),
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
  const classRecord = await loadClass(id, session.tenantId);

  if (!classRecord) {
    return jsonError("Class not found", 404);
  }

  const body = await request.json();
  const parsed = parseJson(updateClassSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const db = getDb();
  const nextTitle = parsed.data.title ?? classRecord.title;

  if (nextTitle !== classRecord.title) {
    const duplicate = await db.query.classes.findFirst({
      where: and(
        eq(classes.tenantId, session.tenantId),
        eq(classes.title, nextTitle),
      ),
    });

    if (duplicate && duplicate.id !== classRecord.id) {
      return jsonError("A class with this name already exists", 409);
    }
  }

  const [updated] = await db
    .update(classes)
    .set(
      Object.fromEntries(
        Object.entries({
          title: parsed.data.title,
          description:
            parsed.data.description !== undefined
              ? parsed.data.description?.trim() || null
              : undefined,
          capacity: parsed.data.capacity,
          durationMinutes: parsed.data.durationMinutes,
          price:
            parsed.data.price !== undefined
              ? formatPrice(parsed.data.price)
              : undefined,
        }).filter(([, value]) => value !== undefined),
      ),
    )
    .where(eq(classes.id, classRecord.id))
    .returning();

  return Response.json({ class: serializeClass(updated) });
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
  const classRecord = await loadClass(id, session.tenantId);

  if (!classRecord) {
    return jsonError("Class not found", 404);
  }

  const db = getDb();
  const linkedSchedule = await db.query.classSchedules.findFirst({
    where: eq(classSchedules.classId, classRecord.id),
    columns: { id: true },
  });

  if (linkedSchedule) {
    return jsonError(
      "This class has scheduled sessions. Delete or reassign those sessions first.",
      409,
    );
  }

  await db.delete(classes).where(eq(classes.id, classRecord.id));

  return Response.json({ ok: true });
}
