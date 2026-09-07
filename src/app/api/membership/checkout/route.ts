import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { membershipPlans } from "@/db/schema";
import { parseJson, jsonError } from "@/lib/api";
import {
  getDefaultTenantSlug,
  getTenantBySlug,
} from "@/lib/membership-provision";
import { getAppUrl, getStripe } from "@/lib/stripe";

const checkoutSchema = z.object({
  tenantSlug: z.string().min(1).optional(),
  planId: z.string().uuid(),
  fullName: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = parseJson(checkoutSchema, body);

  if (!parsed.success) {
    return parsed.response;
  }

  const tenantSlug =
    parsed.data.tenantSlug ?? (await getDefaultTenantSlug());
  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant) {
    return jsonError("Gym not found", 404);
  }

  const db = getDb();

  const plan = await db.query.membershipPlans.findFirst({
    where: and(
      eq(membershipPlans.id, parsed.data.planId),
      eq(membershipPlans.tenantId, tenant.id),
      eq(membershipPlans.active, true),
    ),
  });

  if (!plan) {
    return jsonError("Membership plan not found", 404);
  }

  if (!plan.stripePriceId) {
    return jsonError(
      "Online signup is not configured for this plan yet. Contact the gym.",
      503,
    );
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: parsed.data.email,
    line_items: [
      {
        price: plan.stripePriceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: plan.trialDays,
      metadata: {
        tenantId: tenant.id,
        planId: plan.id,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
      },
    },
    metadata: {
      tenantId: tenant.id,
      planId: plan.id,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone ?? "",
    },
    success_url: `${appUrl}/join/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/join?tenant=${tenant.slug}&cancelled=1`,
  });

  if (!session.url) {
    return jsonError("Could not start checkout", 500);
  }

  return Response.json({ url: session.url });
}
