DO $$ BEGIN
  CREATE TYPE "member_pack_status" AS ENUM ('active', 'paused', 'cancelled', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "pack_credit_reason" AS ENUM ('booking', 'booking_cancelled', 'admin_adjustment');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "member_packs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "tier_id" uuid,
  "pack_option_id" uuid,
  "label" varchar(255) NOT NULL,
  "sessions_per_period" integer,
  "price" numeric(10, 2),
  "status" "member_pack_status" DEFAULT 'active' NOT NULL,
  "source" varchar(20) DEFAULT 'admin' NOT NULL,
  "current_period_start" timestamp with time zone NOT NULL,
  "current_period_end" timestamp with time zone NOT NULL,
  "stripe_subscription_id" varchar(255),
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

-- Signed ledger. A member's remaining credits are derived from these rows for
-- the pack's current period, so unused sessions expire simply by falling out
-- of the period window rather than needing a scheduled reset job.
CREATE TABLE IF NOT EXISTS "pack_credits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "member_pack_id" uuid NOT NULL,
  "booking_id" uuid,
  "delta" integer NOT NULL,
  "reason" "pack_credit_reason" NOT NULL,
  "period_start" timestamp with time zone NOT NULL,
  "created_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "member_pack_id" uuid;

DO $$ BEGIN
  ALTER TABLE "member_packs" ADD CONSTRAINT "member_packs_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "member_packs" ADD CONSTRAINT "member_packs_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "member_packs" ADD CONSTRAINT "member_packs_tier_id_training_tiers_id_fk"
    FOREIGN KEY ("tier_id") REFERENCES "public"."training_tiers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "member_packs" ADD CONSTRAINT "member_packs_pack_option_id_training_pack_options_id_fk"
    FOREIGN KEY ("pack_option_id") REFERENCES "public"."training_pack_options"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pack_credits" ADD CONSTRAINT "pack_credits_tenant_id_tenants_id_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pack_credits" ADD CONSTRAINT "pack_credits_member_pack_id_member_packs_id_fk"
    FOREIGN KEY ("member_pack_id") REFERENCES "public"."member_packs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pack_credits" ADD CONSTRAINT "pack_credits_booking_id_bookings_id_fk"
    FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "pack_credits" ADD CONSTRAINT "pack_credits_created_by_user_id_users_id_fk"
    FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_member_pack_id_member_packs_id_fk"
    FOREIGN KEY ("member_pack_id") REFERENCES "public"."member_packs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "member_packs_stripe_subscription_idx"
  ON "member_packs" USING btree ("stripe_subscription_id")
  WHERE "stripe_subscription_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "member_packs_tenant_user_idx"
  ON "member_packs" USING btree ("tenant_id", "user_id", "status");

CREATE INDEX IF NOT EXISTS "pack_credits_pack_period_idx"
  ON "pack_credits" USING btree ("member_pack_id", "period_start");

-- A booking can only ever spend once and refund once, even if a request is
-- retried or two cancellations race.
CREATE UNIQUE INDEX IF NOT EXISTS "pack_credits_booking_reason_idx"
  ON "pack_credits" USING btree ("booking_id", "reason")
  WHERE "booking_id" IS NOT NULL;
