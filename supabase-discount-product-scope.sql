-- Add product scope columns to discount_codes
ALTER TABLE discount_codes
  ADD COLUMN applies_to TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN product_ids UUID[] NOT NULL DEFAULT '{}';
