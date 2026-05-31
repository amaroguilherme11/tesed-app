-- =====================================================================
-- Tesed — Migração 0011: data de nascimento + caixa de entrada enriquecida
--   1) handle_new_user passa a guardar date_of_birth vinda do registo.
--   2) doctor_inbox(): conversas + nome do paciente + idade + (se membro de
--      família) o nome do TITULAR da família. Só acessível ao médico.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Recriar handle_new_user para capturar também a data de nascimento.
--    (mantém a atribuição de papel e o consentimento RGPD.)
-- ---------------------------------------------------------------------
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

  -- Data de nascimento (opcional) vinda da metadata do signup, formato YYYY-MM-DD.
  begin
    v_dob := nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date;
  exception when others then
    v_dob := null;  -- formato inválido -> ignora (não bloqueia o registo)
  end;

  insert into public.profiles (id, role, full_name, date_of_birth, consent_accepted_at)
  values (
    new.id,
    assigned_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    v_dob,
    case when (new.raw_user_meta_data ->> 'consent') = 'true' then now() else null end
  );

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2) doctor_inbox(): tudo o que a caixa de entrada do médico precisa.
--    Idade calculada a partir da data de nascimento; titular da família
--    quando o paciente é MEMBRO de uma subscrição família ativa.
-- ---------------------------------------------------------------------
create or replace function public.doctor_inbox()
returns table (
  id                 uuid,
  patient_id         uuid,
  status             text,
  last_message_at    timestamptz,
  created_at         timestamptz,
  patient_name       text,
  patient_age        int,
  family_owner_name  text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.patient_id,
    c.status,
    c.last_message_at,
    c.created_at,
    p.full_name as patient_name,
    case
      when p.date_of_birth is null then null
      else extract(year from age(p.date_of_birth))::int
    end as patient_age,
    -- Nome do titular, se este paciente for MEMBRO de uma família (não o titular).
    (
      select owner_p.full_name
        from public.family_members fm
        join public.subscriptions s on s.id = fm.subscription_id
        join public.profiles owner_p on owner_p.id = s.owner_id
       where fm.member_id = c.patient_id
         and s.owner_id <> c.patient_id
       order by s.expires_at desc
       limit 1
    ) as family_owner_name
  from public.conversations c
  join public.profiles p on p.id = c.patient_id
  where public.is_doctor()
  order by
    case when c.status = 'unanswered' then 0 else 1 end,
    c.last_message_at desc nulls last;
$$;
