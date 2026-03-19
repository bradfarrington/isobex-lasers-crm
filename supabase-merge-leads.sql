-- =============================================
-- Migration: Merge leads into contacts table
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. Add lead-related columns to the contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_type TEXT DEFAULT 'Customer';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status TEXT;

-- 2. Migrate any existing leads into the contacts table
INSERT INTO contacts (first_name, last_name, email, phone, notes, contact_type, source, message, status, created_at, updated_at)
SELECT
  first_name,
  last_name,
  email,
  phone,
  message,
  'Lead',
  source,
  message,
  status,
  created_at,
  updated_at
FROM leads
ON CONFLICT DO NOTHING;

-- 3. (Optional) You can drop the leads table later once you're confident
-- DROP TABLE IF EXISTS leads;
