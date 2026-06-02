-- =====================================================================
-- Tesed — Migração 0018: médico vê não-lidas (#1) + dashboard de pacientes (#3)
--   1) doctor_last_read_at: marca quando o médico abriu cada conversa.
--      "não lida (médico)" = última mensagem do PACIENTE mais recente do que a
--      última leitura do médico. É independente do estado answered/unanswered
--      (esse é sobre RESPONDER; este é sobre LER).
--   2) mark_conversation_read_doctor / atualização do doctor_inbox para devolver
--      has_unread.
--   3) patients_overview(): lista de pacientes com dados + subscrição (só médico).
-- =====================================================================

alter table public.conversations
  add column if not exists doctor_last_read_at timestamptz;

-- ---------------------------------------------------------------------
-- O médico marca uma conversa como lida (ao abri-la).
-- ---------------------------------------------------------------------
create or replace function public.mark_conversation_read_doctor(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_doctor() then
    raise exception 'Apenas o médico.';
  end if;
  update public.conversations
     set doctor_last_read_at = now()
   where id = p_conversation_id;
end;
$$;

-- ---------------------------------------------------------------------
-- doctor_inbox: acrescenta has_unread (mensagem nova do paciente por ler).
-- ---------------------------------------------------------------------
drop function if exists public.doctor_inbox();
create or replace function public.doctor_inbox()
returns table (
  id               uuid,
  patient_id       uuid,
  member_id        uuid,
  status           text,
  last_message_at  timestamptz,
  created_at       timestamptz,
  owner_name       text,
  owner_dob        date,
  owner_phone      text,
  member_name      text,
  member_dob       date,
  is_family        boolean,
  has_unread       boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.patient_id,
    c.member_id,
    c.status,
    c.last_message_at,
    c.created_at,
    p.full_name as owner_name,
    p.date_of_birth as owner_dob,
    p.phone as owner_phone,
    mp.full_name as member_name,
    mp.date_of_birth as member_dob,
    exists (
      select 1 from public.subscriptions s
      where s.owner_id = c.patient_id and s.plan_type = 'family' and s.expires_at > now()
    ) as is_family,
    (
      c.last_message_at is not null
      and c.status = 'unanswered'  -- última foi do paciente
      and (c.doctor_last_read_at is null or c.last_message_at > c.doctor_last_read_at)
    ) as has_unread
  from public.conversations c
  join public.profiles p on p.id = c.patient_id
  left join public.member_profiles mp on mp.id = c.member_id
  where public.is_doctor()
  order by
    case when c.status = 'unanswered' then 0 else 1 end,
    c.last_message_at desc nulls last;
$$;

-- ---------------------------------------------------------------------
-- patients_overview: dados dos pacientes (titulares) + subscrição, p/ o médico.
-- Idade calculada na app a partir da data de nascimento.
-- ---------------------------------------------------------------------
create or replace function public.patients_overview()
returns table (
  patient_id     uuid,
  full_name      text,
  email          text,
  phone          text,
  date_of_birth  date,
  created_at     timestamptz,
  plan_type      text,
  sub_starts_at  timestamptz,
  sub_expires_at timestamptz,
  sub_active     boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    u.email,
    p.phone,
    p.date_of_birth,
    p.created_at,
    s.plan_type,
    s.starts_at,
    s.expires_at,
    (s.expires_at is not null and s.expires_at > now()) as sub_active
  from public.profiles p
  join auth.users u on u.id = p.id
  -- subscrição mais recente de cada paciente (se houver)
  left join lateral (
    select s1.plan_type, s1.starts_at, s1.expires_at
    from public.subscriptions s1
    where s1.owner_id = p.id
    order by s1.expires_at desc
    limit 1
  ) s on true
  where p.role = 'patient'
    and public.is_doctor()
  order by p.full_name;
$$;
