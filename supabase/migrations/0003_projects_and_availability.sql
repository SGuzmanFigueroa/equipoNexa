-- Reuse bug-tracker's existing `projects` table (Inventra, etc.) as the
-- canonical project list instead of creating a second one — both apps
-- share one Supabase project, this keeps "what are Nexa's projects" a
-- single source of truth. Add the other Nexa frentes as projects, plus a
-- many-to-many assignment (a person can be on more than one project) and a
-- weekly recurring availability grid per member so admin can combine
-- schedules and find overlapping free time.

insert into projects (name, slug, code, description) values
  ('Marketplace de Tickets', 'marketplace-tickets', 'MKT', 'Marketplace de entradas para eventos pequeños.'),
  ('Alquileres', 'alquileres', 'ALQ', 'Cobro e historial del inquilino, alcance nacional.'),
  ('Consultoría y Servicios', 'consultoria-servicios', 'CONS', 'Landing, presencia digital, automatización, QA para clientes.'),
  ('Nexa Core', 'nexa-core', 'CORE', 'Gestión interna de clientes, facturación y gastos de Nexa.'),
  ('Bug Tracker / QA', 'bug-tracker-qa', 'BUG', 'Mantenimiento del propio gestor de tickets de bugs.')
on conflict (slug) do nothing;

create table team_member_projects (
  member_id uuid not null references team_members (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  primary key (member_id, project_id)
);

-- day_of_week: 0 = Lunes ... 6 = Domingo. hour: 7..22 (slot start, 1h blocks).
create table team_member_availability (
  member_id uuid not null references team_members (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  hour smallint not null check (hour between 7 and 22),
  primary key (member_id, day_of_week, hour)
);

create index team_member_availability_member_id_idx on team_member_availability (member_id);

alter table team_member_projects enable row level security;
alter table team_member_availability enable row level security;

create policy "admins manage team member projects"
  on team_member_projects for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "admins manage team member availability"
  on team_member_availability for all
  to authenticated
  using (is_admin())
  with check (is_admin());
