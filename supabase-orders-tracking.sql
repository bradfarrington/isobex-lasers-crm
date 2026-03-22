-- ============================================================
-- Add tracking_number + tracking_url to orders table
-- Run this in the Supabase SQL Editor
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url text;
