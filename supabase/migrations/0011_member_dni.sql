-- DNI obligatorio para todo integrante (8 dígitos, único). Se pide al
-- registrar un integrante, en /me y en el aviso de datos pendientes.
-- Igual que área/fecha de ingreso: el propio integrante (o líder sobre su
-- propia ficha) solo puede escribirlo mientras esté vacío; después, solo un
-- admin lo cambia. Un líder nunca cambia el DNI de otra persona.

alter table team_members add column if not exists dni text;

alter table team_members drop constraint if exists team_members_dni_format;
alter table team_members
  add constraint team_members_dni_format check (dni is null or dni ~ '^[0-9]{8}$');

create unique index if not exists team_members_dni_unique on team_members (dni) where dni is not null;

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
    if not (is_own_row and old.dni is null) then
      new.dni := old.dni;
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
  if old.dni is not null then
    new.dni := old.dni;
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
