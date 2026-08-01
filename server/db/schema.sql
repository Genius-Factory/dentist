-- ============================================================
-- Library Management System — Database Schema (PostgreSQL)
-- ============================================================

-- 1. Users (synced from Clerk on first authenticated request)
CREATE TABLE IF NOT EXISTS users (
  id         VARCHAR(255) PRIMARY KEY,            -- Clerk user ID
  username   VARCHAR(255) UNIQUE,
  email      VARCHAR(255) UNIQUE NOT NULL,
  role       VARCHAR(50)  DEFAULT 'member',       -- 'admin' | 'librarian' | 'member' | 'secretary'
  created_at TIMESTAMP    DEFAULT NOW()
);

-- Ensure existing installations get the new `username` column
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255);
-- Add a unique index for username if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users(username);

-- Patient details are application data, not browser-local state.
CREATE TABLE IF NOT EXISTS patient_profiles (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL DEFAULT '',
  last_name VARCHAR(255) NOT NULL DEFAULT '',
  date_of_birth DATE,
  gender VARCHAR(100), phone VARCHAR(100), email VARCHAR(255), address TEXT,
  guardian_name VARCHAR(255), guardian_relationship VARCHAR(255), guardian_phone VARCHAR(100),
  emergency_contact_name VARCHAR(255), emergency_contact_relationship VARCHAR(255), emergency_contact_phone VARCHAR(100),
  allergies TEXT, notes TEXT, preferred_contact_method VARCHAR(100), communication_preference VARCHAR(100), language VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id VARCHAR(255) REFERENCES patient_profiles(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL, date_of_birth DATE, guardian_contact TEXT,
  medical_issue TEXT NOT NULL, emergency_level VARCHAR(50) NOT NULL,
  duration INTEGER NOT NULL, appointment_date DATE NOT NULL, appointment_time TIME NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', requested_by_role VARCHAR(50),
  editable_until TIMESTAMP, approved_at TIMESTAMP, approved_by VARCHAR(255),
  declined_at TIMESTAMP, declined_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS patient_profiles_user_id_idx ON patient_profiles(user_id);
CREATE INDEX IF NOT EXISTS appointments_user_id_idx ON appointments(user_id);
CREATE INDEX IF NOT EXISTS appointments_profile_id_idx ON appointments(profile_id);

-- ============================================================
-- Indexes
-- ============================================================

 
 
