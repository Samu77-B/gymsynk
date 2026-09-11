import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { classes, tenants, trainingPackOptions, trainingTiers } from "@/db/schema";
import { resolveTenantPrimaryColor } from "@/lib/tenant-branding";
import {
  getPublicBookUrl,
  resolveTenantFeatures,
} from "@/lib/tenant-features";

export type PublicPackOption = {
  id: string;
  label: string;
  price: string;
  sessionCount: number | null;
  isPayAsYouGo: boolean;
  note: string | null;
};

export type PublicTrainingTier = {
  id: string;
  name: string;
  subtitle: string | null;
  pricePerClass: string;
  classes: string[];
  packs: PublicPackOption[];
};

export type PublicPackagesPayload = {
  tenant: {
    slug: string;
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    websiteUrl: string | null;
  };
  tiers: PublicTrainingTier[];
  bookUrl: string | null;
};

export async function getPublicPackages(options: {
  tenantSlug: string;
  appUrl: string;
}): Promise<PublicPackagesPayload | null> {
  const db = getDb();

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, options.tenantSlug),
  });

  if (!tenant) {
    return null;
  }

  const features = resolveTenantFeatures(tenant);
  if (!features.sessionPacks) {
    return null;
  }

  const tierRows = await db.query.trainingTiers.findMany({
    where: eq(trainingTiers.tenantId, tenant.id),
    with: {
      packs: {
        orderBy: [asc(trainingPackOptions.sortOrder)],
      },
      classes: true,
    },
    orderBy: [asc(trainingTiers.sortOrder)],
  });

  const activeTiers = tierRows.filter((tier) => tier.active);

  return {
    tenant: {
      slug: tenant.slug,
      name: tenant.name,
      logoUrl: tenant.logoUrl,
      primaryColor: resolveTenantPrimaryColor(tenant),
      websiteUrl: tenant.websiteUrl,
    },
    tiers: activeTiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      subtitle: tier.subtitle,
      pricePerClass: tier.pricePerClass,
      classes: tier.classes
        .map((item) => item.title)
        .sort((a, b) => a.localeCompare(b)),
      packs: tier.packs
        .filter((pack) => pack.active)
        .map((pack) => ({
          id: pack.id,
          label: pack.label,
          price: pack.price,
          sessionCount: pack.sessionCount,
          isPayAsYouGo: pack.isPayAsYouGo,
          note: pack.note,
        })),
    })),
    bookUrl: getPublicBookUrl({
      appUrl: options.appUrl,
      tenantSlug: tenant.slug,
      features,
      externalBookUrl: tenant.externalBookUrl,
    }),
  };
}
