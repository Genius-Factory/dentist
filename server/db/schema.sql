-- ============================================================
-- Library Management System — Database Schema (PostgreSQL)
-- ============================================================

-- 1. Users (synced from Clerk on first authenticated request)
CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(255) PRIMARY KEY,            -- Clerk user ID
  username   VARCHAR(255) UNIQUE,
  email      VARCHAR(255) UNIQUE NOT NULL,
  role       VARCHAR(50)  DEFAULT 'member',       -- 'superadmin' | 'admin' | 'secretary' | 'member'
  created_at TIMESTAMP    DEFAULT NOW()
);

-- Ensure existing installations get the new `username` column
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255);
-- Add a unique index for username if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users(username);

-- Safe legacy cleanup: former librarian accounts are normal member accounts.
UPDATE users SET role = 'member' WHERE role = 'librarian';

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

-- A service can be provided by many dentists and a dentist can provide many services.
CREATE TABLE IF NOT EXISTS service_dentists (
  service_id VARCHAR(255) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  dentist_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, dentist_id)
);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_id VARCHAR(255) REFERENCES services(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS dentist_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;

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

 
 
