-- Migration: Add Barcodes to Products and Variants

ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;

ALTER TABLE public.product_variants 
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;

-- Populate existing products with unique 12-char codes (e.g. ISO-A1B2C3D4)
UPDATE public.products 
SET barcode = 'ISO-' || upper(substr(md5(random()::text), 1, 8))
WHERE barcode IS NULL;

-- Populate existing variants
UPDATE public.product_variants 
SET barcode = 'ISO-' || upper(substr(md5(random()::text), 1, 8))
WHERE barcode IS NULL;
