ALTER TABLE "class_schedules" ADD COLUMN IF NOT EXISTS "capacity_override" integer;

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "promoted_at" timestamp with time zone;

-- Collapse any pre-existing duplicates so the unique index below can be created.
-- Keeps the earliest booking per member per session and cancels the rest.
UPDATE "bookings" b
SET "booking_status" = 'cancelled',
    "cancelled_at" = now()
WHERE b."booking_status" <> 'cancelled'
  AND EXISTS (
    SELECT 1
    FROM "bookings" o
    WHERE o."schedule_id" = b."schedule_id"
      AND o."member_id" = b."member_id"
      AND o."booking_status" <> 'cancelled'
      AND (
        o."created_at" < b."created_at"
        OR (o."created_at" = b."created_at" AND o."id" < b."id")
      )
  );

CREATE UNIQUE INDEX IF NOT EXISTS "bookings_schedule_member_active_idx"
  ON "bookings" USING btree ("schedule_id", "member_id")
  WHERE "booking_status" <> 'cancelled';

-- Waitlist order is resolved by created_at, so make that ordering cheap and total.
CREATE INDEX IF NOT EXISTS "bookings_schedule_status_created_idx"
  ON "bookings" USING btree ("schedule_id", "booking_status", "created_at");
