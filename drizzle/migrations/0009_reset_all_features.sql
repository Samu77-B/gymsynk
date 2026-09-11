-- Reset is the platform demo gym: enable every module for full testing.
UPDATE "tenants"
SET
  "feature_memberships" = true,
  "feature_class_booking" = true,
  "feature_session_packs" = true
WHERE "slug" = 'reset';
