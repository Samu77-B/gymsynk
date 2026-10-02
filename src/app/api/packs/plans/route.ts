import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { trainingPackOptions, trainingTiers } from "@/db/schema";
import { getDefaultTenantSlug, getTenantBySlug } from "@/lib/membership-provision";
import {
  creditPolicySummary,
  resolveBillingModel,
} from "@/lib/tenant-billing";
import { resolveTenantFeatures } from "@/lib/tenant-features";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantSlug = searchParams.get("tenant") ?? (await getDefaultTenantSlug());

  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant) {
    return Response.json({ error: "Gym not found" }, { status: 404 });
  }

  const features = resolveTenantFeatures(tenant);
  const billingModel = resolveBillingModel(tenant);

  if (!features.sessionPacks) {
    return Response.json(
      { error: "Session packs are not enabled for this gym" },
      { status: 403 },
    );
  }

  const db = getDb();

  const tiers = await db.query.trainingTiers.findMany({
    where: eq(trainingTiers.tenantId, tenant.id),
    with: {
      packs: {
        where: eq(trainingPackOptions.active, true),
        orderBy: [asc(trainingPackOptions.sortOrder)],
      },
    },
    orderBy: [asc(trainingTiers.sortOrder)],
  });

  return Response.json({
    tenant: { name: tenant.name, slug: tenant.slug },
    billingModel,
    creditRollover: tenant.creditRollover,
    creditPolicy: creditPolicySummary(tenant.creditRollover),
    features,
    tiers: tiers
      .filter((tier) => tier.active)
      .map((tier) => ({
        id: tier.id,
        name: tier.name,
        subtitle: tier.subtitle,
        pricePerClass: tier.pricePerClass,
        packs: tier.packs
          .filter((pack) => !pack.isPayAsYouGo)
          .map((pack) => ({
            id: pack.id,
            label: pack.label,
            price: pack.price,
            sessionCount: pack.sessionCount,
            note: pack.note,
            checkoutEnabled: true,
          })),
      })),
  });
}
