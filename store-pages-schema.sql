-- ============================================================
-- Store Pages — Block-based page builder
-- ============================================================
-- Run this against your Supabase database to create the
-- page builder tables.
-- ============================================================

CREATE TABLE IF NOT EXISTS store_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  blocks JSONB NOT NULL DEFAULT '[]',
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE store_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_pages_all" ON store_pages
  FOR ALL USING (true) WITH CHECK (true);

-- Default pages
INSERT INTO store_pages (page_key, title, blocks) VALUES
  ('home', 'Home', '[]'),
  ('products', 'Products List', '[]'),
  ('product_detail', 'Product Detail', '[]'),
  ('collections', 'Collections', '[]'),
  ('checkout', 'Checkout', '[]'),
  ('thank_you', 'Thank You', '[]')
ON CONFLICT (page_key) DO NOTHING;
