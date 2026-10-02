import type Stripe from "stripe";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { tenants } from "@/db/schema";
import { getAppUrl, getStripe, mapStripeSubscriptionStatus } from "@/lib/stripe";

export function getPlatformSubscriptionPriceId() {
  return process.env.STRIPE_PRICE_GYMSYNK_PLATFORM?.trim() || null;
}

export type StripeConnectRequestOptions = {
  stripeAccount?: string;
};

export function stripeConnectRequestOptions(
  tenant: Pick<
    typeof tenants.$inferSelect,
    "stripeConnectAccountId" | "stripeConnectChargesEnabled"
  >,
): StripeConnectRequestOptions {
  if (
    tenant.stripeConnectAccountId &&
    tenant.stripeConnectChargesEnabled
  ) {
    return { stripeAccount: tenant.stripeConnectAccountId };
  }

  return {};
}

export async function syncConnectAccountStatus(accountId: string) {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);

  const db = getDb();
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.stripeConnectAccountId, accountId),
  });

  if (!tenant) {
    return null;
  }

  const chargesEnabled = Boolean(account.charges_enabled);
  const detailsSubmitted = Boolean(account.details_submitted);

  const [updated] = await db
    .update(tenants)
    .set({
      stripeConnectChargesEnabled: chargesEnabled,
      stripeConnectDetailsSubmitted: detailsSubmitted,
    })
    .where(eq(tenants.id, tenant.id))
    .returning();

  return updated;
}

export async function ensureConnectAccount(tenantId: string) {
  const db = getDb();
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant) {
    throw new Error("Gym not found");
  }

  if (tenant.stripeConnectAccountId) {
    return tenant;
  }

  const stripe = getStripe();

  const account = await stripe.accounts.create({
    type: "express",
    country: "GB",
    metadata: { tenantId: tenant.id, tenantSlug: tenant.slug },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  const [updated] = await db
    .update(tenants)
    .set({ stripeConnectAccountId: account.id })
    .where(eq(tenants.id, tenant.id))
    .returning();

  return updated;
}

export async function createConnectOnboardingLink(tenantId: string) {
  const tenant = await ensureConnectAccount(tenantId);

  if (!tenant.stripeConnectAccountId) {
    throw new Error("Could not create Stripe Connect account");
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();

  const link = await stripe.accountLinks.create({
    account: tenant.stripeConnectAccountId,
    refresh_url: `${appUrl}/admin/settings?stripe=refresh`,
    return_url: `${appUrl}/admin/settings?stripe=return`,
    type: "account_onboarding",
  });

  return link.url;
}

export async function createConnectDashboardLink(tenantId: string) {
  const db = getDb();
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant?.stripeConnectAccountId) {
    throw new Error("Stripe Connect is not set up for this gym");
  }

  const stripe = getStripe();
  const login = await stripe.accounts.createLoginLink(
    tenant.stripeConnectAccountId,
  );

  return login.url;
}

export async function syncPlatformSubscription(
  subscription: Stripe.Subscription,
) {
  const tenantId = subscription.metadata?.tenantId;

  const db = getDb();

  const tenant =
    tenantId != null
      ? await db.query.tenants.findFirst({
          where: eq(tenants.id, tenantId),
        })
      : await db.query.tenants.findFirst({
          where: eq(
            tenants.stripePlatformSubscriptionId,
            subscription.id,
          ),
        });

  if (!tenant) {
    return null;
  }

  if (
    subscription.metadata?.checkoutKind !== "platform_subscription" &&
    tenant.stripePlatformSubscriptionId !== subscription.id
  ) {
    return null;
  }

  const status = mapStripeSubscriptionStatus(subscription.status);

  const [updated] = await db
    .update(tenants)
    .set({
      stripePlatformSubscriptionId: subscription.id,
      stripePlatformSubscriptionStatus: status,
    })
    .where(eq(tenants.id, tenant.id))
    .returning();

  return updated;
}

export async function retrieveCheckoutSession(
  sessionId: string,
  connectAccountId?: string | null,
) {
  const stripe = getStripe();
  const options = connectAccountId
    ? { stripeAccount: connectAccountId }
    : undefined;

  return stripe.checkout.sessions.retrieve(
    sessionId,
    { expand: ["subscription", "line_items"] },
    options,
  );
}
