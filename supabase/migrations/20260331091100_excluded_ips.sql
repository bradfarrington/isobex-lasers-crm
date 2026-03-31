-- Excluded IP addresses for analytics filtering
create table if not exists excluded_ips (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null unique,
  label text,
  created_at timestamptz not null default now()
);

-- Allow authenticated users to manage
alter table excluded_ips enable row level security;

create policy "Authenticated users can manage excluded IPs"
  on excluded_ips for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
