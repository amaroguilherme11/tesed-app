-- =====================================================================
-- Tesed — Migração 0016: número de telemóvel do paciente (titular)
-- A coluna profiles.phone já existe (0001). Aqui:
--   1) handle_new_user passa a guardar o telemóvel vindo do registo.
--   2) doctor_inbox passa a devolver o telemóvel do titular (para o médico
--      poder ligar ao paciente). Só TITULARES têm número (dependentes não).
-- =====================================================================

-- 1) Recriar handle_new_user incluindo o telemóvel.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  doctor_email text;
  assigned_role text := 'patient';
  v_dob date;
begin
  select value into doctor_email from public.app_config where key = 'doctor_email';

  if doctor_email is not null and lower(new.email) = lower(doctor_email) then
    if not exists (select 1 from public.profiles where role = 'doctor') then
      assigned_role := 'doctor';
    end if;
  end if;

  begin
    v_dob := nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date;
  exception when others then
    v_dob := null;
  end;

  insert into public.profiles (id, role, full_name, date_of_birth, phone, consent_accepted_at)
  values (
    new.id,
    assigned_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    v_dob,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case when (new.raw_user_meta_data ->> 'consent') = 'true' then now() else null end
  );

  return new;
end;
$$;

-- 2) Recriar doctor_inbox com o telemóvel do titular.
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
  is_family        boolean
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
    ) as is_family
  from public.conversations c
  join public.profiles p on p.id = c.patient_id
  left join public.member_profiles mp on mp.id = c.member_id
  where public.is_doctor()
  order by
    case when c.status = 'unanswered' then 0 else 1 end,
    c.last_message_at desc nulls last;
$$;
