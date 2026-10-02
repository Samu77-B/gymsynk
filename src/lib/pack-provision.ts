import { addMonths } from "date-fns";
import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";

import { getDb } from "@/db";
import {
  memberPacks,
  memberProfiles,
  trainingPackOptions,
  users,
} from "@/db/schema";
import { ensureMemberNumber } from "@/lib/member-number";

export async function provisionPackFromCheckout(
  session: Stripe.Checkout.Session,
) {
  const tenantId = session.metadata?.tenantId;
  const packOptionId = session.metadata?.packOptionId;
  const fullName = session.metadata?.fullName;
  const phone = session.metadata?.phone || null;
  const email =
    session.customer_details?.email ??
    session.customer_email ??
    session.metadata?.email;

  const customerRef = session.customer;
  const customerId =
    customerRef == null
      ? null
      : typeof customerRef === "string"
        ? customerRef
        : customerRef.id;

  if (!tenantId || !packOptionId || !fullName || !email) {
    throw new Error("Checkout session is missing required pack metadata");
  }

  const db = getDb();

  const option = await db.query.trainingPackOptions.findFirst({
    where: and(
      eq(trainingPackOptions.id, packOptionId),
      eq(trainingPackOptions.tenantId, tenantId),
    ),
    with: { tier: true },
  });

  if (!option) {
    throw new Error("Pack option not found for checkout session");
  }

  if (option.isPayAsYouGo) {
    throw new Error("Pay-as-you-go packs cannot be purchased as a bundle");
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
        stripeCustomerId: customerId ?? user.stripeCustomerId,
        role: user.role === "member" ? "member" : user.role,
      })
      .where(eq(users.id, user.id))
      .returning();
  }

  const periodStartRaw = session.metadata?.packPeriodStart;
  const periodStart = periodStartRaw
    ? new Date(periodStartRaw)
    : new Date();

  if (Number.isNaN(periodStart.getTime())) {
    throw new Error("Invalid pack period start in checkout metadata");
  }

  const [pack] = await db
    .insert(memberPacks)
    .values({
      tenantId,
      userId: user.id,
      tierId: option.tierId,
      packOptionId: option.id,
      label: option.label,
      sessionsPerPeriod: option.sessionCount,
      price: option.price,
      source: "stripe",
      currentPeriodStart: periodStart,
      currentPeriodEnd: addMonths(periodStart, 1),
      notes: session.id ? `Stripe checkout ${session.id}` : null,
    })
    .returning();

  const existingProfile = await db.query.memberProfiles.findFirst({
    where: eq(memberProfiles.userId, user.id),
  });

  if (!existingProfile) {
    await db.insert(memberProfiles).values({
      tenantId,
      userId: user.id,
      legalName: fullName,
      termsAcceptedAt: new Date(),
    });
  }

  await ensureMemberNumber(tenantId, user.id);

  return { user, pack, created: true as const };
}
