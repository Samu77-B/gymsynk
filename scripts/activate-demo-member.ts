import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "../src/db/schema";
import {
  membershipMembers,
  membershipPlans,
  memberships,
  tenants,
  users,
} from "../src/db/schema";

config({ path: ".env.local" });

const MEMBER_EMAIL = "member@demo.gymsynk.net";

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing from .env.local");
  }

  const db = drizzle(neon(connectionString), { schema });

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, "demo-gym"),
  });

  if (!tenant) {
    throw new Error("Demo gym not found.");
  }

  const member = await db.query.users.findFirst({
    where: and(eq(users.tenantId, tenant.id), eq(users.email, MEMBER_EMAIL)),
  });

  if (!member) {
    throw new Error(`${MEMBER_EMAIL} not found on Demo Gym.`);
  }

  let plan = await db.query.membershipPlans.findFirst({
    where: and(
      eq(membershipPlans.tenantId, tenant.id),
      eq(membershipPlans.slug, "individual"),
    ),
  });

  if (!plan) {
    [plan] = await db
      .insert(membershipPlans)
      .values({
        tenantId: tenant.id,
        slug: "individual",
        name: "Individual",
        description: "Full gym access for one member.",
        maxMembers: 1,
        priceMonthly: "49.00",
        trialDays: 0,
        sortOrder: 1,
      })
      .returning();
  }

  const existingLink = await db.query.membershipMembers.findFirst({
    where: eq(membershipMembers.userId, member.id),
    with: { membership: true },
  });

  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  if (existingLink?.membership) {
    await db
      .update(memberships)
      .set({
        status: "active",
        startDate: existingLink.membership.startDate ?? new Date(),
        currentPeriodEnd: periodEnd,
      })
      .where(eq(memberships.id, existingLink.membership.id));

    console.log(`Membership set to active for ${member.email}.`);
    return;
  }

  const [membership] = await db
    .insert(memberships)
    .values({
      tenantId: tenant.id,
      planId: plan.id,
      primaryUserId: member.id,
      stripeCustomerId: "cus_demo_jordan",
      stripeSubscriptionId: "sub_demo_jordan",
      status: "active",
      startDate: new Date(),
      currentPeriodEnd: periodEnd,
    })
    .returning();

  await db.insert(membershipMembers).values({
    membershipId: membership.id,
    userId: member.id,
    isPrimary: true,
  });

  console.log(`Active Individual membership added for ${member.email}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
