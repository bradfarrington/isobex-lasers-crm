-- ============================================================
-- Online Store Schema — Phase 1
-- Products, Collections, Variants, Media, Labels
-- ============================================================

-- ─── Product Labels (Settings-managed lookup) ───────────────
create table if not exists product_labels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text default '#6b7280',
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table product_labels enable row level security;
create policy "Public read product_labels" on product_labels for select using (true);
create policy "Public insert product_labels" on product_labels for insert with check (true);
create policy "Public update product_labels" on product_labels for update using (true);
create policy "Public delete product_labels" on product_labels for delete using (true);

-- ─── Collections ────────────────────────────────────────────
create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cover_image_url text,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table collections enable row level security;
create policy "Public read collections" on collections for select using (true);
create policy "Public insert collections" on collections for insert with check (true);
create policy "Public update collections" on collections for update using (true);
create policy "Public delete collections" on collections for delete using (true);

-- ─── Products ───────────────────────────────────────────────
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  product_type text not null default 'physical' check (product_type in ('physical', 'digital')),
  price numeric(10,2) not null default 0,
  compare_at_price numeric(10,2),
  sku text,
  is_visible boolean default false,
  stock_quantity int default 0,
  min_stock_threshold int default 0,
  pack_quantity int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table products enable row level security;
create policy "Public read products" on products for select using (true);
create policy "Public insert products" on products for insert with check (true);
create policy "Public update products" on products for update using (true);
create policy "Public delete products" on products for delete using (true);

-- ─── Product ↔ Label assignments (many-to-many) ─────────────
create table if not exists product_label_assignments (
  product_id uuid not null references products(id) on delete cascade,
  label_id uuid not null references product_labels(id) on delete cascade,
  primary key (product_id, label_id)
);

alter table product_label_assignments enable row level security;
create policy "Public read product_label_assignments" on product_label_assignments for select using (true);
create policy "Public insert product_label_assignments" on product_label_assignments for insert with check (true);
create policy "Public delete product_label_assignments" on product_label_assignments for delete using (true);

-- ─── Product ↔ Collection assignments (many-to-many) ────────
create table if not exists product_collection_assignments (
  product_id uuid not null references products(id) on delete cascade,
  collection_id uuid not null references collections(id) on delete cascade,
  primary key (product_id, collection_id)
);

alter table product_collection_assignments enable row level security;
create policy "Public read product_collection_assignments" on product_collection_assignments for select using (true);
create policy "Public insert product_collection_assignments" on product_collection_assignments for insert with check (true);
create policy "Public delete product_collection_assignments" on product_collection_assignments for delete using (true);

-- ─── Product Media ──────────────────────────────────────────
create table if not exists product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  media_url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video', 'document')),
  file_name text,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table product_media enable row level security;
create policy "Public read product_media" on product_media for select using (true);
create policy "Public insert product_media" on product_media for insert with check (true);
create policy "Public update product_media" on product_media for update using (true);
create policy "Public delete product_media" on product_media for delete using (true);

-- ─── Product Option Groups (Size, Colour, etc.) ─────────────
create table if not exists product_option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  sort_order int default 0
);

alter table product_option_groups enable row level security;
create policy "Public read product_option_groups" on product_option_groups for select using (true);
create policy "Public insert product_option_groups" on product_option_groups for insert with check (true);
create policy "Public update product_option_groups" on product_option_groups for update using (true);
create policy "Public delete product_option_groups" on product_option_groups for delete using (true);

-- ─── Product Option Values (S, M, L, Red, Blue, etc.) ───────
create table if not exists product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references product_option_groups(id) on delete cascade,
  value text not null,
  sort_order int default 0
);

alter table product_option_values enable row level security;
create policy "Public read product_option_values" on product_option_values for select using (true);
create policy "Public insert product_option_values" on product_option_values for insert with check (true);
create policy "Public update product_option_values" on product_option_values for update using (true);
create policy "Public delete product_option_values" on product_option_values for delete using (true);

-- ─── Product Variants (auto-generated combinations) ─────────
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  option_values jsonb not null default '[]',
  price_override numeric(10,2),
  sku text,
  stock_quantity int default 0,
  created_at timestamptz default now()
);

alter table product_variants enable row level security;
create policy "Public read product_variants" on product_variants for select using (true);
create policy "Public insert product_variants" on product_variants for insert with check (true);
create policy "Public update product_variants" on product_variants for update using (true);
create policy "Public delete product_variants" on product_variants for delete using (true);

-- ─── Updated-at triggers ────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Only create triggers if they don't exist (safe for re-runs)
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_products_updated_at') then
    create trigger set_products_updated_at
      before update on products
      for each row execute function set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_collections_updated_at') then
    create trigger set_collections_updated_at
      before update on collections
      for each row execute function set_updated_at();
  end if;
end $$;
