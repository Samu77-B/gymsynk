import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { classes } from "@/db/schema";
import { jsonError, parseJson } from "@/lib/api";
import {
  canManageClasses,
  forbiddenResponse,
  requireSession,
  unauthorizedResponse,
} from "@/lib/auth";

const classBodySchema = z.object({
  title: z.string().trim().min(2).max(255),
  description: z.string().trim().max(5000).optional().nullable(),
  capacity: z.coerce.number().int().min(1).max(500),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  price: z.coerce.number().min(0).max(99999),
});

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
    trainingTierId: row.trainingTierId,
  };
}

export async function GET() {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const db = getDb();
  const classList = await db.query.classes.findMany({
    where: eq(classes.tenantId, session.tenantId),
    orderBy: [asc(classes.title)],
  });

  return Response.json({ classes: classList.map(serializeClass) });
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
  const parsed = parseJson(classBodySchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const db = getDb();
  const title = parsed.data.title;

  const existing = await db.query.classes.findFirst({
    where: and(
      eq(classes.tenantId, session.tenantId),
      eq(classes.title, title),
    ),
  });

  if (existing) {
    return jsonError("A class with this name already exists", 409);
  }

  const [classRecord] = await db
    .insert(classes)
    .values({
      tenantId: session.tenantId,
      title,
      description: parsed.data.description?.trim() || null,
      capacity: parsed.data.capacity,
      durationMinutes: parsed.data.durationMinutes,
      price: formatPrice(parsed.data.price),
    })
    .returning();

  return Response.json({ class: serializeClass(classRecord) }, { status: 201 });
}
