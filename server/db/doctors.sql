CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(255) NOT NULL,
  timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Beirut', status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO clinics (id, name) VALUES ('00000000-0000-4000-8000-000000000001', 'Main Clinic') ON CONFLICT (id) DO NOTHING;
CREATE TABLE IF NOT EXISTS specialties (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(160) NOT NULL UNIQUE, description TEXT NOT NULL DEFAULT '', active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS doctors (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id VARCHAR(255) UNIQUE REFERENCES users(id) ON DELETE SET NULL,
 first_name VARCHAR(120) NOT NULL, last_name VARCHAR(120) NOT NULL, email VARCHAR(255), phone VARCHAR(100), profile_image_url TEXT NOT NULL DEFAULT '',
 license_number VARCHAR(160) NOT NULL, license_jurisdiction VARCHAR(160) NOT NULL DEFAULT 'default', specialty_id UUID REFERENCES specialties(id) ON DELETE SET NULL,
 years_of_experience INTEGER NOT NULL DEFAULT 0 CHECK(years_of_experience >= 0), bio TEXT NOT NULL DEFAULT '', status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
 service_ids JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(service_ids) = 'array'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(license_jurisdiction,license_number));
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS service_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
CREATE TABLE IF NOT EXISTS doctor_clinics (doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE, clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY(doctor_id,clinic_id));
CREATE TABLE IF NOT EXISTS doctor_availability (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE, clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE, weekday SMALLINT NOT NULL CHECK(weekday BETWEEN 0 AND 6), start_time TIME NOT NULL, end_time TIME NOT NULL, CHECK(start_time < end_time), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS doctor_time_off (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE, clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE, starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL, reason VARCHAR(500) NOT NULL DEFAULT '', CHECK(starts_at < ends_at), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS doctors_specialty_status_idx ON doctors(specialty_id,status);
CREATE INDEX IF NOT EXISTS doctor_clinics_clinic_idx ON doctor_clinics(clinic_id,doctor_id);
CREATE INDEX IF NOT EXISTS doctor_availability_lookup_idx ON doctor_availability(doctor_id,clinic_id,weekday);
CREATE INDEX IF NOT EXISTS doctor_time_off_lookup_idx ON doctor_time_off(doctor_id,starts_at,ends_at);
CREATE INDEX IF NOT EXISTS appointments_doctor_date_idx ON appointments(doctor_id,appointment_date,appointment_time);
