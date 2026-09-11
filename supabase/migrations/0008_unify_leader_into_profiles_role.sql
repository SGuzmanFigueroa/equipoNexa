-- Superseded team_members.is_leader (from 0007_leader_role.sql) with the
-- shared profiles.role = 'lider' value instead — Sebastián expected "Líder"
-- to show up as an option in bug-tracker's Usuarios y roles dropdown
-- alongside Admin/QA/Developer/Backend/Frontend, not live as a separate
-- checkbox only equipo-nexa knew about. One role, one place to assign it,
-- read the same way in both apps.
--
-- Run bug-tracker's 0008_unify_lider_role.sql first (or in the same
-- deploy) — it adds 'lider' to the shared user_role enum this migration
-- depends on.

create or replace function is_leader()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'lider'::user_role
  );
$$;

alter table team_members drop column is_leader;

create or replace function enforce_self_editable_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if is_admin() then
    return new;
  end if;

  if is_leader() then
    new.email := old.email;
    new.full_name := old.full_name;
    new.join_date := old.join_date;
    new.profile_id := old.profile_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    return new;
  end if;

  -- Regular self-edit: narrow whitelist only.
  new.full_name := old.full_name;
  new.email := old.email;
  new.last_job_role := old.last_job_role;
  new.linkedin_url := old.linkedin_url;
  new.skills := old.skills;
  new.area := old.area;
  new.collaboration_type := old.collaboration_type;
  new.join_date := old.join_date;
  new.end_date := old.end_date;
  new.status := old.status;
  new.notes := old.notes;
  new.profile_id := old.profile_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;
