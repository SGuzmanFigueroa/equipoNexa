-- Link a team_members row to the login account (profiles) that belongs to
-- that person, so they can log in and self-manage a narrow slice of their
-- own record (their availability) while every other field on team_members
-- stays admin-only ("campos bloqueados por admin").

alter table team_members
  add column profile_id uuid unique references profiles (id) on delete set null;

-- Backfill: link unambiguous exact email matches only (some people have
-- more than one account, e.g. duplicate signups — those stay unlinked
-- until an admin picks the right one manually).
update team_members tm
set profile_id = p.id
from profiles p
where tm.email is not null
  and lower(tm.email) = lower(p.email)
  and tm.profile_id is null
  and (select count(*) from profiles p2 where lower(p2.email) = lower(tm.email)) = 1;

-- A member can read their own team_members row (status, area, proyectos, etc.)
-- but has no update/insert/delete policy on it at all — those stay admin-only.
create policy "members can view own record"
  on team_members for select
  to authenticated
  using (profile_id = auth.uid());

create policy "members can view own project assignments"
  on team_member_projects for select
  to authenticated
  using (
    exists (
      select 1 from team_members tm
      where tm.id = team_member_projects.member_id and tm.profile_id = auth.uid()
    )
  );

-- The one thing a member can actually write: their own weekly availability.
create policy "members can manage own availability"
  on team_member_availability for all
  to authenticated
  using (
    exists (
      select 1 from team_members tm
      where tm.id = team_member_availability.member_id and tm.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from team_members tm
      where tm.id = team_member_availability.member_id and tm.profile_id = auth.uid()
    )
  );
