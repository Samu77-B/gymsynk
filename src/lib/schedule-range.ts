import {
  addDays,
  endOfWeek,
  format,
  isBefore,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";

export const WEEK_STARTS_ON = 1 as const;

export function startOfScheduleWeek(date = new Date()) {
  return startOfWeek(startOfDay(date), { weekStartsOn: WEEK_STARTS_ON });
}

export function endOfScheduleWeek(weekStart: Date) {
  return endOfWeek(weekStart, { weekStartsOn: WEEK_STARTS_ON });
}

export function scheduleWeekQueryParams(weekStart: Date) {
  const start = startOfScheduleWeek(weekStart);
  const end = endOfScheduleWeek(start);

  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
  };
}

export function formatScheduleWeekLabel(weekStart: Date) {
  const start = startOfScheduleWeek(weekStart);
  const end = endOfScheduleWeek(start);

  return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
}

/** Public embed: show opening week until that week has started. */
export function resolvePublicScheduleWeekStart(options: {
  scheduleDisplayStart: string | Date | null | undefined;
  startParam?: string | null;
  now?: Date;
}) {
  if (options.startParam) {
    return startOfScheduleWeek(parseISO(options.startParam));
  }

  const now = options.now ?? new Date();
  const displayStart = options.scheduleDisplayStart;

  if (displayStart) {
    const opening = startOfDay(
      displayStart instanceof Date ? displayStart : parseISO(String(displayStart)),
    );
    const openingWeek = startOfScheduleWeek(opening);

    if (isBefore(now, addDays(openingWeek, 7))) {
      return openingWeek;
    }
  }

  return startOfScheduleWeek(now);
}
