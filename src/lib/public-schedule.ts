import { and, asc, eq, gte, lte } from "drizzle-orm";
import {
  addDays,
  endOfDay,
  format,
  getDay,
  parseISO,
  startOfDay,
} from "date-fns";

import { getDb } from "@/db";
import { classSchedules, tenants } from "@/db/schema";
import {
  getPublicBookUrl,
  resolveTenantFeatures,
} from "@/lib/tenant-features";

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type PublicScheduleClass = {
  id: string;
  classTitle: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
  spotsLeft: number;
};

export type PublicScheduleDay = {
  day: (typeof DAY_ORDER)[number];
  date: string;
  classes: PublicScheduleClass[];
};

export type PublicSchedulePayload = {
  tenant: {
    slug: string;
    name: string;
  };
  rangeStart: string;
  rangeEnd: string;
  days: PublicScheduleDay[];
  bookUrl: string | null;
};

function durationMinutes(start: Date, end: Date) {
  return Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 60_000),
  );
}

export async function getPublicSchedule(options: {
  tenantSlug: string;
  startParam?: string | null;
  endParam?: string | null;
  appUrl: string;
  includeCancelled?: boolean;
}): Promise<PublicSchedulePayload | null> {
  const db = getDb();

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, options.tenantSlug),
  });

  if (!tenant) {
    return null;
  }

  const rangeStart = options.startParam
    ? startOfDay(parseISO(options.startParam))
    : startOfDay(new Date());
  const rangeEnd = options.endParam
    ? endOfDay(parseISO(options.endParam))
    : endOfDay(addDays(rangeStart, 6));

  const conditions = [
    eq(classSchedules.tenantId, tenant.id),
    gte(classSchedules.startTime, rangeStart),
    lte(classSchedules.startTime, rangeEnd),
  ];

  if (!options.includeCancelled) {
    conditions.push(eq(classSchedules.status, "scheduled"));
  }

  const rows = await db.query.classSchedules.findMany({
    where: and(...conditions),
    with: {
      class: true,
      bookings: true,
    },
    orderBy: [asc(classSchedules.startTime)],
  });

  const dayMap = new Map<string, PublicScheduleDay>();

  for (const row of rows) {
    const dayLabel = format(row.startTime, "EEEE") as PublicScheduleDay["day"];
    const dateKey = format(row.startTime, "yyyy-MM-dd");
    const mapKey = `${dayLabel}-${dateKey}`;

    const confirmedCount = row.bookings.filter(
      (booking) => booking.bookingStatus === "confirmed",
    ).length;

    const entry: PublicScheduleClass = {
      id: row.id,
      classTitle: row.class.title,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
      durationMinutes: durationMinutes(row.startTime, row.endTime),
      status: row.status,
      spotsLeft: Math.max(row.class.capacity - confirmedCount, 0),
    };

    const existing = dayMap.get(mapKey);
    if (existing) {
      existing.classes.push(entry);
    } else {
      dayMap.set(mapKey, {
        day: dayLabel,
        date: dateKey,
        classes: [entry],
      });
    }
  }

  const days = [...dayMap.values()].sort((a, b) => {
    const dayDiff =
      DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
    if (dayDiff !== 0) {
      return dayDiff;
    }

    return a.date.localeCompare(b.date);
  });

  return {
    tenant: {
      slug: tenant.slug,
      name: tenant.name,
    },
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    days,
    bookUrl: getPublicBookUrl({
      appUrl: options.appUrl,
      tenantSlug: tenant.slug,
      features: resolveTenantFeatures(tenant),
    }),
  };
}

export function pickDefaultActiveDay(days: PublicScheduleDay[]) {
  if (days.length === 0) {
    const jsDay = getDay(new Date());
    return DAY_ORDER[jsDay === 0 ? 6 : jsDay - 1];
  }

  const todayName = format(new Date(), "EEEE") as PublicScheduleDay["day"];
  if (days.some((day) => day.day === todayName)) {
    return todayName;
  }

  return days[0]?.day ?? DAY_ORDER[0];
}

export { DAY_ORDER };
