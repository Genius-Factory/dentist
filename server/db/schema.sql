-- ============================================================
-- Library Management System — Database Schema (PostgreSQL)
-- ============================================================

-- 1. Users (synced from Clerk on first authenticated request)
CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(255) PRIMARY KEY,            -- Clerk user ID
  username   VARCHAR(255) UNIQUE,
  email      VARCHAR(255) UNIQUE NOT NULL,
  role       VARCHAR(50)  DEFAULT 'client',       -- 'superadmin' | 'admin' | 'secretary' | 'client'
  created_at TIMESTAMP    DEFAULT NOW()
);

-- Ensure existing installations get the new `username` column
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255);
-- Add a unique index for username if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users(username);

-- One clinic-wide booking policy, managed from the admin panel.
CREATE TABLE IF NOT EXISTS clinic_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  working_days JSONB NOT NULL DEFAULT '[1,2,3,4,5]'::jsonb,
  opening_time TIME NOT NULL DEFAULT '08:00',
  closing_time TIME NOT NULL DEFAULT '17:00',
  days_off JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO clinic_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Patient details are application data, not browser-local state.
CREATE TABLE IF NOT EXISTS patient_profiles (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL DEFAULT '',
  last_name VARCHAR(255) NOT NULL DEFAULT '',
  date_of_birth DATE,
  gender VARCHAR(100), phone VARCHAR(100), email VARCHAR(255), address TEXT,
  profile_picture BYTEA, profile_picture_type VARCHAR(100),
  guardian_name VARCHAR(255), guardian_relationship VARCHAR(255), guardian_phone VARCHAR(100),
  emergency_contact_name VARCHAR(255), emergency_contact_relationship VARCHAR(255), emergency_contact_phone VARCHAR(100),
  allergies TEXT, notes TEXT, preferred_contact_method VARCHAR(100), communication_preference VARCHAR(100), language VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS profile_picture BYTEA;
ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS profile_picture_type VARCHAR(100);

CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id VARCHAR(255) REFERENCES patient_profiles(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL, date_of_birth DATE, guardian_contact TEXT,
  medical_issue TEXT NOT NULL, emergency_level VARCHAR(50) NOT NULL,
  duration INTEGER NOT NULL, appointment_date DATE NOT NULL, appointment_time TIME NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', requested_by_role VARCHAR(50),
  editable_until TIMESTAMPTZ, approved_at TIMESTAMP, approved_by VARCHAR(255),
  declined_at TIMESTAMP, declined_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);

-- The bookable service catalog. Only active services are exposed to patients.
CREATE TABLE IF NOT EXISTS services (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL DEFAULT 'General Dentistry',
  description TEXT NOT NULL DEFAULT '',
  duration INTEGER NOT NULL CHECK (duration > 0),
  price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';

-- A service can be provided by many dentists and a dentist can provide many services.
CREATE TABLE IF NOT EXISTS service_dentists (
  service_id VARCHAR(255) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  dentist_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, dentist_id)
);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_id VARCHAR(255) REFERENCES services(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS dentist_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;

-- Doctor directory and scheduling. The legacy clinic is the existing clinic_settings row.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL,
  timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Beirut', status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO clinics (id, name) VALUES ('00000000-0000-4000-8000-000000000001', 'Main Clinic') ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(160) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '', active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id VARCHAR(255) UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  first_name VARCHAR(120) NOT NULL, last_name VARCHAR(120) NOT NULL, email VARCHAR(255), phone VARCHAR(100),
  profile_image_url TEXT NOT NULL DEFAULT '', license_number VARCHAR(160) NOT NULL, license_jurisdiction VARCHAR(160) NOT NULL DEFAULT 'default',
  specialty_id UUID REFERENCES specialties(id) ON DELETE SET NULL, years_of_experience INTEGER NOT NULL DEFAULT 0 CHECK (years_of_experience >= 0),
  bio TEXT NOT NULL DEFAULT '', status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  service_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(service_ids) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (license_jurisdiction, license_number)
);
CREATE TABLE IF NOT EXISTS doctor_clinics (
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE, clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (doctor_id, clinic_id)
);
CREATE TABLE IF NOT EXISTS doctor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE, weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL, end_time TIME NOT NULL, CHECK (start_time < end_time), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS doctor_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE, starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL,
  reason VARCHAR(500) NOT NULL DEFAULT '', CHECK (starts_at < ends_at), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS doctors_specialty_status_idx ON doctors(specialty_id, status);
CREATE INDEX IF NOT EXISTS doctor_clinics_clinic_idx ON doctor_clinics(clinic_id, doctor_id);
CREATE INDEX IF NOT EXISTS doctor_availability_lookup_idx ON doctor_availability(doctor_id, clinic_id, weekday);
CREATE INDEX IF NOT EXISTS doctor_time_off_lookup_idx ON doctor_time_off(doctor_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS appointments_doctor_date_idx ON appointments(doctor_id, appointment_date, appointment_time);

CREATE INDEX IF NOT EXISTS patient_profiles_user_id_idx ON patient_profiles(user_id);
CREATE INDEX IF NOT EXISTS appointments_user_id_idx ON appointments(user_id);
CREATE INDEX IF NOT EXISTS appointments_profile_id_idx ON appointments(profile_id);
CREATE INDEX IF NOT EXISTS appointments_service_id_idx ON appointments(service_id);
CREATE INDEX IF NOT EXISTS appointments_dentist_id_idx ON appointments(dentist_id);
CREATE INDEX IF NOT EXISTS service_dentists_dentist_id_idx ON service_dentists(dentist_id);

-- Appointment edit deadlines are absolute instants. Older installations used
-- TIMESTAMP without a timezone, which caused clients outside UTC to lose hours.
ALTER TABLE appointments
  ALTER COLUMN editable_until TYPE TIMESTAMPTZ
  USING editable_until AT TIME ZONE 'UTC';

-- ============================================================
-- Indexes
-- ============================================================

 
 
