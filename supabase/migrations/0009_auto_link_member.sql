-- Right now linking a login (profiles) to a team_members row is 100%
-- manual: an admin has to open the member's "Nexa" tab and pick the
-- account from the "Cuenta vinculada (login)" dropdown. Members who sign
-- up before that happens land on /me and just see "Todavía no estás
-- vinculado" — no availability editor, nowhere to add their horario, which
-- is exactly what people are reporting as "no encuentro el botón para
-- agregar el horario". This migration auto-links by exact, unambiguous
-- email match, in both directions, the moment either side shows up:
--   - a new profile signs up matching an existing (unlinked) member, or
--   - an admin/líder creates a member matching an existing (unlinked) login.
-- Ambiguous matches (more than one account/member sharing an email) are
-- left alone, same safety rule as the one-time backfill in
-- 0001_team_members.sql — an admin still resolves those by hand.
--
-- profile_id is otherwise locked out for non-admins by
-- enforce_self_editable_columns (BEFORE UPDATE trigger). The linking
-- function below sets a transaction-local flag that trigger explicitly
-- allows through — the one legitimate non-admin path allowed to touch
-- profile_id.

create or replace function try_auto_link_member(p_member_id uuid, p_profile_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  perform set_config('nexa.auto_link', 'on', true);
  update team_members set profile_id = p_profile_id where id = p_member_id;
  perform set_config('nexa.auto_link', 'off', true);
end;
$$;

create or replace function enforce_self_editable_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  auto_linking boolean := current_setting('nexa.auto_link', true) = 'on';
begin
  if is_admin() then
    return new;
  end if;

  if is_leader() then
    new.email := old.email;
    new.full_name := old.full_name;
    new.join_date := old.join_date;
    if not auto_linking then
      new.profile_id := old.profile_id;
    end if;
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
  if not auto_linking then
    new.profile_id := old.profile_id;
  end if;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;

-- New login shows up: link it to a waiting, unambiguous member row.
create or replace function auto_link_on_profile_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_member_id uuid;
  v_matches int;
begin
  select count(*), min(tm.id) into v_matches, v_member_id
  from team_members tm
  where tm.profile_id is null
    and tm.email is not null
    and lower(tm.email) = lower(new.email);

  if v_matches = 1 then
    perform try_auto_link_member(v_member_id, new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_auto_link_member on profiles;
create trigger profiles_auto_link_member
  after insert on profiles
  for each row execute procedure auto_link_on_profile_insert();

-- New member row shows up (created by admin/líder): link it to a waiting,
-- unambiguous login.
create or replace function auto_link_on_member_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile_id uuid;
  v_matches int;
begin
  if new.email is null or new.profile_id is not null then
    return new;
  end if;

  select count(*), min(p.id) into v_matches, v_profile_id
  from profiles p
  where lower(p.email) = lower(new.email)
    and not exists (select 1 from team_members tm2 where tm2.profile_id = p.id);

  if v_matches = 1 then
    perform try_auto_link_member(new.id, v_profile_id);
  end if;

  return new;
end;
$$;

drop trigger if exists team_members_auto_link_profile on team_members;
create trigger team_members_auto_link_profile
  after insert on team_members
  for each row execute procedure auto_link_on_member_insert();

-- One-time catch-up for pairs that already exist today and predate this
-- trigger (mirrors 0001's backfill, run through the same bypass so it
-- isn't reverted by the column lock).
do $$
declare
  r record;
begin
  perform set_config('nexa.auto_link', 'on', true);
  for r in
    select tm.id as member_id, p.id as profile_id
    from team_members tm
    join profiles p on lower(p.email) = lower(tm.email)
    where tm.profile_id is null
      and tm.email is not null
      and (select count(*) from team_members tm2 where lower(tm2.email) = lower(tm.email)) = 1
      and (select count(*) from profiles p2 where lower(p2.email) = lower(tm.email)) = 1
      and not exists (select 1 from team_members tm3 where tm3.profile_id = p.id)
  loop
    update team_members set profile_id = r.profile_id where id = r.member_id;
  end loop;
  perform set_config('nexa.auto_link', 'off', true);
end;
$$;
