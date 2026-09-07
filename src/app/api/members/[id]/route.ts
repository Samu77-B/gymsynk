import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { memberProfiles, memberships, users } from "@/db/schema";
import { jsonError, parseJson } from "@/lib/api";
import {
  canManageStaff,
  forbiddenResponse,
  requireSession,
  unauthorizedResponse,
} from "@/lib/auth";
import {
  emptyProfileDefaults,
  profileToDbValues,
  serializeMemberListItem,
  serializeMemberProfile,
  type MemberProfilePayload,
} from "@/lib/member-profile";
import { membershipStatusLabel } from "@/lib/membership";

const profileSchema = z.object({
  legalName: z.string().max(255).optional(),
  dateOfBirth: z.string().optional().nullable(),
  addressLine1: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  county: z.string().max(100).optional(),
  postcode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  emergencyContactName: z.string().max(255).optional(),
  emergencyContactRelationship: z.string().max(100).optional(),
  emergencyContactPhone: z.string().max(50).optional(),
  parqStatus: z
    .enum(["not_started", "cleared", "doctor_required", "declined"])
    .optional(),
  medicalNotes: z.string().max(5000).optional().nullable(),
  accessCardId: z.string().max(100).optional(),
  memberPhotoUrl: z
    .union([z.string().url().max(2048), z.literal("")])
    .optional(),
  billingSameAsHome: z.boolean().optional(),
  billingAddressLine1: z.string().max(255).optional(),
  billingAddressLine2: z.string().max(255).optional(),
  billingCity: z.string().max(100).optional(),
  billingPostcode: z.string().max(20).optional(),
  billingCountry: z.string().max(100).optional(),
  joiningFeePaid: z.boolean().optional(),
  joiningFeeAmount: z.string().optional().nullable(),
  joiningFeePaidAt: z.string().datetime().optional().nullable(),
  waiverSignedAt: z.string().datetime().optional().nullable(),
  termsAcceptedAt: z.string().datetime().optional().nullable(),
  paymentMethodNote: z.string().max(255).optional(),
});

const updateMemberSchema = z.object({
  fullName: z.string().min(2).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional().nullable(),
  isActive: z.boolean().optional(),
  profile: profileSchema.optional(),
  membership: z
    .object({
      startDate: z.string().datetime().optional().nullable(),
      contractEndDate: z.string().datetime().optional().nullable(),
    })
    .optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function loadMember(id: string, tenantId: string) {
  const db = getDb();

  return db.query.users.findFirst({
    where: and(
      eq(users.id, id),
      eq(users.tenantId, tenantId),
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
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageStaff(session.role)) {
    return forbiddenResponse();
  }

  const { id } = await context.params;
  const member = await loadMember(id, session.tenantId);

  if (!member) {
    return jsonError("Member not found", 404);
  }

  const link = member.membershipLinks[0];
  const membership = link?.membership
    ? { membership: link.membership, isPrimary: link.isPrimary }
    : null;

  return Response.json({
    member: {
      ...serializeMemberListItem(member, member.memberProfile, membership),
      statusLabel: membership
        ? membershipStatusLabel(membership.membership.status)
        : "No membership",
      stripeCustomerId: member.stripeCustomerId,
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageStaff(session.role)) {
    return forbiddenResponse();
  }

  const { id } = await context.params;
  const member = await loadMember(id, session.tenantId);

  if (!member) {
    return jsonError("Member not found", 404);
  }

  const body = await request.json();
  const parsed = parseJson(updateMemberSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const db = getDb();

  if (parsed.data.email) {
    const email = parsed.data.email.toLowerCase();
    const duplicate = await db.query.users.findFirst({
      where: and(eq(users.tenantId, session.tenantId), eq(users.email, email)),
    });

    if (duplicate && duplicate.id !== member.id) {
      return jsonError("A user with this email already exists for this gym", 409);
    }
  }

  if (parsed.data.fullName || parsed.data.email || parsed.data.phone !== undefined || parsed.data.isActive !== undefined) {
    await db
      .update(users)
      .set(
        Object.fromEntries(
          Object.entries({
            fullName: parsed.data.fullName,
            email: parsed.data.email?.toLowerCase(),
            phone: parsed.data.phone,
            isActive: parsed.data.isActive,
          }).filter(([, value]) => value !== undefined),
        ),
      )
      .where(eq(users.id, member.id));
  }

  if (parsed.data.profile) {
    const current = serializeMemberProfile(member.memberProfile);
    const merged: MemberProfilePayload = {
      ...current,
      ...parsed.data.profile,
      medicalNotes:
        parsed.data.profile.medicalNotes ?? current.medicalNotes ?? "",
      memberPhotoUrl:
        parsed.data.profile.memberPhotoUrl === ""
          ? ""
          : (parsed.data.profile.memberPhotoUrl ?? current.memberPhotoUrl),
      joiningFeeAmount:
        parsed.data.profile.joiningFeeAmount ?? current.joiningFeeAmount ?? "",
    };

    const values = profileToDbValues(merged);

    if (member.memberProfile) {
      await db
        .update(memberProfiles)
        .set(values)
        .where(eq(memberProfiles.userId, member.id));
    } else {
      await db.insert(memberProfiles).values({
        tenantId: session.tenantId,
        userId: member.id,
        ...values,
      });
    }
  }

  if (parsed.data.membership) {
    const link = member.membershipLinks[0];

    if (link?.membership) {
      await db
        .update(memberships)
        .set(
          Object.fromEntries(
            Object.entries({
              startDate: parsed.data.membership.startDate
                ? new Date(parsed.data.membership.startDate)
                : parsed.data.membership.startDate === null
                  ? null
                  : undefined,
              contractEndDate: parsed.data.membership.contractEndDate
                ? new Date(parsed.data.membership.contractEndDate)
                : parsed.data.membership.contractEndDate === null
                  ? null
                  : undefined,
            }).filter(([, value]) => value !== undefined),
          ),
        )
        .where(eq(memberships.id, link.membership.id));
    }
  }

  const updated = await loadMember(id, session.tenantId);

  if (!updated) {
    return jsonError("Member not found", 404);
  }

  const updatedLink = updated.membershipLinks[0];
  const membership = updatedLink?.membership
    ? { membership: updatedLink.membership, isPrimary: updatedLink.isPrimary }
    : null;

  return Response.json({
    member: {
      ...serializeMemberListItem(updated, updated.memberProfile, membership),
      statusLabel: membership
        ? membershipStatusLabel(membership.membership.status)
        : "No membership",
      stripeCustomerId: updated.stripeCustomerId,
    },
  });
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
  const member = await loadMember(id, session.tenantId);

  if (!member) {
    return jsonError("Member not found", 404);
  }

  const db = getDb();
  await db.delete(users).where(eq(users.id, member.id));

  return Response.json({ ok: true });
}
