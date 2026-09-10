ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "feature_memberships" boolean NOT NULL DEFAULT true;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "feature_class_booking" boolean NOT NULL DEFAULT true;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "feature_session_packs" boolean NOT NULL DEFAULT false;

UPDATE "tenants" SET "feature_memberships" = false WHERE "slug" = 'reset';
