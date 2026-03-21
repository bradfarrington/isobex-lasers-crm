-- ============================================================
-- Online Store Schema — Phase 2
-- Store Config, Orders, Discounts, Gift Cards, Shipping
-- ============================================================

-- ─── Add slug column to products ────────────────────────────
alter table products add column if not exists slug text unique;

-- ─── Add slug column to collections ─────────────────────────
alter table collections add column if not exists slug text unique;

-- ─── Add weight column to products ──────────────────────────
alter table products add column if not exists weight_kg numeric(8,3) default 0;

-- ─── Add compare_at_price to product_variants ───────────────
-- (may already exist from earlier migration, safe to re-run)
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'product_variants' and column_name = 'compare_at_price'
  ) then
    alter table product_variants add column compare_at_price numeric(10,2);
  end if;
end $$;

-- ─── Store Config (singleton — one row) ─────────────────────
create table if not exists store_config (
  id uuid primary key default gen_random_uuid(),
  -- Brand
  store_name text default 'My Store',
  tagline text,
  logo_url text,
  favicon_url text,
  -- Colours
  color_primary text default '#2563eb',
  color_secondary text default '#1e40af',
  color_accent text default '#f59e0b',
  color_background text default '#ffffff',
  color_surface text default '#f8fafc',
  color_text text default '#0f172a',
  color_text_secondary text default '#64748b',
  -- Typography
  font_heading text default 'Inter',
  font_body text default 'Inter',
  -- Header
  announcement_bar_text text,
  announcement_bar_active boolean default false,
  header_layout jsonb default '{"logo_position":"left","nav_links":[]}',
  -- Footer
  footer_config jsonb default '{"columns":[],"social_links":[],"copyright":""}',
  -- Homepage
  hero_image_url text,
  hero_title text default 'Welcome to our store',
  hero_subtitle text,
  hero_cta_text text default 'Shop Now',
  hero_cta_link text default '/shop/products',
  featured_collection_ids jsonb default '[]',
  featured_product_ids jsonb default '[]',
  -- SEO defaults
  seo_title text,
  seo_description text,
  seo_image_url text,
  -- Domain
  custom_domain text,
  -- Misc
  currency_symbol text default '£',
  currency_code text default 'GBP',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table store_config enable row level security;
create policy "Public read store_config" on store_config for select using (true);
create policy "Public insert store_config" on store_config for insert with check (true);
create policy "Public update store_config" on store_config for update using (true);

-- ─── Shipping Zones ─────────────────────────────────────────
create table if not exists shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  countries jsonb default '["GB"]',
  is_default boolean default false,
  created_at timestamptz default now()
);

alter table shipping_zones enable row level security;
create policy "Public read shipping_zones" on shipping_zones for select using (true);
create policy "Public insert shipping_zones" on shipping_zones for insert with check (true);
create policy "Public update shipping_zones" on shipping_zones for update using (true);
create policy "Public delete shipping_zones" on shipping_zones for delete using (true);

-- ─── Shipping Rates ─────────────────────────────────────────
create table if not exists shipping_rates (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references shipping_zones(id) on delete cascade,
  name text not null,                          -- e.g. "Standard", "Next Day", "Premium"
  min_weight_kg numeric(8,3) default 0,
  max_weight_kg numeric(8,3) default 999,
  price numeric(10,2) not null default 0,
  estimated_days_min int default 3,
  estimated_days_max int default 5,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table shipping_rates enable row level security;
create policy "Public read shipping_rates" on shipping_rates for select using (true);
create policy "Public insert shipping_rates" on shipping_rates for insert with check (true);
create policy "Public update shipping_rates" on shipping_rates for update using (true);
create policy "Public delete shipping_rates" on shipping_rates for delete using (true);

-- ─── Orders ─────────────────────────────────────────────────
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number serial,
  contact_id uuid references contacts(id) on delete set null,
  -- Customer info (snapshot at time of order)
  customer_email text not null,
  customer_name text not null,
  customer_phone text,
  -- Shipping
  shipping_address jsonb,                      -- {line1, line2, city, county, postcode, country}
  shipping_method text,                        -- e.g. "Standard", "Next Day"
  shipping_cost numeric(10,2) default 0,
  -- Totals
  subtotal numeric(10,2) not null default 0,
  discount_amount numeric(10,2) default 0,
  discount_code text,
  gift_card_amount numeric(10,2) default 0,
  gift_card_code text,
  tax_amount numeric(10,2) default 0,
  total numeric(10,2) not null default 0,
  -- Status
  status text not null default 'pending'
    check (status in ('pending','paid','processing','shipped','delivered','cancelled','refunded')),
  -- Payment (Stripe placeholder)
  payment_intent_id text,
  payment_status text default 'unpaid'
    check (payment_status in ('unpaid','paid','refunded','failed')),
  -- Notes
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table orders enable row level security;
create policy "Public read orders" on orders for select using (true);
create policy "Public insert orders" on orders for insert with check (true);
create policy "Public update orders" on orders for update using (true);
create policy "Public delete orders" on orders for delete using (true);

-- ─── Order Items ────────────────────────────────────────────
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variant_id uuid references product_variants(id) on delete set null,
  -- Snapshots (in case product is later changed/deleted)
  product_name text not null,
  variant_label text,
  product_image_url text,
  sku text,
  -- Pricing
  quantity int not null default 1,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null,
  -- Weight (for shipping calc snapshot)
  unit_weight_kg numeric(8,3) default 0,
  created_at timestamptz default now()
);

