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
    title: "Upper Body Strength",
    description: "Upper-body strength and push/pull focus.",
    capacity: 14,
  },
  {
    title: "Strong After 40th",
    description: "Strength and conditioning tailored for 40+.",
    capacity: 14,
  },
  {
    title: "Core Reset",
    description: "Core strength and stability session.",
    capacity: 14,
  },
  {
    title: "Lower Body Reset",
    description: "Lower-body strength and glute focus.",
    capacity: 14,
  },
  {
    title: "Circuit Reset",
    description: "Conditioning circuits across the full body.",
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
    title: "Reset Bootcamp",
    description: "High-energy bootcamp session.",
    capacity: 16,
  },
  // Legacy titles kept so existing DB rows and tiers still resolve.
  {
    title: "Full Body Conditioning",
    description: "Cardio and conditioning across the full body.",
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
  // Monday (unchanged — already live for November)
  { classTitle: "Full Body Strength", dayOfWeek: 1, hour: 6, minute: 30 },
  { classTitle: "Strong After 40th", dayOfWeek: 1, hour: 9, minute: 30 },
  { classTitle: "Full Body Conditioning", dayOfWeek: 1, hour: 18, minute: 30 },
  { classTitle: "Woman Only Training", dayOfWeek: 1, hour: 19, minute: 30 },
  // Tuesday
  { classTitle: "Hyrox Training", dayOfWeek: 2, hour: 7, minute: 0 },
  { classTitle: "Core Reset", dayOfWeek: 2, hour: 8, minute: 0 },
  { classTitle: "Full Body Strength", dayOfWeek: 2, hour: 9, minute: 15 },
  { classTitle: "Lower Body Reset", dayOfWeek: 2, hour: 10, minute: 15 },
  { classTitle: "Hyrox Training", dayOfWeek: 2, hour: 18, minute: 30 },
  { classTitle: "Core Reset", dayOfWeek: 2, hour: 19, minute: 30 },
  // Wednesday
  { classTitle: "Reset Bootcamp", dayOfWeek: 3, hour: 7, minute: 0 },
  { classTitle: "Upper Body Strength", dayOfWeek: 3, hour: 8, minute: 0 },
  { classTitle: "Strong After 40th", dayOfWeek: 3, hour: 9, minute: 15 },
  { classTitle: "Woman Only Training", dayOfWeek: 3, hour: 18, minute: 30 },
  { classTitle: "Woman Only Training", dayOfWeek: 3, hour: 19, minute: 30 },
  // Thursday (evening Core Reset — client note had a typo on AM/PM)
  { classTitle: "Hyrox Training", dayOfWeek: 4, hour: 7, minute: 0 },
  { classTitle: "Full Body Strength", dayOfWeek: 4, hour: 8, minute: 0 },
  { classTitle: "Circuit Reset", dayOfWeek: 4, hour: 9, minute: 15 },
  { classTitle: "Hyrox Training", dayOfWeek: 4, hour: 18, minute: 30 },
  { classTitle: "Core Reset", dayOfWeek: 4, hour: 19, minute: 30 },
  // Friday
  { classTitle: "Hyrox Training", dayOfWeek: 5, hour: 7, minute: 0 },
  { classTitle: "Full Body Strength", dayOfWeek: 5, hour: 8, minute: 0 },
  { classTitle: "Lower Body Reset", dayOfWeek: 5, hour: 9, minute: 15 },
  { classTitle: "Woman Only Training", dayOfWeek: 5, hour: 19, minute: 0 },
  { classTitle: "Full Body Strength", dayOfWeek: 5, hour: 20, minute: 0 },
  // Saturday
  { classTitle: "Hyrox Training", dayOfWeek: 6, hour: 7, minute: 0 },
  { classTitle: "Woman Only Training", dayOfWeek: 6, hour: 9, minute: 0 },
  { classTitle: "Hyrox Training", dayOfWeek: 6, hour: 10, minute: 0 },
  // Sunday — closed
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
