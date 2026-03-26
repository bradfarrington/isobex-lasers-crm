-- Migration adding analytics tracking tables

CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  title TEXT,
  referrer TEXT,
  user_agent TEXT,
  device_type TEXT,
  active_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics querying
CREATE INDEX idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX idx_page_views_session_id ON page_views(session_id);

CREATE TABLE IF NOT EXISTS ecommerce_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- view_item, add_to_cart, begin_checkout, purchase
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  value NUMERIC,
  currency TEXT DEFAULT 'GBP',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ecommerce_events_created_at ON ecommerce_events(created_at DESC);
CREATE INDEX idx_ecommerce_events_type ON ecommerce_events(event_type);

-- Enable RLS
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecommerce_events ENABLE ROW LEVEL SECURITY;

-- Staff/Users can view all everything
CREATE POLICY "Allow authenticated full access to page_views" 
ON page_views FOR ALL TO authenticated USING (true);

-- Anonymous can insert tracking
CREATE POLICY "Allow anonymous inserts to page_views"
ON page_views FOR INSERT TO anon WITH CHECK (true);

-- Anonymous can update their own session hits (e.g. for active_seconds Ping)
CREATE POLICY "Allow anonymous updates to page_views"
ON page_views FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to ecommerce_events" 
ON ecommerce_events FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow anonymous inserts to ecommerce_events"
ON ecommerce_events FOR INSERT TO anon WITH CHECK (true);
