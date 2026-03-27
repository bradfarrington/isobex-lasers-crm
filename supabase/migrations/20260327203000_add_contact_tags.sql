-- Tags: global tag registry
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text,
  created_at timestamptz not null default now()
);

-- Contact-tag assignments (many-to-many)
create table if not exists contact_tags (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (contact_id, tag_id)
);

-- Indexes
create index if not exists idx_contact_tags_contact on contact_tags(contact_id);
create index if not exists idx_contact_tags_tag on contact_tags(tag_id);

-- RLS
alter table tags enable row level security;
alter table contact_tags enable row level security;

create policy "Authenticated users can manage tags"
  on tags for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage contact_tags"
  on contact_tags for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