alter table order_items enable row level security;
create policy "Public read order_items" on order_items for select using (true);
create policy "Public insert order_items" on order_items for insert with check (true);
create policy "Public update order_items" on order_items for update using (true);
create policy "Public delete order_items" on order_items for delete using (true);

-- ─── Discount Codes ─────────────────────────────────────────
create table if not exists discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null default 'percentage'
    check (discount_type in ('percentage', 'fixed')),
  value numeric(10,2) not null default 0,      -- e.g. 10 for 10% or £10
  min_order_amount numeric(10,2) default 0,
  max_uses int,                                 -- null = unlimited
  current_uses int default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table discount_codes enable row level security;
create policy "Public read discount_codes" on discount_codes for select using (true);
create policy "Public insert discount_codes" on discount_codes for insert with check (true);
create policy "Public update discount_codes" on discount_codes for update using (true);
create policy "Public delete discount_codes" on discount_codes for delete using (true);

-- ─── Gift Cards ─────────────────────────────────────────────
create table if not exists gift_cards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  initial_balance numeric(10,2) not null default 0,
  current_balance numeric(10,2) not null default 0,
  purchaser_email text,
  recipient_email text,
  recipient_name text,
  message text,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table gift_cards enable row level security;
create policy "Public read gift_cards" on gift_cards for select using (true);
create policy "Public insert gift_cards" on gift_cards for insert with check (true);
create policy "Public update gift_cards" on gift_cards for update using (true);
create policy "Public delete gift_cards" on gift_cards for delete using (true);

-- ─── Page SEO (per-page meta overrides) ─────────────────────
create table if not exists page_seo (
  id uuid primary key default gen_random_uuid(),
  page_key text not null unique,               -- e.g. 'home', 'products', 'collections', 'cart', 'checkout'
  meta_title text,
  meta_description text,
  og_image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table page_seo enable row level security;
create policy "Public read page_seo" on page_seo for select using (true);
create policy "Public insert page_seo" on page_seo for insert with check (true);
create policy "Public update page_seo" on page_seo for update using (true);
create policy "Public delete page_seo" on page_seo for delete using (true);

-- ─── Updated-at triggers for new tables ─────────────────────
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_store_config_updated_at') then
    create trigger set_store_config_updated_at
      before update on store_config for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_orders_updated_at') then
    create trigger set_orders_updated_at
      before update on orders for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_discount_codes_updated_at') then
    create trigger set_discount_codes_updated_at
      before update on discount_codes for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_gift_cards_updated_at') then
    create trigger set_gift_cards_updated_at
      before update on gift_cards for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_page_seo_updated_at') then
    create trigger set_page_seo_updated_at
      before update on page_seo for each row execute function set_updated_at();
  end if;
end $$;

-- ─── Insert default store config if none exists ─────────────
insert into store_config (store_name)
select 'Isobex Lasers'
where not exists (select 1 from store_config);

-- ─── Insert default shipping zone (UK) ──────────────────────
insert into shipping_zones (name, countries, is_default)
select 'United Kingdom', '["GB"]'::jsonb, true
where not exists (select 1 from shipping_zones where is_default = true);
