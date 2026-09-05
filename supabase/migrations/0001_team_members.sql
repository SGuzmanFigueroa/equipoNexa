-- Team roster (integrantes de Nexa) + seguimiento history.
-- Reuses profiles / is_admin() / set_updated_at() from the bug-tracker schema
-- already in this Supabase project — run bug-tracker's 0001_init.sql first if
-- starting from a fresh project.

create type member_status as enum ('activo', 'pausado', 'retirado');

create table team_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  area text,
  position text,
  collaboration_type text,
  join_date date not null,
  end_date date,
  status member_status not null default 'activo',
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index team_members_status_idx on team_members (status);

create trigger team_members_set_updated_at
  before update on team_members
  for each row execute procedure set_updated_at();

create table team_member_tracking (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references team_members (id) on delete cascade,
  entry_date date not null default current_date,
  note text not null,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index team_member_tracking_member_id_idx on team_member_tracking (member_id);

alter table team_members enable row level security;
alter table team_member_tracking enable row level security;

create policy "admins manage team members"
  on team_members for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "admins manage team member tracking"
  on team_member_tracking for all
  to authenticated
  using (is_admin())
  with check (is_admin());
