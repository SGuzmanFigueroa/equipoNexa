-- The real team roster (Sebastián's spreadsheet) is a candidate/profile
-- sheet, not an HR join-date log: age, career, last job, LinkedIn, GitHub,
-- skills, favorite career area. None of it includes fecha de ingreso or an
-- internal Nexa area/cargo assignment, so join_date becomes optional
-- (filled in later per person) and these new columns are separate from the
-- existing internal-facing area/position/collaboration_type.

alter table team_members alter column join_date drop not null;

alter table team_members
  add column age integer,
  add column career text,
  add column last_job_role text,
  add column linkedin_url text,
  add column github_username text,
  add column skills text,
  add column favorite_area text;
