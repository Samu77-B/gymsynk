import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { jsonError, parseJson } from "@/lib/api";
import {
  assignableStaffRoles,
  serializeStaffUser,
} from "@/lib/staff";
import {
  canManageStaff,
  forbiddenResponse,
  requireSession,
  unauthorizedResponse,
} from "@/lib/auth";

const photoUrlSchema = z
  .union([z.string().url().max(2048), z.literal("")])
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

const createStaffSchema = z.object({
  fullName: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.string().max(50).optional().nullable(),
  role: z.enum(["trainer", "admin"]),
  bio: z.string().max(5000).optional().nullable(),
  photoUrl1: photoUrlSchema,
  photoUrl2: photoUrlSchema,
  photoUrl3: photoUrlSchema,
});

export async function GET() {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageStaff(session.role)) {
    return forbiddenResponse();
  }

  const db = getDb();

  const rows = await db.query.users.findMany({
    where: and(
      eq(users.tenantId, session.tenantId),
      inArray(users.role, ["owner", "admin", "trainer"]),
    ),
    orderBy: (table, { asc }) => [asc(table.fullName)],
  });

  return Response.json({
    staff: rows.map(serializeStaffUser),
    assignableRoles: assignableStaffRoles(session.role),
  });
}

export async function POST(request: Request) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageStaff(session.role)) {
    return forbiddenResponse();
  }

  const body = await request.json();
  const parsed = parseJson(createStaffSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  if (!assignableStaffRoles(session.role).includes(parsed.data.role)) {
    return forbiddenResponse();
  }

  const db = getDb();
  const email = parsed.data.email.toLowerCase();

  const existing = await db.query.users.findFirst({
    where: and(eq(users.tenantId, session.tenantId), eq(users.email, email)),
  });

  if (existing) {
    return jsonError("A user with this email already exists for this gym", 409);
  }

  const [staffMember] = await db
    .insert(users)
    .values({
      tenantId: session.tenantId,
      fullName: parsed.data.fullName,
      email,
      phone: parsed.data.phone ?? null,
      role: parsed.data.role,
      bio: parsed.data.bio ?? null,
      photoUrl1: parsed.data.photoUrl1 ?? null,
      photoUrl2: parsed.data.photoUrl2 ?? null,
      photoUrl3: parsed.data.photoUrl3 ?? null,
      isActive: true,
    })
    .returning();

  return Response.json({ staff: serializeStaffUser(staffMember) }, { status: 201 });
}
