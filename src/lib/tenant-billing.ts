import { eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import type { tenants } from "@/db/schema";
import { tenants as tenantsTable } from "@/db/schema";

export type BillingModel = "credits_only" | "membership_only" | "hybrid";

export const BILLING_MODEL_LABELS: Record<
  BillingModel,
  { title: string; description: string }
> = {
  credits_only: {
    title: "Credits only",
    description:
      "No monthly membership plans. Clients buy session credit packages, keep their login, and top up when they run low.",
  },
  membership_only: {
    title: "Membership only",
    description:
      "Clients join on a monthly membership plan. Class booking uses membership access (packs optional off).",
  },
  hybrid: {
    title: "Membership + credits",
    description:
      "Clients need an active membership and session credits to book classes (membership for access, packs for class payment).",
  },
};

export type TenantBillingRow = Pick<
  typeof tenants.$inferSelect,
  | "billingModel"
  | "creditRollover"
  | "featureMemberships"
  | "featureSessionPacks"
  | "featureClassBooking"
  | "stripeConnectAccountId"
  | "stripeConnectChargesEnabled"
  | "stripeConnectDetailsSubmitted"
  | "stripePlatformSubscriptionId"
  | "stripePlatformSubscriptionStatus"
>;

export function billingModelUsesCredits(model: BillingModel) {
  return model === "credits_only" || model === "hybrid";
}

export const CREDIT_ROLLOVER_LABELS = {
  rollover: {
    title: "Roll over unused credits",
    description:
      "Leftover sessions at the end of each month are added to the next month’s balance.",
  },
  expire: {
    title: "Expire each month",
    description:
      "Each month starts with a fresh allowance. Unused sessions do not carry over.",
  },
} as const;

export function creditPolicySummary(creditRollover: boolean) {
  return creditRollover
    ? CREDIT_ROLLOVER_LABELS.rollover.description
    : CREDIT_ROLLOVER_LABELS.expire.description;
}

export function resolveBillingModel(
  tenant: Pick<typeof tenants.$inferSelect, "billingModel">,
): BillingModel {
  return tenant.billingModel;
}

/** Feature flags aligned with the selected billing model. */
export function featureFlagsForBillingModel(model: BillingModel): {
  featureMemberships: boolean;
  featureSessionPacks: boolean;
} {
  switch (model) {
    case "credits_only":
      return { featureMemberships: false, featureSessionPacks: true };
    case "membership_only":
      return { featureMemberships: true, featureSessionPacks: false };
    case "hybrid":
      return { featureMemberships: true, featureSessionPacks: true };
  }
}

export function tenantAcceptsMemberPayments(tenant: TenantBillingRow) {
  if (process.env.STRIPE_CONNECT_OPTIONAL === "true") {
    return true;
  }

  return Boolean(
    tenant.stripeConnectAccountId && tenant.stripeConnectChargesEnabled,
  );
}

export async function getTenantBillingModel(slug: string) {
  const tenant = await getDb().query.tenants.findFirst({
    where: eq(tenantsTable.slug, slug),
    columns: { billingModel: true },
  });

  return tenant ? resolveBillingModel(tenant) : null;
}

export async function getCreditRolloverForTenants(tenantIds: string[]) {
  const unique = [...new Set(tenantIds)];

  if (unique.length === 0) {
    return new Map<string, boolean>();
  }

  const rows = await getDb()
    .select({
      id: tenantsTable.id,
      creditRollover: tenantsTable.creditRollover,
    })
    .from(tenantsTable)
    .where(inArray(tenantsTable.id, unique));

  return new Map(rows.map((row) => [row.id, row.creditRollover]));
}

export function serializeStripeConnectStatus(tenant: TenantBillingRow) {
  return {
    accountId: tenant.stripeConnectAccountId,
    chargesEnabled: tenant.stripeConnectChargesEnabled,
    detailsSubmitted: tenant.stripeConnectDetailsSubmitted,
    readyForPayments: tenantAcceptsMemberPayments(tenant),
    platformSubscriptionId: tenant.stripePlatformSubscriptionId,
    platformSubscriptionStatus: tenant.stripePlatformSubscriptionStatus,
  };
}
