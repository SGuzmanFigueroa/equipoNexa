-- Move from binary (marked/unmarked) availability to three states, so the
-- grid can actually distinguish "libre" from "probablemente ocupado" from
-- "ocupado" instead of only tracking "free or nothing". Existing rows
-- (entered under the old binary model) default to 'libre', which matches
-- what they meant at the time.

alter table team_member_availability
  add column status text not null default 'libre'
  check (status in ('libre', 'tentativo', 'ocupado'));
