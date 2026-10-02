import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { trainingPackOptions } from "@/db/schema";
import { parseJson, jsonError } from "@/lib/api";
import { getDefaultTenantSlug, getTenantBySlug } from "@/lib/membership-provision";
import { getAppUrl, getStripe } from "@/lib/stripe";
import { stripeConnectRequestOptions } from "@/lib/stripe-connect";
import {
  resolveBillingModel,
  tenantAcceptsMemberPayments,
} from "@/lib/tenant-billing";
import { resolveTenantFeatures } from "@/lib/tenant-features";

const checkoutSchema = z.object({
  tenantSlug: z.string().min(1).optional(),
  packOptionId: z.string().uuid(),
  fullName: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.string().max(50).optional(),
  packPeriodStart: z.string().datetime().optional(),
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

  const features = resolveTenantFeatures(tenant);
  const billingModel = resolveBillingModel(tenant);

  if (!features.sessionPacks) {
    return jsonError("Session packs are not enabled for this gym", 403);
  }

  if (billingModel === "membership_only") {
    return jsonError(
      "This gym uses memberships only. Join on the membership page.",
      403,
    );
  }

  if (!tenantAcceptsMemberPayments(tenant)) {
    return jsonError(
      "Online payments are not set up for this gym yet. Please contact the gym.",
      503,
    );
  }

  const db = getDb();

  const pack = await db.query.trainingPackOptions.findFirst({
    where: and(
      eq(trainingPackOptions.id, parsed.data.packOptionId),
      eq(trainingPackOptions.tenantId, tenant.id),
      eq(trainingPackOptions.active, true),
    ),
  });

  if (!pack) {
    return jsonError("Credit package not found", 404);
  }

  if (pack.isPayAsYouGo) {
    return jsonError(
      "Pay-as-you-go is charged per class at booking. Choose a session pack instead.",
      400,
    );
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();
  const connectOptions = stripeConnectRequestOptions(tenant);

  const lineItem = pack.stripePriceId
    ? { price: pack.stripePriceId, quantity: 1 }
    : {
        price_data: {
          currency: "gbp",
          unit_amount: Math.round(Number(pack.price) * 100),
          product_data: {
            name: `${pack.label} — ${tenant.name}`,
            metadata: {
              tenantId: tenant.id,
              packOptionId: pack.id,
            },
          },
        },
        quantity: 1,
      };

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: parsed.data.email,
      line_items: [lineItem],
      metadata: {
        checkoutKind: "session_pack",
        tenantId: tenant.id,
        packOptionId: pack.id,
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone ?? "",
        packPeriodStart: parsed.data.packPeriodStart ?? new Date().toISOString(),
      },
      success_url: `${appUrl}/buy/success?session_id={CHECKOUT_SESSION_ID}&tenant=${tenant.slug}`,
      cancel_url: `${appUrl}/buy?tenant=${tenant.slug}&cancelled=1`,
    },
    connectOptions,
  );

  if (!session.url) {
    return jsonError("Could not start checkout", 500);
  }

  return Response.json({ url: session.url });
}
