import { config } from "dotenv";
import { addDays, setHours, setMinutes } from "date-fns";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "../src/db/schema";
import {
  bookings,
  classes,
  classSchedules,
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
    where: eq(tenants.slug, "demo-gym"),
  });

  if (existingTenant) {
    console.log("Demo tenant already exists. Skipping seed.");
    return;
  }

  const [tenant] = await db
    .insert(tenants)
    .values({ name: "Demo Gym", slug: "demo-gym" })
    .returning();

  const [owner, admin, trainer, member] = await db
    .insert(users)
    .values([
      {
        tenantId: tenant.id,
        fullName: "Alex Owner",
        email: "owner@demo.gymsynk.net",
        role: "owner",
      },
      {
        tenantId: tenant.id,
        fullName: "Sam Admin",
        email: "admin@demo.gymsynk.net",
        role: "admin",
      },
      {
        tenantId: tenant.id,
        fullName: "Taylor Trainer",
        email: "trainer@demo.gymsynk.net",
        role: "trainer",
      },
      {
        tenantId: tenant.id,
        fullName: "Jordan Member",
        email: "member@demo.gymsynk.net",
        role: "member",
      },
    ])
    .returning();

  void owner;

  const [hiit, yoga, spin] = await db
    .insert(classes)
    .values([
      {
        tenantId: tenant.id,
        title: "HIIT Burn",
        description: "High intensity interval training",
        capacity: 12,
        durationMinutes: 45,
        price: "15.00",
      },
      {
        tenantId: tenant.id,
        title: "Morning Yoga",
        description: "Flow and mobility",
        capacity: 20,
        durationMinutes: 60,
        price: "12.00",
      },
      {
        tenantId: tenant.id,
        title: "Spin Cycle",
        description: "Indoor cycling session",
        capacity: 15,
        durationMinutes: 45,
        price: "14.00",
      },
    ])
    .returning();

  const tomorrowMorning = setMinutes(setHours(addDays(new Date(), 1), 7), 0);
  const tomorrowEvening = setMinutes(setHours(addDays(new Date(), 2), 18), 30);
  const weekendMorning = setMinutes(setHours(addDays(new Date(), 3), 9), 0);

  const scheduleRows = await db
    .insert(classSchedules)
    .values([
      {
        tenantId: tenant.id,
        classId: hiit.id,
        trainerId: trainer.id,
        startTime: tomorrowMorning,
        endTime: addMinutes(tomorrowMorning, hiit.durationMinutes),
      },
      {
        tenantId: tenant.id,
        classId: yoga.id,
        trainerId: trainer.id,
        startTime: tomorrowEvening,
        endTime: addMinutes(tomorrowEvening, yoga.durationMinutes),
      },
      {
        tenantId: tenant.id,
        classId: spin.id,
        trainerId: admin.id,
        startTime: weekendMorning,
        endTime: addMinutes(weekendMorning, spin.durationMinutes),
      },
    ])
    .returning();

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
      shiftStart: setMinutes(setHours(addDays(new Date(), 2), 12), 0),
      shiftEnd: setMinutes(setHours(addDays(new Date(), 2), 20), 0),
      roleAssigned: "Front desk",
    },
  ]);

  await db.insert(bookings).values({
    tenantId: tenant.id,
    scheduleId: scheduleRows[0].id,
    memberId: member.id,
    bookingStatus: "confirmed",
    paymentStatus: "paid",
  });

  console.log("Seed complete.");
  console.log("Tenant slug: demo-gym");
  console.log("Login emails:");
  console.log("  owner@demo.gymsynk.net");
  console.log("  admin@demo.gymsynk.net");
  console.log("  trainer@demo.gymsynk.net");
  console.log("  member@demo.gymsynk.net");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
