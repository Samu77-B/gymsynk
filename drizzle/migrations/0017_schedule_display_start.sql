ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "schedule_display_start" date;

UPDATE "tenants"
SET "schedule_display_start" = '2026-11-02'
WHERE "slug" = 'reset';
