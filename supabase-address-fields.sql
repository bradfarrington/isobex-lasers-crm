-- =============================================
-- Migration: Structured address fields for companies
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. Add structured address columns
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_line_1 TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_line_2 TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS county TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS postcode TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country TEXT;

-- 2. Migrate existing address data into address_line_1
UPDATE companies SET address_line_1 = address WHERE address IS NOT NULL;

-- 3. Drop the old single address column
ALTER TABLE companies DROP COLUMN IF EXISTS address;
