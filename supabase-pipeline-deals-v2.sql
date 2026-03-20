-- ══════════════════════════════════════════
-- Pipeline Deals v2 — Full migration (safe to re-run)
-- ══════════════════════════════════════════

-- 1. Create pipeline_deals table (if it doesn't exist yet)
create table if not exists public.pipeline_deals (
  id          uuid primary key default gen_random_uuid(),
  stage_id    uuid not null references public.pipeline_stages(id) on delete cascade,
  contact_id  uuid not null references public.contacts(id) on delete cascade,
  sort_order  integer not null default 0,
  field_data  jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at on deals (drop first to avoid "already exists" error)
drop trigger if exists trg_pipeline_deals_updated_at on public.pipeline_deals;

create or replace function public.update_pipeline_deals_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_pipeline_deals_updated_at
  before update on public.pipeline_deals
  for each row
  execute function public.update_pipeline_deals_updated_at();

-- If the table already existed but was missing field_data, add it
alter table public.pipeline_deals
  add column if not exists field_data jsonb not null default '{}';

-- RLS on pipeline_deals
alter table public.pipeline_deals enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'pipeline_deals' and policyname = 'Allow all on pipeline_deals'
  ) then
    create policy "Allow all on pipeline_deals"
      on public.pipeline_deals for all
      using (true) with check (true);
  end if;
end $$;

-- 2. Master field definitions
create table if not exists public.pipeline_card_fields (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  label       text not null,
  field_type  text not null,
  field_options jsonb default null,
  is_default  boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Seed starter fields
insert into public.pipeline_card_fields (key, label, field_type, field_options, is_default, sort_order) values
  ('deal_name',           'Deal Name',      'text',     null, true, 0),
  ('value',               'Value (£)',      'number',   null, true, 1),
  ('expected_close_date', 'Expected Close', 'date',     null, true, 2),
  ('priority',            'Priority',       'select',   '{"choices":["Low","Medium","High"]}', true, 3),
  ('notes',               'Notes',          'textarea', null, true, 4)
on conflict (key) do nothing;

-- 3. Per-pipeline field config
create table if not exists public.pipeline_field_config (
  id          uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  field_id    uuid not null references public.pipeline_card_fields(id) on delete cascade,
  enabled     boolean not null default true,
  sort_order  integer not null default 0,
  unique (pipeline_id, field_id)
);

-- 4. RLS on new tables
alter table public.pipeline_card_fields enable row level security;
alter table public.pipeline_field_config enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'pipeline_card_fields' and policyname = 'Allow all on pipeline_card_fields'
  ) then
    create policy "Allow all on pipeline_card_fields"
      on public.pipeline_card_fields for all
      using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'pipeline_field_config' and policyname = 'Allow all on pipeline_field_config'
  ) then
    create policy "Allow all on pipeline_field_config"
      on public.pipeline_field_config for all
      using (true) with check (true);
  end if;
end $$;
