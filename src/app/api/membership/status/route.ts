import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { membershipMembers, users } from "@/db/schema";
import { parseJson, jsonError } from "@/lib/api";
import {
  countMembershipMembers,
  getPrimaryMembershipForUser,
  membershipStatusLabel,
} from "@/lib/membership";
import { requireSession, unauthorizedResponse } from "@/lib/auth";

export async function GET() {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const membership = await getPrimaryMembershipForUser(
    session.tenantId,
    session.userId,
  );

  if (!membership) {
    const linked = await getDb().query.membershipMembers.findFirst({
      where: eq(membershipMembers.userId, session.userId),
      with: {
        membership: {
          with: {
            plan: true,
            members: {
              with: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!linked?.membership) {
      return Response.json({ membership: null });
    }

    const linkedMembership = linked.membership;

    return Response.json({
      membership: {
        id: linkedMembership.id,
        status: linkedMembership.status,
        statusLabel: membershipStatusLabel(linkedMembership.status),
        planName: linkedMembership.plan.name,
        maxMembers: linkedMembership.plan.maxMembers,
        memberCount: linkedMembership.members.length,
        trialEndsAt: linkedMembership.trialEndsAt,
        currentPeriodEnd: linkedMembership.currentPeriodEnd,
        isPrimary: false,
        members: linkedMembership.members.map((member) => ({
          id: member.user.id,
          fullName: member.user.fullName,
          email: member.user.email,
          isPrimary: member.isPrimary,
        })),
      },
    });
  }

  return Response.json({
    membership: {
      id: membership.id,
      status: membership.status,
      statusLabel: membershipStatusLabel(membership.status),
      planName: membership.plan.name,
      maxMembers: membership.plan.maxMembers,
      memberCount: membership.members.length,
      trialEndsAt: membership.trialEndsAt,
      currentPeriodEnd: membership.currentPeriodEnd,
      isPrimary: true,
      members: membership.members.map((member) => ({
        id: member.user.id,
        fullName: member.user.fullName,
        email: member.user.email,
        isPrimary: member.isPrimary,
      })),
    },
  });
}

const inviteSchema = z.object({
  fullName: z.string().min(2).max(255),
  email: z.string().email(),
});

export async function POST(request: Request) {
  const session = await requireSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const parsed = parseJson(inviteSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const membership = await getPrimaryMembershipForUser(
    session.tenantId,
    session.userId,
  );

  if (!membership) {
    return jsonError("Only the primary member can invite family members", 403);
  }

  const memberCount = await countMembershipMembers(membership.id);

  if (memberCount >= membership.plan.maxMembers) {
    return jsonError("This plan has no remaining member slots", 409);
  }

  const db = getDb();
  const email = parsed.data.email.toLowerCase();

  let user = await db.query.users.findFirst({
    where: and(eq(users.tenantId, session.tenantId), eq(users.email, email)),
  });

  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        tenantId: session.tenantId,
        fullName: parsed.data.fullName,
        email,
        role: "member",
      })
      .returning();
  }

  const existingLink = await db.query.membershipMembers.findFirst({
    where: and(
      eq(membershipMembers.membershipId, membership.id),
      eq(membershipMembers.userId, user.id),
    ),
  });

  if (existingLink) {
    return jsonError("This person is already on your membership", 409);
  }

  await db.insert(membershipMembers).values({
    membershipId: membership.id,
    userId: user.id,
    isPrimary: false,
  });

  return Response.json({
    member: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      isPrimary: false,
    },
  });
}
