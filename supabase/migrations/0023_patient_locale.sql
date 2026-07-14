-- =====================================================================
-- Tesed — Migração 0023: idioma do paciente (locale) para emails/push
--
-- O idioma escolhido na app vivia só no dispositivo (AsyncStorage). Para os
-- EMAILS (templates do Supabase Auth) e as PUSH saberem o idioma de cada
-- paciente, guardamo-lo no servidor:
--   - profiles.locale  -> lido pela Edge Function das notificações.
--   - user_metadata (raw_user_meta_data.locale) -> lido pelos templates de email
--     via {{ .Data.locale }}.
--
-- Retrocompatível: coluna com default 'pt'; a app antiga nem chama a RPC nova.
-- =====================================================================

-- 1) Coluna locale (default 'pt', só 'pt' ou 'en').
alter table public.profiles
  add column if not exists locale text not null default 'pt';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_locale_check'
  ) then
    alter table public.profiles
      add constraint profiles_locale_check check (locale in ('pt', 'en'));
  end if;
end $$;

-- 2) handle_new_user passa a guardar o locale vindo do registo (metadata).
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
  v_locale text;
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

  -- Idioma do registo: 'en' se explícito, senão 'pt'.
  v_locale := case
    when lower(coalesce(new.raw_user_meta_data ->> 'locale', '')) = 'en' then 'en'
    else 'pt'
  end;

  insert into public.profiles (id, role, full_name, date_of_birth, phone, consent_accepted_at, locale)
  values (
    new.id,
    assigned_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    v_dob,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case when (new.raw_user_meta_data ->> 'consent') = 'true' then now() else null end,
    v_locale
  );

  return new;
end;
$$;

-- 3) RPC: o paciente grava o seu idioma. Atualiza profiles.locale (para as push)
--    E o raw_user_meta_data (para os templates de email ramificarem por idioma).
--    SECURITY DEFINER para poder escrever em auth.users; a escrita em auth.users
--    vai num bloco protegido (se faltar privilégio, mantém-se ao menos profiles).
create or replace function public.set_my_locale(p_locale text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_locale text := case when lower(coalesce(p_locale, '')) = 'en' then 'en' else 'pt' end;
begin
  if v_uid is null then
    return; -- sem sessão: nada a fazer
  end if;

  update public.profiles set locale = v_locale where id = v_uid;

  begin
    update auth.users
      set raw_user_meta_data =
        coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('locale', v_locale)
      where id = v_uid;
  exception when others then
    -- sem privilégio sobre auth.users: profiles.locale (push) já ficou gravado.
    null;
  end;
end;
$$;

grant execute on function public.set_my_locale(text) to authenticated;
