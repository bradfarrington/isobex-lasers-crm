-- ═══════════════════════════════════════════════════════
-- App Users (team management / role-based permissions)
-- ═══════════════════════════════════════════════════════

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete cascade unique not null,
  email text not null,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('owner','admin','staff')),
  permissions jsonb not null default '{
    "dashboard": true,
    "crm": true,
    "companies": true,
    "pipeline": true,
    "store": false,
    "orders": false,
    "email_marketing": false,
    "reviews": false,
    "documents": false,
    "installations": false,
    "support": false,
    "reporting": false,
    "settings": false
  }'::jsonb,
  status text not null default 'active' check (status in ('active','invited','deactivated')),
  invited_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Helper function (bypasses RLS to avoid infinite recursion) ───

create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.app_users where auth_user_id = auth.uid() limit 1;
$$;

-- ─── RLS ──────────────────────────────────────────────

alter table app_users enable row level security;

-- All authenticated users can read their own row
create policy "Users can read own profile"
  on app_users for select
  using (auth.uid() = auth_user_id);

-- Owners/admins can read all user rows
create policy "Admins can read all users"
  on app_users for select
  using (
    public.get_my_role() in ('owner','admin')
  );

-- Owners/admins can insert new users
create policy "Admins can insert users"
  on app_users for insert
  with check (
    public.get_my_role() in ('owner','admin')
  );

-- Owners/admins can update any user
create policy "Admins can update users"
  on app_users for update
  using (
    public.get_my_role() in ('owner','admin')
  );

-- Owners/admins can delete users
create policy "Admins can delete users"
  on app_users for delete
  using (
    public.get_my_role() in ('owner','admin')
  );
