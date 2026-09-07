import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { jsonError, parseJson } from "@/lib/api";
import {
  canManageTargetStaff,
  serializeStaffUser,
  staffRoles,
} from "@/lib/staff";
import {
  canManageStaff,
  forbiddenResponse,
  requireSession,
  unauthorizedResponse,
} from "@/lib/auth";

const updateStaffSchema = z.object({
  fullName: z.string().min(2).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional().nullable(),
  role: z.enum(["trainer", "admin"]).optional(),
  isActive: z.boolean().optional(),
  bio: z.string().max(5000).optional().nullable(),
  photoUrl1: z
    .union([z.string().url().max(2048), z.literal("")])
    .optional()
    .nullable()
    .transform((value) => (value === undefined ? undefined : value || null)),
  photoUrl2: z
    .union([z.string().url().max(2048), z.literal("")])
    .optional()
    .nullable()
    .transform((value) => (value === undefined ? undefined : value || null)),
  photoUrl3: z
    .union([z.string().url().max(2048), z.literal("")])
    .optional()
    .nullable()
    .transform((value) => (value === undefined ? undefined : value || null)),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageStaff(session.role)) {
    return forbiddenResponse();
  }

  const { id } = await context.params;
  const db = getDb();

  const target = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.tenantId, session.tenantId)),
  });

  if (!target || !staffRoles.includes(target.role as "trainer" | "admin")) {
    if (!target || target.role !== "owner") {
      return jsonError("Staff member not found", 404);
    }

    return jsonError("Owner accounts cannot be edited here", 403);
  }

  if (!canManageTargetStaff(session.role, target.role)) {
    return forbiddenResponse();
  }

  const body = await request.json();
  const parsed = parseJson(updateStaffSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  if (parsed.data.role && !canManageTargetStaff(session.role, parsed.data.role)) {
    return forbiddenResponse();
  }

  if (parsed.data.email) {
    const email = parsed.data.email.toLowerCase();
    const duplicate = await db.query.users.findFirst({
      where: and(eq(users.tenantId, session.tenantId), eq(users.email, email)),
    });

    if (duplicate && duplicate.id !== target.id) {
      return jsonError("A user with this email already exists for this gym", 409);
    }
  }

  if (parsed.data.isActive === false && target.id === session.userId) {
    return jsonError("You cannot pause your own account", 400);
  }

  const [updated] = await db
    .update(users)
    .set(
      Object.fromEntries(
        Object.entries({
          fullName: parsed.data.fullName,
          email: parsed.data.email?.toLowerCase(),
          phone: parsed.data.phone,
          role: parsed.data.role,
          isActive: parsed.data.isActive,
          bio: parsed.data.bio,
          photoUrl1: parsed.data.photoUrl1,
          photoUrl2: parsed.data.photoUrl2,
          photoUrl3: parsed.data.photoUrl3,
        }).filter(([, value]) => value !== undefined),
      ),
    )
    .where(eq(users.id, target.id))
    .returning();

  return Response.json({ staff: serializeStaffUser(updated) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageStaff(session.role)) {
    return forbiddenResponse();
  }

  const { id } = await context.params;

  if (id === session.userId) {
    return jsonError("You cannot delete your own account", 400);
  }

  const db = getDb();

  const target = await db.query.users.findFirst({
    where: and(eq(users.id, id), eq(users.tenantId, session.tenantId)),
  });

  if (!target || !staffRoles.includes(target.role as "trainer" | "admin")) {
    return jsonError("Staff member not found", 404);
  }

  if (!canManageTargetStaff(session.role, target.role)) {
    return forbiddenResponse();
  }

  await db.delete(users).where(eq(users.id, target.id));

  return Response.json({ ok: true });
}
