import { config } from "dotenv";
import { addDays, setHours, setMinutes } from "date-fns";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "../src/db/schema";
import {
  classes,
  classSchedules,
  membershipPlans,
  staffShifts,
  tenants,
  users,
} from "../src/db/schema";

config({ path: ".env.local" });

function addMinutes(date: Date, minutes: number) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing from .env.local");
  }

  const db = drizzle(neon(connectionString), { schema });

  const existingTenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, "reset"),
  });

  if (existingTenant) {
    console.log("Reset tenant already exists. Skipping seed.");
    return;
  }

  const [tenant] = await db
    .insert(tenants)
    .values({ name: "Reset", slug: "reset" })
    .returning();

  const [owner, admin, trainer] = await db
    .insert(users)
    .values([
      {
        tenantId: tenant.id,
        fullName: "Reset Owner",
        email: "owner@reset.gymsynk.net",
        role: "owner",
      },
      {
        tenantId: tenant.id,
        fullName: "Reset Admin",
        email: "admin@reset.gymsynk.net",
        role: "admin",
      },
      {
        tenantId: tenant.id,
        fullName: "Reset Trainer",
        email: "trainer@reset.gymsynk.net",
        role: "trainer",
      },
    ])
    .returning();

  await db.insert(membershipPlans).values([
    {
      tenantId: tenant.id,
      slug: "individual",
      name: "Individual",
      description: "Full gym access for one member.",
      maxMembers: 1,
      priceMonthly: "49.00",
      trialDays: 30,
      stripePriceId: process.env.STRIPE_PRICE_RESET_INDIVIDUAL ?? null,
      sortOrder: 1,
    },
    {
      tenantId: tenant.id,
      slug: "couples",
      name: "Couples",
      description: "Two members on one membership — perfect for partners.",
      maxMembers: 2,
      priceMonthly: "79.00",
      trialDays: 30,
      stripePriceId: process.env.STRIPE_PRICE_RESET_COUPLES ?? null,
      sortOrder: 2,
    },
    {
      tenantId: tenant.id,
      slug: "family",
      name: "Family",
      description: "Up to four family members on one membership.",
      maxMembers: 4,
      priceMonthly: "99.00",
      trialDays: 30,
      stripePriceId: process.env.STRIPE_PRICE_RESET_FAMILY ?? null,
      sortOrder: 3,
    },
  ]);

  const [strength, hiit, yoga, pilates] = await db
    .insert(classes)
    .values([
      {
        tenantId: tenant.id,
        title: "Strength & Tone",
        description: "Weights and resistance training",
        capacity: 12,
        durationMinutes: 45,
        price: "0.00",
      },
      {
        tenantId: tenant.id,
        title: "HIIT",
        description: "High intensity interval training",
        capacity: 14,
        durationMinutes: 45,
        price: "0.00",
      },
      {
        tenantId: tenant.id,
        title: "Yoga Flow",
        description: "Mobility, strength, and recovery",
        capacity: 16,
        durationMinutes: 60,
        price: "0.00",
      },
      {
        tenantId: tenant.id,
        title: "Pilates",
        description: "Core-focused reformer-style floor work",
        capacity: 12,
        durationMinutes: 50,
        price: "0.00",
      },
    ])
    .returning();

  const tomorrowMorning = setMinutes(setHours(addDays(new Date(), 1), 6), 30);
  const tomorrowMidday = setMinutes(setHours(addDays(new Date(), 1), 12), 0);
  const dayAfterEvening = setMinutes(setHours(addDays(new Date(), 2), 18), 0);
  const weekendMorning = setMinutes(setHours(addDays(new Date(), 3), 9), 30);

  await db.insert(classSchedules).values([
    {
      tenantId: tenant.id,
      classId: hiit.id,
      trainerId: trainer.id,
      startTime: tomorrowMorning,
      endTime: addMinutes(tomorrowMorning, hiit.durationMinutes),
    },
    {
      tenantId: tenant.id,
      classId: strength.id,
      trainerId: trainer.id,
      startTime: tomorrowMidday,
      endTime: addMinutes(tomorrowMidday, strength.durationMinutes),
    },
    {
      tenantId: tenant.id,
      classId: yoga.id,
      trainerId: admin.id,
      startTime: dayAfterEvening,
      endTime: addMinutes(dayAfterEvening, yoga.durationMinutes),
    },
    {
      tenantId: tenant.id,
      classId: pilates.id,
      trainerId: trainer.id,
      startTime: weekendMorning,
      endTime: addMinutes(weekendMorning, pilates.durationMinutes),
    },
  ]);

  await db.insert(staffShifts).values([
    {
      tenantId: tenant.id,
      staffId: trainer.id,
      shiftStart: setMinutes(setHours(addDays(new Date(), 1), 6), 0),
      shiftEnd: setMinutes(setHours(addDays(new Date(), 1), 14), 0),
      roleAssigned: "Floor trainer",
    },
    {
      tenantId: tenant.id,
      staffId: admin.id,
      shiftStart: setMinutes(setHours(addDays(new Date(), 2), 10), 0),
      shiftEnd: setMinutes(setHours(addDays(new Date(), 2), 18), 0),
      roleAssigned: "Front desk",
    },
  ]);

  void owner;

  console.log("Reset seed complete.");
  console.log("Tenant slug: reset");
  console.log("Staff login emails:");
  console.log("  owner@reset.gymsynk.net");
  console.log("  admin@reset.gymsynk.net");
  console.log("  trainer@reset.gymsynk.net");
  console.log("");
  console.log("Public join URL: /join?tenant=reset");
  console.log("");
  if (
    !process.env.STRIPE_PRICE_RESET_INDIVIDUAL ||
    !process.env.STRIPE_PRICE_RESET_COUPLES ||
    !process.env.STRIPE_PRICE_RESET_FAMILY
  ) {
    console.log(
      "Note: set STRIPE_PRICE_RESET_* in .env.local to enable online checkout.",
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
