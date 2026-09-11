CREATE TABLE "training_tiers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "subtitle" varchar(255),
  "slug" varchar(50) NOT NULL,
  "price_per_class" numeric(10, 2) NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL
);

CREATE TABLE "training_pack_options" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "tier_id" uuid NOT NULL,
  "label" varchar(255) NOT NULL,
  "session_count" integer,
  "price" numeric(10, 2) NOT NULL,
  "is_pay_as_you_go" boolean DEFAULT false NOT NULL,
  "note" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL
);

ALTER TABLE "classes" ADD COLUMN "training_tier_id" uuid;

ALTER TABLE "training_tiers" ADD CONSTRAINT "training_tiers_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "training_pack_options" ADD CONSTRAINT "training_pack_options_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "training_pack_options" ADD CONSTRAINT "training_pack_options_tier_id_training_tiers_id_fk"
  FOREIGN KEY ("tier_id") REFERENCES "public"."training_tiers"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "classes" ADD CONSTRAINT "classes_training_tier_id_training_tiers_id_fk"
  FOREIGN KEY ("training_tier_id") REFERENCES "public"."training_tiers"("id") ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX "training_tiers_tenant_slug_idx" ON "training_tiers" USING btree ("tenant_id", "slug");

UPDATE "tenants" SET "feature_session_packs" = true WHERE "slug" = 'reset';
