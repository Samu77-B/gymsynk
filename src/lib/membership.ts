import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import {
  membershipMembers,
  memberships,
  tenants,
  type membershipStatusEnum,
} from "@/db/schema";
import { listPacksForUser } from "@/lib/packs";
import { resolveBillingModel } from "@/lib/tenant-billing";

const bookableStatuses: Array<
  (typeof membershipStatusEnum.enumValues)[number]
> = ["trialing", "active"];

export async function getActiveMembershipForUser(
  tenantId: string,
  userId: string,
) {
  const db = getDb();

  const link = await db.query.membershipMembers.findFirst({
    where: eq(membershipMembers.userId, userId),
    with: {
      membership: {
        with: {
          plan: true,
        },
      },
    },
  });

  if (!link?.membership || link.membership.tenantId !== tenantId) {
    return null;
  }

  return link.membership;
}

export async function memberHasSpendableCredits(
  tenantId: string,
  userId: string,
) {
  const packs = await listPacksForUser(tenantId, userId);

  return packs.some(
    (entry) =>
      entry.pack.status === "active" &&
      (entry.unlimited || (entry.remaining ?? 0) > 0),
  );
}

function membershipBookable(membership: NonNullable<
  Awaited<ReturnType<typeof getActiveMembershipForUser>>
>) {
  return bookableStatuses.includes(membership.status);
}

export async function userCanBookClasses(
  tenantId: string,
  userId: string,
  role: string,
) {
  if (role !== "member") {
    return { allowed: true as const };
  }

  const db = getDb();
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant) {
    return { allowed: false as const, reason: "Gym not found." };
  }

  const billingModel = resolveBillingModel(tenant);
  const membership = await getActiveMembershipForUser(tenantId, userId);

  if (billingModel === "credits_only") {
    return { allowed: true as const, billingModel };
  }

  if (!membership) {
    const reason =
      billingModel === "hybrid"
        ? "No membership found. Join at /join, then buy class credits to book."
        : "No membership found. Join at /join to book classes.";

    return { allowed: false as const, reason };
  }

  if (!membershipBookable(membership)) {
    return {
      allowed: false as const,
      reason:
        membership.status === "past_due"
          ? "Your membership payment is overdue. Please update your payment method."
          : "Your membership is not active. Please renew to book classes.",
    };
  }

  if (billingModel === "hybrid" && tenant.featureSessionPacks) {
    const hasCredits = await memberHasSpendableCredits(tenantId, userId);

    if (!hasCredits) {
      return {
        allowed: false as const,
        reason:
          "You need class credits to book. Buy a credit package to continue.",
        buyCredits: true as const,
      };
    }
  }

  return { allowed: true as const, membership, billingModel };
}

/** Used when confirming a booking — credits-only gyms must spend a credit. */
export async function requireCreditForConfirmedBooking(
  tenantId: string,
  userId: string,
) {
  const db = getDb();
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant) {
    return { ok: false as const, reason: "Gym not found." };
  }

  const billingModel = resolveBillingModel(tenant);

  if (
    billingModel === "credits_only" ||
    (billingModel === "hybrid" && tenant.featureSessionPacks)
  ) {
    const hasCredits = await memberHasSpendableCredits(tenantId, userId);

    if (!hasCredits) {
      return {
        ok: false as const,
        reason:
          "You are out of class credits. Buy a credit package to book this class.",
        buyCredits: true as const,
      };
    }
  }

  return { ok: true as const };
}

export async function getMembershipSeatUsage(membershipId: string) {
  const db = getDb();

  const members = await db.query.membershipMembers.findMany({
    where: eq(membershipMembers.membershipId, membershipId),
  });

  return members.length;
}

export async function getPrimaryMembershipForUser(
  tenantId: string,
  userId: string,
) {
  const db = getDb();

  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.tenantId, tenantId),
      eq(memberships.primaryUserId, userId),
    ),
    with: {
      plan: true,
      members: {
        with: {
          user: true,
        },
      },
    },
  });

  return membership;
}

export async function listTenantMemberships(tenantId: string) {
  const db = getDb();

  return db.query.memberships.findMany({
    where: eq(memberships.tenantId, tenantId),
    with: {
      plan: true,
      primaryUser: true,
      members: {
        with: {
          user: true,
        },
      },
    },
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
}

export async function syncMembershipFromStripeSubscription(
  subscription: {
    id: string;
    customer: string | { id: string };
    status: string;
    trial_end: number | null;
    current_period_end: number | null;
  },
  status: (typeof membershipStatusEnum.enumValues)[number],
) {
  const db = getDb();
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const existing = await db.query.memberships.findFirst({
    where: eq(memberships.stripeSubscriptionId, subscription.id),
  });

  const values = {
    stripeCustomerId: customerId,
    status,
    trialEndsAt: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : null,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null,
  };

  if (existing) {
    await db
      .update(memberships)
      .set(values)
      .where(eq(memberships.id, existing.id));
    return existing.id;
  }

  return null;
}

export function membershipStatusLabel(
  status: (typeof membershipStatusEnum.enumValues)[number],
) {
  switch (status) {
    case "trialing":
      return "Free trial";
    case "active":
      return "Active";
    case "past_due":
      return "Payment overdue";
    case "cancelled":
      return "Cancelled";
    default:
      return "Incomplete";
  }
}

export async function countMembershipMembers(membershipId: string) {
  const db = getDb();
  const rows = await db.query.membershipMembers.findMany({
    where: eq(membershipMembers.membershipId, membershipId),
  });
  return rows.length;
}

export async function getMembershipMemberUserIds(membershipId: string) {
  const db = getDb();
  const rows = await db.query.membershipMembers.findMany({
    where: eq(membershipMembers.membershipId, membershipId),
  });
  return rows.map((row) => row.userId);
}

export async function usersHaveBookableMembership(
  tenantId: string,
  userIds: string[],
) {
  if (userIds.length === 0) {
    return new Set<string>();
  }

  const db = getDb();
  const links = await db.query.membershipMembers.findMany({
    where: inArray(membershipMembers.userId, userIds),
    with: {
      membership: true,
    },
  });

  const allowed = new Set<string>();

  for (const link of links) {
    if (
      link.membership.tenantId === tenantId &&
      bookableStatuses.includes(link.membership.status)
    ) {
      allowed.add(link.userId);
    }
  }

  return allowed;
}
