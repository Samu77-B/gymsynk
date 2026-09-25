CREATE TYPE "check_in_result" AS ENUM ('granted', 'denied');

CREATE TYPE "check_in_method" AS ENUM ('qr');

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "feature_door_entry" boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "member_check_ins" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "result" "check_in_result" NOT NULL,
  "denial_reason" varchar(255),
  "method" "check_in_method" NOT NULL DEFAULT 'qr',
  "scanned_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "member_check_ins_tenant_created_idx" ON "member_check_ins" ("tenant_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "member_check_ins_tenant_user_created_idx" ON "member_check_ins" ("tenant_id", "user_id", "created_at" DESC);
