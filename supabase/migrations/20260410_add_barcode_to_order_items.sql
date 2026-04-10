-- Add barcode column to order_items table
-- This allows the barcode to be stored on each order item for label printing and order detail display
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS barcode text DEFAULT NULL;
