import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";

import { getDb } from "@/db";
import {
  membershipMembers,
  membershipPlans,
  memberships,
  tenants,
  users,
} from "@/db/schema";
import { getStripe, mapStripeSubscriptionStatus } from "@/lib/stripe";
import {
  getInvoiceSubscriptionId,
  getSubscriptionPeriodEnd,
  getSubscriptionTrialEnd,
} from "@/lib/stripe-subscription";

export async function provisionMembershipFromCheckout(
  session: Stripe.Checkout.Session,
) {
  const tenantId = session.metadata?.tenantId;
  const planId = session.metadata?.planId;
  const fullName = session.metadata?.fullName;
  const phone = session.metadata?.phone || null;
  const email =
    session.customer_details?.email ??
    session.customer_email ??
    session.metadata?.email;

  const subscriptionRef = session.subscription;
  const customerRef = session.customer;

  if (
    !tenantId ||
    !planId ||
    !fullName ||
    !email ||
    !subscriptionRef ||
    !customerRef
  ) {
    throw new Error("Checkout session is missing required membership metadata");
  }

  const subscriptionId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef.id;
  const customerId =
    typeof customerRef === "string" ? customerRef : customerRef.id;

  const db = getDb();

  const existingMembership = await db.query.memberships.findFirst({
    where: eq(memberships.stripeSubscriptionId, subscriptionId),
  });

  if (existingMembership) {
    return existingMembership;
  }

  const plan = await db.query.membershipPlans.findFirst({
    where: and(
      eq(membershipPlans.id, planId),
      eq(membershipPlans.tenantId, tenantId),
    ),
  });

  if (!plan) {
    throw new Error("Membership plan not found for checkout session");
  }

  let user = await db.query.users.findFirst({
    where: and(eq(users.tenantId, tenantId), eq(users.email, email)),
  });

  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        tenantId,
        fullName,
        email,
        phone,
        role: "member",
        stripeCustomerId: customerId,
      })
      .returning();
  } else {
    [user] = await db
      .update(users)
      .set({
        fullName,
        phone: phone ?? user.phone,
        stripeCustomerId: customerId,
        role: user.role === "member" ? "member" : user.role,
      })
      .where(eq(users.id, user.id))
      .returning();
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const status = mapStripeSubscriptionStatus(subscription.status);

  const [membership] = await db
    .insert(memberships)
    .values({
      tenantId,
      planId: plan.id,
      primaryUserId: user.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status,
      trialEndsAt: getSubscriptionTrialEnd(subscription),
      currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
    })
    .returning();

  const existingLink = await db.query.membershipMembers.findFirst({
    where: and(
      eq(membershipMembers.membershipId, membership.id),
      eq(membershipMembers.userId, user.id),
    ),
  });

  if (!existingLink) {
    await db.insert(membershipMembers).values({
      membershipId: membership.id,
      userId: user.id,
      isPrimary: true,
    });
  }

  return membership;
}

export async function syncSubscription(subscription: Stripe.Subscription) {
  const db = getDb();
  const status = mapStripeSubscriptionStatus(subscription.status);
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const values = {
    stripeCustomerId: customerId,
    status,
    trialEndsAt: getSubscriptionTrialEnd(subscription),
    currentPeriodEnd: getSubscriptionPeriodEnd(subscription),
  };

  await db
    .update(memberships)
    .set(values)
    .where(eq(memberships.stripeSubscriptionId, subscription.id));
}

export async function getDefaultTenantSlug() {
  return process.env.DEFAULT_TENANT_SLUG?.trim() || "reset";
}

export async function getTenantBySlug(slug: string) {
  const db = getDb();
  return db.query.tenants.findFirst({
    where: eq(tenants.slug, slug),
  });
}
