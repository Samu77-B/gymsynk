ALTER TABLE "tenants" ADD COLUMN "website_url" varchar(2048);
ALTER TABLE "tenants" ADD COLUMN "external_book_url" varchar(2048);

UPDATE "tenants"
SET
  "website_url" = 'https://resetstudios.co.uk',
  "primary_color" = COALESCE("primary_color", '#111111')
WHERE "slug" = 'reset';
