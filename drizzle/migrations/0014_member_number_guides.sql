ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "member_number" varchar(8);

CREATE UNIQUE INDEX IF NOT EXISTS "users_tenant_member_number_idx"
  ON "users" ("tenant_id", "member_number");

ALTER TYPE "check_in_method" ADD VALUE IF NOT EXISTS 'member_number';

DO $$
DECLARE
  person record;
  candidate varchar(8);
BEGIN
  FOR person IN SELECT id, tenant_id FROM users WHERE member_number IS NULL LOOP
    LOOP
      candidate := lpad((floor(random() * 90000000) + 10000000)::int::text, 8, '0');
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM users
        WHERE tenant_id = person.tenant_id AND member_number = candidate
      );
    END LOOP;

    UPDATE users SET member_number = candidate WHERE id = person.id;
  END LOOP;
END $$;

CREATE TYPE "gym_guide_kind" AS ENUM ('workout', 'nutrition');

CREATE TABLE IF NOT EXISTS "gym_guides" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "kind" "gym_guide_kind" NOT NULL,
  "title" varchar(120) NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "gym_guides_tenant_kind_created_idx"
  ON "gym_guides" ("tenant_id", "kind", "created_at" DESC);
