-- "Líder": an equipo-nexa-only permission tier, deliberately NOT reusing
-- bug-tracker's shared profiles.role enum (that enum is about engineering
-- function — QA/dev/backend/frontend — a different axis than "leadership
-- in Nexa"). Tracked as a flag on team_members instead, since a leader is
-- fundamentally a team member with extra rights, not a different kind of
-- login.

alter table team_members add column is_leader boolean not null default false;

create function is_leader()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from team_members
    where profile_id = auth.uid() and is_leader = true
  );
$$;

-- Leaders can see and create any team member (this is the "aprobar
-- nuevos" workflow), and update most fields on existing ones — but the
-- update trigger below still locks identity/hire fields for them.
create policy "leaders can view all team members"
  on team_members for select
  to authenticated
  using (is_leader());

create policy "leaders can create team members"
  on team_members for insert
  to authenticated
  with check (is_leader());

create policy "leaders can update team members"
  on team_members for update
  to authenticated
  using (is_leader())
  with check (is_leader());

create policy "leaders manage team member tracking"
  on team_member_tracking for all
  to authenticated
  using (is_leader())
  with check (is_leader());

create policy "leaders manage team member projects"
  on team_member_projects for all
  to authenticated
  using (is_leader())
  with check (is_leader());

create policy "leaders manage team member availability"
  on team_member_availability for all
  to authenticated
  using (is_leader())
  with check (is_leader());

-- Extend the existing self-edit lock trigger with a leader tier: leaders
-- can change almost anything on an EXISTING row except identity/hire-date
-- fields and the leader flag itself (they set those freely when creating
-- a new member — this trigger only fires on UPDATE, never INSERT).
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
    new.is_leader := old.is_leader;
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
  new.is_leader := old.is_leader;
  return new;
end;
$$;
