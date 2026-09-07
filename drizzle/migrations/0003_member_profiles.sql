DO $$ BEGIN
  CREATE TYPE parq_status AS ENUM (
    'not_started',
    'cleared',
    'doctor_required',
    'declined'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_end_date TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS member_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  legal_name VARCHAR(255),
  date_of_birth DATE,
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(100),
  county VARCHAR(100),
  postcode VARCHAR(20),
  country VARCHAR(100) DEFAULT 'United Kingdom',
  emergency_contact_name VARCHAR(255),
  emergency_contact_relationship VARCHAR(100),
  emergency_contact_phone VARCHAR(50),
  parq_status parq_status NOT NULL DEFAULT 'not_started',
  medical_notes TEXT,
  access_card_id VARCHAR(100),
  member_photo_url VARCHAR(2048),
  billing_same_as_home BOOLEAN NOT NULL DEFAULT TRUE,
  billing_address_line_1 VARCHAR(255),
  billing_address_line_2 VARCHAR(255),
  billing_city VARCHAR(100),
  billing_postcode VARCHAR(20),
  billing_country VARCHAR(100),
  joining_fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  joining_fee_amount NUMERIC(10, 2),
  joining_fee_paid_at TIMESTAMPTZ,
  waiver_signed_at TIMESTAMPTZ,
  terms_accepted_at TIMESTAMPTZ,
  payment_method_note VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS member_profiles_user_idx ON member_profiles (user_id);
