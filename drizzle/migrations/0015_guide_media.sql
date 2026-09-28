ALTER TABLE "gym_guides" ADD COLUMN IF NOT EXISTS "media_url" text;
ALTER TABLE "gym_guides" ADD COLUMN IF NOT EXISTS "media_type" varchar(16);
