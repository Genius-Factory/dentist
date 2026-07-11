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

-- ============================================================
-- Indexes
-- ============================================================

 
 
