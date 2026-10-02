import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";

import { getDb } from "@/db";
import { tenants, users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import {
  getTenantBySlug,
  provisionMembershipFromCheckout,
} from "@/lib/membership-provision";
import { provisionPackFromCheckout } from "@/lib/pack-provision";
import {
  retrieveCheckoutSession,
  syncPlatformSubscription,
} from "@/lib/stripe-connect";
import { resolveBillingModel } from "@/lib/tenant-billing";

async function loadCheckoutSession(sessionId: string, tenantSlug?: string) {
  if (tenantSlug) {
    const tenant = await getTenantBySlug(tenantSlug);

    if (tenant?.stripeConnectAccountId) {
      try {
        return await retrieveCheckoutSession(
          sessionId,
          tenant.stripeConnectAccountId,
        );
      } catch {
        // Fall through to platform retrieve (platform subscription checkout).
      }
    }
  }

  return retrieveCheckoutSession(sessionId);
}

export async function completeCheckoutSession(
  sessionId: string,
  tenantSlug?: string,
) {
  const db = getDb();
  const session = await loadCheckoutSession(sessionId, tenantSlug);
  const tenantId = session.metadata?.tenantId;

  const tenant = tenantId
    ? await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) })
    : tenantSlug
      ? await getTenantBySlug(tenantSlug)
      : null;

  if (session.status !== "complete") {
    throw new Error("Checkout is not complete yet");
  }

  const checkoutKind = session.metadata?.checkoutKind;

  if (checkoutKind === "platform_subscription") {
    const subscriptionRef = session.subscription;
    if (subscriptionRef && tenant) {
      const subscriptionId =
        typeof subscriptionRef === "string"
          ? subscriptionRef
          : subscriptionRef.id;
      await db
        .update(tenants)
        .set({ stripePlatformSubscriptionId: subscriptionId })
        .where(eq(tenants.id, tenant.id));
    }

    return {
      kind: "platform_subscription" as const,
      redirectTo: "/admin/settings?platform=success",
    };
  }

  if (checkoutKind === "session_pack") {
    await provisionPackFromCheckout(session);

    const email =
      session.customer_details?.email ??
      session.customer_email ??
      session.metadata?.email;

    if (!tenantId || !email) {
      throw new Error("Could not resolve member account");
    }

    const user = await db.query.users.findFirst({
      where: and(eq(users.tenantId, tenantId), eq(users.email, email)),
    });

    if (!user || !tenant) {
      throw new Error("Member account not found");
    }

    await createSession({
      userId: user.id,
      tenantId: tenant.id,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
      tenantSlug: tenant.slug,
    });

    return {
      kind: "session_pack" as const,
      redirectTo: "/member/book",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
    };
  }

  if (session.mode !== "subscription") {
    throw new Error("Invalid checkout session");
  }

  await provisionMembershipFromCheckout(session);

  const email =
    session.customer_details?.email ??
    session.customer_email ??
    session.metadata?.email;

  if (!tenantId || !email) {
    throw new Error("Could not resolve member account");
  }

  const user = await db.query.users.findFirst({
    where: and(eq(users.tenantId, tenantId), eq(users.email, email)),
  });

  if (!user || !tenant) {
    throw new Error("Member account not found");
  }

  await createSession({
    userId: user.id,
    tenantId: tenant.id,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
    tenantSlug: tenant.slug,
  });

  const billing = tenant ? resolveBillingModel(tenant) : "membership_only";

  return {
    kind: "membership" as const,
    redirectTo:
      billing === "credits_only" ? "/member/book" : "/member/membership",
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    },
  };
}

export async function handleStripeCheckoutCompleted(
  session: Stripe.Checkout.Session,
) {
  const checkoutKind = session.metadata?.checkoutKind;

  if (checkoutKind === "platform_subscription") {
    const subscriptionRef = session.subscription;
    if (subscriptionRef) {
      const { getStripe } = await import("@/lib/stripe");
      const stripe = getStripe();
      const subscriptionId =
        typeof subscriptionRef === "string"
          ? subscriptionRef
          : subscriptionRef.id;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      await syncPlatformSubscription(subscription);
    }
    return;
  }

  if (checkoutKind === "session_pack") {
    await provisionPackFromCheckout(session);
    return;
  }

  if (session.mode === "subscription") {
    await provisionMembershipFromCheckout(session);
  }
}
