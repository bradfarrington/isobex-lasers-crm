-- ============================================================
-- Add company_id to orders table
-- Run this in the Supabase SQL Editor BEFORE the import script
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
