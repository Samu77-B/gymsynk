import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { tenants } from "@/db/schema";
import { resolvePublicBookUrl } from "@/lib/tenant-website";

export type TenantFeatures = {
  memberships: boolean;
  classBooking: boolean;
  sessionPacks: boolean;
};

export type TenantFeatureKey = keyof TenantFeatures;

export const TENANT_FEATURE_LABELS: Record<
  TenantFeatureKey,
  { title: string; description: string; comingSoon?: boolean }
> = {
  memberships: {
    title: "Monthly memberships",
    description:
      "Online join flow, Stripe subscriptions, and the membership page for members.",
  },
  classBooking: {
    title: "Class booking",
    description:
      "Members and staff can book scheduled classes from the dashboard.",
  },
  sessionPacks: {
    title: "Session packs & tiers",
    description:
      "Tiered class packs, pay-as-you-go, and credit-based booking (Reset-style pricing).",
    comingSoon: true,
  },
};

export function resolveTenantFeatures(tenant: {
  featureMemberships: boolean;
  featureClassBooking: boolean;
  featureSessionPacks: boolean;
}): TenantFeatures {
  return {
    memberships: tenant.featureMemberships,
    classBooking: tenant.featureClassBooking,
    sessionPacks: tenant.featureSessionPacks,
  };
}

export async function getTenantFeatures(
  slug: string,
): Promise<TenantFeatures | null> {
  const tenant = await getDb().query.tenants.findFirst({
    where: eq(tenants.slug, slug),
    columns: {
      featureMemberships: true,
      featureClassBooking: true,
      featureSessionPacks: true,
    },
  });

  if (!tenant) {
    return null;
  }

  return resolveTenantFeatures(tenant);
}

export async function getTenantFeaturesById(
  tenantId: string,
): Promise<TenantFeatures | null> {
  const tenant = await getDb().query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: {
      featureMemberships: true,
      featureClassBooking: true,
      featureSessionPacks: true,
    },
  });

  if (!tenant) {
    return null;
  }

  return resolveTenantFeatures(tenant);
}

export function getPublicBookUrl(options: {
  appUrl: string;
  tenantSlug: string;
  features: TenantFeatures;
  externalBookUrl?: string | null;
}) {
  return resolvePublicBookUrl(options);
}
