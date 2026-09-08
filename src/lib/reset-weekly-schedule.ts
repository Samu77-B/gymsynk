import { addDays, getDay, setHours, setMinutes, startOfDay } from "date-fns";

/** Reset gym weekly timetable — all sessions are 45 minutes. */
export const RESET_CLASS_DURATION_MINUTES = 45;

export const RESET_WEEKLY_CLASS_TYPES = [
  {
    title: "Full Body Strength",
    description: "Total-body strength training for all levels.",
    capacity: 14,
  },
  {
    title: "Strong After 40th",
    description: "Strength and conditioning tailored for 40+.",
    capacity: 14,
  },
  {
    title: "Full Body Conditioning",
    description: "Cardio and conditioning across the full body.",
    capacity: 14,
  },
  {
    title: "Woman Only Training",
    description: "Women-only strength and fitness session.",
    capacity: 14,
  },
  {
    title: "Hyrox Training",
    description: "Hybrid fitness — run, erg, and functional work.",
    capacity: 14,
  },
  {
    title: "Mummy Fit",
    description: "Postnatal-friendly fitness for mums.",
    capacity: 14,
  },
  {
    title: "Legs & Glutes",
    description: "Lower-body strength and glute focus.",
    capacity: 14,
  },
  {
    title: "Reset Bootcamp",
    description: "Saturday bootcamp — Reset signature session.",
    capacity: 16,
  },
  {
    title: "Sound Healing",
    description: "Restorative sound bath and recovery.",
    capacity: 12,
  },
  {
    title: "Mobility and Recovery",
    description: "Mobility, stretch, and active recovery.",
    capacity: 14,
  },
] as const;

/** JavaScript day index: 0 = Sunday … 6 = Saturday */
export const RESET_WEEKLY_SLOTS = [
  // Monday
  { classTitle: "Full Body Strength", dayOfWeek: 1, hour: 6, minute: 30 },
  { classTitle: "Strong After 40th", dayOfWeek: 1, hour: 9, minute: 30 },
  { classTitle: "Full Body Conditioning", dayOfWeek: 1, hour: 18, minute: 30 },
  { classTitle: "Woman Only Training", dayOfWeek: 1, hour: 19, minute: 30 },
  // Tuesday
  { classTitle: "Hyrox Training", dayOfWeek: 2, hour: 6, minute: 30 },
  { classTitle: "Mummy Fit", dayOfWeek: 2, hour: 9, minute: 30 },
  { classTitle: "Strong After 40th", dayOfWeek: 2, hour: 18, minute: 30 },
  { classTitle: "Woman Only Training", dayOfWeek: 2, hour: 19, minute: 30 },
  // Wednesday
  { classTitle: "Hyrox Training", dayOfWeek: 3, hour: 6, minute: 30 },
  { classTitle: "Legs & Glutes", dayOfWeek: 3, hour: 9, minute: 30 },
  { classTitle: "Full Body Strength", dayOfWeek: 3, hour: 18, minute: 30 },
  { classTitle: "Full Body Conditioning", dayOfWeek: 3, hour: 19, minute: 30 },
  // Thursday
  { classTitle: "Hyrox Training", dayOfWeek: 4, hour: 6, minute: 30 },
  { classTitle: "Mummy Fit", dayOfWeek: 4, hour: 9, minute: 30 },
  { classTitle: "Strong After 40th", dayOfWeek: 4, hour: 18, minute: 30 },
  { classTitle: "Woman Only Training", dayOfWeek: 4, hour: 19, minute: 30 },
  // Friday
  { classTitle: "Hyrox Training", dayOfWeek: 5, hour: 6, minute: 30 },
  { classTitle: "Strong After 40th", dayOfWeek: 5, hour: 9, minute: 30 },
  { classTitle: "Full Body Conditioning", dayOfWeek: 5, hour: 18, minute: 30 },
  // Saturday
  { classTitle: "Reset Bootcamp", dayOfWeek: 6, hour: 10, minute: 0 },
  { classTitle: "Sound Healing", dayOfWeek: 6, hour: 11, minute: 0 },
  // Sunday
  { classTitle: "Mobility and Recovery", dayOfWeek: 0, hour: 10, minute: 0 },
] as const;

function addMinutes(date: Date, minutes: number) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
}

export function buildResetScheduleInserts(options: {
  tenantId: string;
  classIdByTitle: Map<string, string>;
  trainerId: string | null;
  weeksAhead?: number;
  fromDate?: Date;
}) {
  const {
    tenantId,
    classIdByTitle,
    trainerId,
    weeksAhead = 4,
    fromDate = new Date(),
  } = options;

  const rows: Array<{
    tenantId: string;
    classId: string;
    trainerId: string | null;
    startTime: Date;
    endTime: Date;
  }> = [];

  const start = startOfDay(fromDate);

  for (let offset = 0; offset < weeksAhead * 7; offset += 1) {
    const date = addDays(start, offset);
    const dayOfWeek = getDay(date);

    for (const slot of RESET_WEEKLY_SLOTS) {
      if (slot.dayOfWeek !== dayOfWeek) {
        continue;
      }

      const classId = classIdByTitle.get(slot.classTitle);
      if (!classId) {
        throw new Error(`Missing class type: ${slot.classTitle}`);
      }

      const startTime = setMinutes(setHours(date, slot.hour), slot.minute);
      rows.push({
        tenantId,
        classId,
        trainerId,
        startTime,
        endTime: addMinutes(startTime, RESET_CLASS_DURATION_MINUTES),
      });
    }
  }

  return rows;
}

export function resetClassInsertValues(tenantId: string) {
  return RESET_WEEKLY_CLASS_TYPES.map((item) => ({
    tenantId,
    title: item.title,
    description: item.description,
    capacity: item.capacity,
    durationMinutes: RESET_CLASS_DURATION_MINUTES,
    price: "0.00",
  }));
}
