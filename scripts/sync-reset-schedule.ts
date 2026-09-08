import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "../src/db/schema";
import { classes, classSchedules, tenants, users } from "../src/db/schema";
import {
  buildResetScheduleInserts,
  resetClassInsertValues,
} from "./reset-weekly-schedule";

config({ path: ".env.local" });

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing from .env.local");
  }

  const db = drizzle(neon(connectionString), { schema });

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, "reset"),
  });

  if (!tenant) {
    throw new Error(
      "Reset tenant not found. Run npm run db:seed-reset first.",
    );
  }

  const trainer =
    (await db.query.users.findFirst({
      where: and(eq(users.tenantId, tenant.id), eq(users.role, "trainer")),
    })) ??
    (await db.query.users.findFirst({
      where: and(eq(users.tenantId, tenant.id), eq(users.role, "admin")),
    }));

  console.log("Replacing Reset class types and weekly schedule...");

  await db.delete(classSchedules).where(eq(classSchedules.tenantId, tenant.id));
  await db.delete(classes).where(eq(classes.tenantId, tenant.id));

  const insertedClasses = await db
    .insert(classes)
    .values(resetClassInsertValues(tenant.id))
    .returning();

  const classIdByTitle = new Map(
    insertedClasses.map((item) => [item.title, item.id]),
  );

  const scheduleRows = buildResetScheduleInserts({
    tenantId: tenant.id,
    classIdByTitle,
    trainerId: trainer?.id ?? null,
    weeksAhead: 4,
  });

  await db.insert(classSchedules).values(scheduleRows);

  console.log(
    `Reset schedule synced: ${insertedClasses.length} class types, ${scheduleRows.length} sessions (4 weeks).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
