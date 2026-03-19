-- =============================================
-- Migration: Add configurable lookup tables
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. Create lookup tables
CREATE TABLE IF NOT EXISTS lead_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6b7280',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6b7280',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Seed with existing values
INSERT INTO lead_sources (name, sort_order) VALUES
  ('Website', 0),
  ('Referral', 1),
  ('Trade Show', 2),
  ('Phone Call', 3),
  ('Email', 4)
ON CONFLICT (name) DO NOTHING;

INSERT INTO lead_statuses (name, color, sort_order) VALUES
  ('New', '#2563eb', 0),
  ('Responded', '#d97706', 1),
  ('Converted', '#16a34a', 2),
  ('Closed', '#6b7280', 3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO company_statuses (name, color, sort_order) VALUES
  ('Prospect', '#2563eb', 0),
  ('Active', '#16a34a', 1),
  ('Inactive', '#6b7280', 2)
ON CONFLICT (name) DO NOTHING;

-- 3. Remove the hardcoded CHECK constraints so values are now dynamic
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_status_check;

-- 4. RLS — open access (same as other tables)
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access" ON lead_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON lead_statuses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON company_statuses FOR ALL USING (true) WITH CHECK (true);
