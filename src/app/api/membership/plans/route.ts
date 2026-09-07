import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { membershipPlans } from "@/db/schema";
import { getDefaultTenantSlug, getTenantBySlug } from "@/lib/membership-provision";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantSlug = searchParams.get("tenant") ?? (await getDefaultTenantSlug());

  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant) {
    return Response.json({ error: "Gym not found" }, { status: 404 });
  }

  const db = getDb();

  const plans = await db.query.membershipPlans.findMany({
    where: and(
      eq(membershipPlans.tenantId, tenant.id),
      eq(membershipPlans.active, true),
    ),
    orderBy: [asc(membershipPlans.sortOrder)],
  });

  return Response.json({
    tenant: {
      name: tenant.name,
      slug: tenant.slug,
    },
    plans: plans.map((plan) => ({
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      description: plan.description,
      maxMembers: plan.maxMembers,
      priceMonthly: plan.priceMonthly,
      trialDays: plan.trialDays,
      checkoutEnabled: Boolean(plan.stripePriceId),
    })),
  });
}
