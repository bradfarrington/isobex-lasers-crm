-- =============================================
-- Migration: Split leads.name into first_name + last_name
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. Add the new columns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_name TEXT;

-- 2. Migrate existing data (puts full name into first_name, empty last_name)
UPDATE leads
SET first_name = COALESCE(name, ''),
    last_name  = ''
WHERE first_name IS NULL;

-- 3. Make the new columns NOT NULL now that data is populated
ALTER TABLE leads ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE leads ALTER COLUMN last_name  SET NOT NULL;

-- 4. Drop the old column
ALTER TABLE leads DROP COLUMN IF EXISTS name;
