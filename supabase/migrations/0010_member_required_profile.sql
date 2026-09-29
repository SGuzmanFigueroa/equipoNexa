-- /me now asks every member to complete their profile on entry: full
-- name, phone, role (position), LinkedIn, skills, área en Nexa and fecha
-- de ingreso are required. Until now the self-edit whitelist silently
-- reverted full_name, linkedin_url, skills, area and join_date, so the
-- member could never fill them in.
--
-- New self-edit rules (on your OWN row, as a regular member or as a
-- líder):
--   - full_name, linkedin_url, skills: freely editable (plus the previous
--     age, career, phone, github_username, favorite_area, position).
--   - area, join_date: can be set only while still empty — once filled in,
--     only an admin changes them (líder keeps its existing area rights on
--     other members' rows).
-- Everything else stays as in 0009.

create or replace function enforce_self_editable_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  auto_linking boolean := current_setting('nexa.auto_link', true) = 'on';
  is_own_row boolean := old.profile_id is not null and old.profile_id = auth.uid();
begin
  if is_admin() then
    return new;
  end if;

  if is_leader() then
    new.email := old.email;
    if not is_own_row then
      new.full_name := old.full_name;
    end if;
    if not (is_own_row and old.join_date is null) then
      new.join_date := old.join_date;
    end if;
    if not auto_linking then
      new.profile_id := old.profile_id;
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    return new;
  end if;

  -- Regular self-edit: narrow whitelist only.
  new.email := old.email;
  new.last_job_role := old.last_job_role;
  if old.area is not null then
    new.area := old.area;
  end if;
  new.collaboration_type := old.collaboration_type;
  -- end_date (fin de prácticas) is derived from join_date by the app, so it
  -- may only be written together with that first join_date.
  if old.join_date is not null then
    new.join_date := old.join_date;
    new.end_date := old.end_date;
  end if;
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
