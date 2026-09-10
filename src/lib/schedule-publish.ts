import { and, eq, gte, lte } from "drizzle-orm";
import { addDays, endOfDay, startOfDay } from "date-fns";

import { getDb } from "@/db";
import { classes, classSchedules, users } from "@/db/schema";
import {
  buildResetScheduleInserts,
  resetClassInsertValues,
} from "@/lib/reset-weekly-schedule";
import { buildTenantEmbedUrls } from "@/lib/tenant-website";

const WEEKS_AHEAD = 4;

function scheduleKey(classId: string, startTime: Date) {
  return `${classId}:${startTime.toISOString()}`;
}

async function defaultTrainerId(tenantId: string) {
  const db = getDb();

  const trainer =
    (await db.query.users.findFirst({
      where: and(eq(users.tenantId, tenantId), eq(users.role, "trainer")),
    })) ??
    (await db.query.users.findFirst({
      where: and(eq(users.tenantId, tenantId), eq(users.role, "admin")),
    }));

  return trainer?.id ?? null;
}

async function existingScheduleKeys(
  tenantId: string,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const db = getDb();
  const rows = await db.query.classSchedules.findMany({
    where: and(
      eq(classSchedules.tenantId, tenantId),
      gte(classSchedules.startTime, rangeStart),
      lte(classSchedules.startTime, rangeEnd),
    ),
  });

  return new Set(rows.map((row) => scheduleKey(row.classId, row.startTime)));
}

async function insertMissingSchedules(
  rows: Array<{
    tenantId: string;
    classId: string;
    trainerId: string | null;
    startTime: Date;
    endTime: Date;
  }>,
  existingKeys: Set<string>,
) {
  const db = getDb();
  const missing = rows.filter(
    (row) => !existingKeys.has(scheduleKey(row.classId, row.startTime)),
  );

  if (missing.length > 0) {
    await db.insert(classSchedules).values(missing);
  }

  return missing.length;
}

async function publishResetSchedule(tenantId: string, trainerId: string | null) {
  const db = getDb();
  const rangeStart = startOfDay(new Date());
  const rangeEnd = endOfDay(addDays(rangeStart, WEEKS_AHEAD * 7 - 1));
  const keys = await existingScheduleKeys(tenantId, rangeStart, rangeEnd);

  let classRows = await db.query.classes.findMany({
    where: eq(classes.tenantId, tenantId),
  });

  const templateTitles = new Set<string>(
    resetClassInsertValues(tenantId).map((item) => item.title),
  );
  const missingTypes = resetClassInsertValues(tenantId).filter(
    (item) => !classRows.some((row) => row.title === item.title),
  );

  if (missingTypes.length > 0) {
    const inserted = await db.insert(classes).values(missingTypes).returning();
    classRows = [...classRows, ...inserted];
  }

  const classIdByTitle = new Map(
    classRows
      .filter((row) => templateTitles.has(row.title))
      .map((row) => [row.title, row.id]),
  );

  const scheduleRows = buildResetScheduleInserts({
    tenantId,
    classIdByTitle,
    trainerId,
    weeksAhead: WEEKS_AHEAD,
  });

  const sessionsAdded = await insertMissingSchedules(scheduleRows, keys);
  const upcomingCount = keys.size + sessionsAdded;

  return { sessionsAdded, upcomingCount };
}

async function publishClonedWeekSchedule(
  tenantId: string,
  trainerId: string | null,
) {
  const db = getDb();
  const rangeStart = startOfDay(new Date());
  const rangeEnd = endOfDay(addDays(rangeStart, WEEKS_AHEAD * 7 - 1));
  const keys = await existingScheduleKeys(tenantId, rangeStart, rangeEnd);

  const referenceEnd = endOfDay(addDays(rangeStart, 6));
  const referenceRows = await db.query.classSchedules.findMany({
    where: and(
      eq(classSchedules.tenantId, tenantId),
      gte(classSchedules.startTime, rangeStart),
      lte(classSchedules.startTime, referenceEnd),
      eq(classSchedules.status, "scheduled"),
    ),
  });

  const generated: Array<{
    tenantId: string;
    classId: string;
    trainerId: string | null;
    startTime: Date;
    endTime: Date;
  }> = [];

  for (let week = 0; week < WEEKS_AHEAD; week += 1) {
    for (const row of referenceRows) {
      const startTime = addDays(row.startTime, week * 7);
      const endTime = addDays(row.endTime, week * 7);

      if (startTime < rangeStart) {
        continue;
      }

      generated.push({
        tenantId,
        classId: row.classId,
        trainerId: row.trainerId ?? trainerId,
        startTime,
        endTime,
      });
    }
  }

  const sessionsAdded = await insertMissingSchedules(generated, keys);
  const upcomingCount = keys.size + sessionsAdded;

  return { sessionsAdded, upcomingCount };
}

function publicUrls(tenantSlug: string, appUrl: string) {
  const embed = buildTenantEmbedUrls(appUrl, tenantSlug);
  return {
    scheduleApi: embed.scheduleApi,
    embed: embed.embedPage,
  };
}

export async function publishTenantSchedule(options: {
  tenantId: string;
  tenantSlug: string;
  appUrl: string;
}) {
  const trainerId = await defaultTrainerId(options.tenantId);

  const result =
    options.tenantSlug === "reset"
      ? await publishResetSchedule(options.tenantId, trainerId)
      : await publishClonedWeekSchedule(options.tenantId, trainerId);

  return {
    ...result,
    publishedAt: new Date().toISOString(),
    urls: publicUrls(options.tenantSlug, options.appUrl),
  };
}
