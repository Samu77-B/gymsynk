ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "logo_url" varchar(2048);
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "primary_color" varchar(7);
