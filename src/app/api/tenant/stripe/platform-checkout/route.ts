import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { tenants, users } from "@/db/schema";
import { jsonError } from "@/lib/api";
import {
  canManageStaff,
  forbiddenResponse,
  getSession,
  unauthorizedResponse,
} from "@/lib/auth";
import { getAppUrl, getStripe } from "@/lib/stripe";
import { getPlatformSubscriptionPriceId } from "@/lib/stripe-connect";

export async function POST() {
  const session = await getSession();

  if (!session) {
    return unauthorizedResponse();
  }

  if (!canManageStaff(session.role)) {
    return forbiddenResponse();
  }

  const priceId = getPlatformSubscriptionPriceId();

  if (!priceId) {
    return jsonError(
      "GymSynk platform billing is not configured yet. Set STRIPE_PRICE_GYMSYNK_PLATFORM.",
      503,
    );
  }

  const db = getDb();
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, session.tenantId),
  });

  if (!tenant) {
    return jsonError("Gym not found", 404);
  }

  const owner = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!owner) {
    return jsonError("User not found", 404);
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: owner.email,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      checkoutKind: "platform_subscription",
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    },
    subscription_data: {
      metadata: {
        checkoutKind: "platform_subscription",
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
      },
    },
    success_url: `${appUrl}/admin/settings?platform=success`,
    cancel_url: `${appUrl}/admin/settings?platform=cancelled`,
  });

  if (!checkoutSession.url) {
    return jsonError("Could not start platform checkout", 500);
  }

  return Response.json({ url: checkoutSession.url });
}
