ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "credit_rollover" boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TYPE "pack_credit_reason" ADD VALUE 'period_rollover';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
