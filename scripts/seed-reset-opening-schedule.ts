import { config } from "dotenv";
import { and, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { endOfDay, parseISO, startOfDay } from "date-fns";

import * as schema from "../src/db/schema";
import { classSchedules, classes, tenants, users } from "../src/db/schema";
import {
  buildResetScheduleInserts,
  resetClassInsertValues,
} from "../src/lib/reset-weekly-schedule";

config({ path: ".env.local" });

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing from .env.local");
  }

  const fromRaw =
    process.env.RESET_SCHEDULE_FROM?.trim() ?? "2026-11-02";
  const weeksAhead = Number(process.env.RESET_SCHEDULE_WEEKS ?? "8");
  const replaceRange = process.env.RESET_SCHEDULE_REPLACE !== "false";

  const fromDate = startOfDay(parseISO(fromRaw));

  if (Number.isNaN(fromDate.getTime())) {
    throw new Error(`Invalid RESET_SCHEDULE_FROM: ${fromRaw}`);
  }

  const db = drizzle(neon(connectionString), { schema });

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, "reset"),
  });

  if (!tenant) {
    throw new Error("Reset tenant not found. Run npm run db:seed-reset first.");
  }

  const trainer =
    (await db.query.users.findFirst({
      where: and(eq(users.tenantId, tenant.id), eq(users.role, "trainer")),
    })) ??
    (await db.query.users.findFirst({
      where: and(eq(users.tenantId, tenant.id), eq(users.role, "admin")),
    }));

  const classRows = await db.query.classes.findMany({
    where: eq(classes.tenantId, tenant.id),
  });

  const classIdByTitle = new Map(classRows.map((row) => [row.title, row.id]));

  for (const item of resetClassInsertValues(tenant.id)) {
    if (classIdByTitle.has(item.title)) {
      continue;
    }

    const [inserted] = await db.insert(classes).values(item).returning();
    classIdByTitle.set(inserted.title, inserted.id);
    console.log(`Added class type: ${inserted.title}`);
  }

  const rangeStart = fromDate;
  const rangeEnd = endOfDay(
    new Date(fromDate.getTime() + weeksAhead * 7 * 24 * 60 * 60 * 1000 - 1),
  );

  if (replaceRange) {
    const removed = await db
      .delete(classSchedules)
      .where(
        and(
          eq(classSchedules.tenantId, tenant.id),
          gte(classSchedules.startTime, rangeStart),
          lte(classSchedules.startTime, rangeEnd),
        ),
      )
      .returning({ id: classSchedules.id });

    console.log(
      `Removed ${removed.length} existing session(s) in range ${fromRaw} (+${weeksAhead} weeks).`,
    );
  }

  const scheduleRows = buildResetScheduleInserts({
    tenantId: tenant.id,
    classIdByTitle,
    trainerId: trainer?.id ?? null,
    weeksAhead,
    fromDate,
  });

  await db.insert(classSchedules).values(scheduleRows);

  await db
    .update(tenants)
    .set({ scheduleDisplayStart: fromRaw })
    .where(eq(tenants.id, tenant.id));

  console.log(
    `Reset opening schedule: ${scheduleRows.length} session(s) from ${fromRaw} for ${weeksAhead} week(s). Sunday closed.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
