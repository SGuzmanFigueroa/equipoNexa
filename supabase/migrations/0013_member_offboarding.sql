-- Salida (offboarding) de un integrante. El admin la activa desde la
-- ficha; desde ese momento, cuando el integrante entra a su cuenta solo ve
-- la pantalla "¡Gracias por participar en Nexa!" con la encuesta de salida.
-- Al enviarla puede descargar su certificado de participación (PDF que
-- genera un Apps Script; ver google-apps-script/certificado-participacion.gs).
--
-- Una fila por integrante: existe = salida activada. El integrante no
-- escribe en la tabla directamente: envía la encuesta con la función
-- submit_offboarding (una sola vez) y la descarga se registra con
-- mark_offboarding_certificate.

create table if not exists member_offboarding (
  member_id uuid primary key references team_members (id) on delete cascade,
  activated_at timestamptz not null default now(),
  activated_by uuid references profiles (id) on delete set null,
  submitted_at timestamptz,
  environment_rating smallint check (environment_rating between 1 and 10),
  learned text,
  expectations text,
  career_goal text,
  recommends text check (recommends in ('si', 'tal_vez', 'no')),
  recommend_reason text,
  improvements text,
  certificate_downloaded_at timestamptz
);

alter table member_offboarding enable row level security;

drop policy if exists "admins manage offboarding" on member_offboarding;
create policy "admins manage offboarding"
  on member_offboarding for all
  to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "members view own offboarding" on member_offboarding;
create policy "members view own offboarding"
  on member_offboarding for select
  to authenticated
  using (
    exists (
      select 1 from team_members tm
      where tm.id = member_offboarding.member_id and tm.profile_id = auth.uid()
    )
  );

create or replace function submit_offboarding(
  p_environment_rating int,
  p_learned text,
  p_expectations text,
  p_career_goal text,
  p_recommends text,
  p_recommend_reason text,
  p_improvements text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_member_id uuid;
begin
  select tm.id into v_member_id from team_members tm where tm.profile_id = auth.uid();
  if v_member_id is null then
    raise exception 'Tu cuenta no está vinculada a una ficha de integrante.';
  end if;

  if p_environment_rating is null or p_environment_rating not between 1 and 10 then
    raise exception 'Elige una calificación del 1 al 10.';
  end if;
  if coalesce(trim(p_learned), '') = '' or coalesce(trim(p_expectations), '') = ''
     or coalesce(trim(p_career_goal), '') = '' then
    raise exception 'Responde todas las preguntas obligatorias.';
  end if;
  if p_recommends not in ('si', 'tal_vez', 'no') then
    raise exception 'Indica si recomendarías Nexa Consulting TI.';
  end if;

  update member_offboarding set
    submitted_at = now(),
    environment_rating = p_environment_rating,
    learned = left(trim(p_learned), 4000),
    expectations = left(trim(p_expectations), 4000),
    career_goal = left(trim(p_career_goal), 4000),
    recommends = p_recommends,
    recommend_reason = nullif(left(trim(coalesce(p_recommend_reason, '')), 4000), ''),
    improvements = nullif(left(trim(coalesce(p_improvements, '')), 4000), '')
  where member_id = v_member_id and submitted_at is null;

  if not found then
    raise exception 'La encuesta de salida no está disponible o ya fue enviada.';
  end if;
end;
$$;

create or replace function mark_offboarding_certificate()
returns void
language sql
security definer set search_path = public
as $$
  update member_offboarding mo
  set certificate_downloaded_at = coalesce(mo.certificate_downloaded_at, now())
  from team_members tm
  where tm.id = mo.member_id and tm.profile_id = auth.uid() and mo.submitted_at is not null;
$$;

revoke all on function submit_offboarding(int, text, text, text, text, text, text) from public, anon;
grant execute on function submit_offboarding(int, text, text, text, text, text, text) to authenticated;
revoke all on function mark_offboarding_certificate() from public, anon;
grant execute on function mark_offboarding_certificate() to authenticated;
