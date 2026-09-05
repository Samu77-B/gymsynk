-- GymSynk initial schema for Neon PostgreSQL

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('owner', 'admin', 'trainer', 'member');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE schedule_status AS ENUM ('scheduled', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('confirmed', 'waitlisted', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_tenant_email_idx ON users (tenant_id, email);

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  capacity INT NOT NULL DEFAULT 15,
  duration_minutes INT NOT NULL DEFAULT 45,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status schedule_status NOT NULL DEFAULT 'scheduled'
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES class_schedules(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_status booking_status NOT NULL DEFAULT 'confirmed',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  paysynk_transaction_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_start TIMESTAMPTZ NOT NULL,
  shift_end TIMESTAMPTZ NOT NULL,
  role_assigned VARCHAR(100),
  notes TEXT,
  CONSTRAINT staff_shifts_end_after_start CHECK (shift_end > shift_start)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_classes_tenant_id ON classes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_class_schedules_tenant_id ON class_schedules (tenant_id);
CREATE INDEX IF NOT EXISTS idx_class_schedules_start_time ON class_schedules (start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id ON bookings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_schedule_id ON bookings (schedule_id);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_tenant_id ON staff_shifts (tenant_id);
