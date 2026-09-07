import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { memberProfiles, membershipMembers, memberships, users } from "@/db/schema";
import { jsonError, parseJson } from "@/lib/api";
import {
  canManageStaff,
  forbiddenResponse,
  requireSession,
  unauthorizedResponse,
} from "@/lib/auth";
import {
  profileToDbValues,
  serializeMemberListItem,
} from "@/lib/member-profile";
import { membershipStatusLabel } from "@/lib/membership";

const createMemberSchema = z.object({
  fullName: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.string().max(50).optional().nullable(),
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

  const members = await db.query.users.findMany({
    where: and(
      eq(users.tenantId, session.tenantId),
      eq(users.role, "member"),
    ),
    with: {
      memberProfile: true,
      membershipLinks: {
        with: {
          membership: {
            with: {
              plan: true,
            },
          },
        },
      },
    },
    orderBy: [asc(users.fullName)],
  });

  return Response.json({
    members: members.map((member) => {
      const link = member.membershipLinks[0];
      const membership = link?.membership
        ? {
            membership: link.membership,
            isPrimary: link.isPrimary,
          }
        : null;

      const item = serializeMemberListItem(
        member,
        member.memberProfile,
        membership,
      );

      return {
        ...item,
        statusLabel: membership
          ? membershipStatusLabel(membership.membership.status)
          : "No membership",
      };
    }),
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
  const parsed = parseJson(createMemberSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const db = getDb();
  const email = parsed.data.email.toLowerCase();

  const existing = await db.query.users.findFirst({
    where: and(eq(users.tenantId, session.tenantId), eq(users.email, email)),
  });

  if (existing) {
    return jsonError("A user with this email already exists for this gym", 409);
  }

  const [member] = await db
    .insert(users)
    .values({
      tenantId: session.tenantId,
      fullName: parsed.data.fullName,
      email,
      phone: parsed.data.phone ?? null,
      role: "member",
      isActive: true,
    })
    .returning();

  await db.insert(memberProfiles).values({
    tenantId: session.tenantId,
    userId: member.id,
    legalName: parsed.data.fullName,
  });

  return Response.json(
    {
      member: serializeMemberListItem(member, null, null),
    },
    { status: 201 },
  );
}
