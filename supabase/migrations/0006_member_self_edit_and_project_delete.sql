-- Let a member edit a whitelisted slice of their own profile (age, career,
-- phone, github_username, favorite_area, position) and manage their own
-- project assignments — while everything else on team_members (status,
-- area, join_date, notes, full_name, email, last_job_role,
-- collaboration_type, profile_id...) stays admin-only, enforced by a
-- trigger rather than just app code, since RLS itself can't do
-- column-level restriction and both admin and self hit the same Postgres
-- role through PostgREST.

create policy "members can update own row"
  on team_members for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create function enforce_self_editable_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if is_admin() then
    return new;
  end if;

  -- Non-admin update (must be the linked self, per the RLS policy above):
  -- silently keep every column except the whitelisted self-editable ones.
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
  -- Stay editable by self: age, career, phone, github_username,
  -- favorite_area, position.
  return new;
end;
$$;

create trigger team_members_lock_admin_fields
  before update on team_members
  for each row execute procedure enforce_self_editable_columns();

-- Self can now also add/remove their own project assignments (superset of
-- the earlier view-only policy, which stays but is now redundant).
create policy "members can manage own project assignments"
  on team_member_projects for all
  to authenticated
  using (
    exists (
      select 1 from team_members tm
      where tm.id = team_member_projects.member_id and tm.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from team_members tm
      where tm.id = team_member_projects.member_id and tm.profile_id = auth.uid()
    )
  );
