-- ══════════════════════════════════════════
-- Pipelines & Pipeline Stages
-- ══════════════════════════════════════════

-- Pipelines table
create table if not exists public.pipelines (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.update_pipelines_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_pipelines_updated_at
  before update on public.pipelines
  for each row
  execute function public.update_pipelines_updated_at();

-- Pipeline stages table
create table if not exists public.pipeline_stages (
  id          uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  name        text not null,
  color       text not null default '#6b7280',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Pipeline deals (cards) table
create table if not exists public.pipeline_deals (
  id          uuid primary key default gen_random_uuid(),
  stage_id    uuid not null references public.pipeline_stages(id) on delete cascade,
  contact_id  uuid not null references public.contacts(id) on delete cascade,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at on deals
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

-- RLS policies (match existing app pattern — anon full access)
alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.pipeline_deals enable row level security;

create policy "Allow all on pipelines"
  on public.pipelines for all
  using (true) with check (true);

create policy "Allow all on pipeline_stages"
  on public.pipeline_stages for all
  using (true) with check (true);

create policy "Allow all on pipeline_deals"
  on public.pipeline_deals for all
  using (true) with check (true);
