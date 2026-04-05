-- supabase/migrations/001_initial_schema.sql
-- Initial database schema for the Ariyalur Geology Website
-- Run this in the Supabase SQL Editor to set up your database

-- ============================================================
-- REGISTRATIONS TABLE
-- Stores website visitor registrations
-- ============================================================
CREATE TABLE IF NOT EXISTS registrations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    phone       TEXT,
    institution TEXT,
    purpose     TEXT,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT registrations_email_unique UNIQUE (email)
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations (email);
CREATE INDEX IF NOT EXISTS idx_registrations_registered_at ON registrations (registered_at DESC);

-- ============================================================
-- FOSSIL DETAILS TABLE
-- Stores fossil specimen submissions from contributors
-- ============================================================
CREATE TABLE IF NOT EXISTS fossil_details (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fossil_name      TEXT NOT NULL,
    genus_species    TEXT,
    formation        TEXT,
    locality         TEXT,
    age              TEXT,
    classification   TEXT,
    description      TEXT,
    collector_name   TEXT NOT NULL,
    collector_email  TEXT NOT NULL,
    field_number     TEXT,
    image_urls       TEXT[] DEFAULT '{}',
    status           TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at      TIMESTAMPTZ,
    reviewed_by      TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_fossil_details_status ON fossil_details (status);
CREATE INDEX IF NOT EXISTS idx_fossil_details_submitted_at ON fossil_details (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_fossil_details_field_number ON fossil_details (field_number);

-- ============================================================
-- FEEDBACK TABLE
-- Stores visitor feedback (mirrors the SheetDB integration)
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    email        TEXT NOT NULL,
    phone        TEXT,
    message      TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_submitted_at ON feedback (submitted_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Secures data so only authorised operations are allowed
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE registrations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fossil_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback       ENABLE ROW LEVEL SECURITY;

-- registrations: allow INSERT from anonymous users (public registration)
CREATE POLICY "Allow public registration inserts"
    ON registrations
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- registrations: service role can read/write everything
CREATE POLICY "Service role full access to registrations"
    ON registrations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- fossil_details: allow INSERT from anonymous users
CREATE POLICY "Allow public fossil detail submissions"
    ON fossil_details
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- fossil_details: allow SELECT of approved records by anonymous users
CREATE POLICY "Allow public to read approved fossils"
    ON fossil_details
    FOR SELECT
    TO anon
    USING (status = 'approved');

-- fossil_details: service role can read/write everything
CREATE POLICY "Service role full access to fossil_details"
    ON fossil_details
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- feedback: allow INSERT from anonymous users
CREATE POLICY "Allow public feedback inserts"
    ON feedback
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- feedback: service role can read/write everything
CREATE POLICY "Service role full access to feedback"
    ON feedback
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
