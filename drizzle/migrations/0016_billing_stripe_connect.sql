DO $$ BEGIN
  CREATE TYPE "billing_model" AS ENUM ('credits_only', 'membership_only', 'hybrid');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "billing_model" "billing_model" NOT NULL DEFAULT 'membership_only';

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "stripe_connect_account_id" varchar(255);

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "stripe_connect_charges_enabled" boolean NOT NULL DEFAULT false;

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "stripe_connect_details_submitted" boolean NOT NULL DEFAULT false;

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "stripe_platform_subscription_id" varchar(255);

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "stripe_platform_subscription_status" varchar(50);

ALTER TABLE "training_pack_options"
  ADD COLUMN IF NOT EXISTS "stripe_price_id" varchar(255);

UPDATE "tenants"
SET
  "billing_model" = 'credits_only',
  "feature_memberships" = false,
  "feature_session_packs" = true
WHERE "slug" = 'reset';
