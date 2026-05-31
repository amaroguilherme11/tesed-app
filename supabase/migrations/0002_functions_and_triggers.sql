-- =====================================================================
-- Tesed — Migração 0002: funções e triggers
--   - handle_new_user      -> cria profile e atribui o papel (secção 3)
--   - prevent_role_change  -> 'role' nunca alterável pelo utilizador (secção 5)
--   - handle_message_status-> estado "não respondida" via trigger (secção 6)
--   - set_conversation_doctor -> preenche doctor_id automaticamente
--   - helpers: current_doctor_id(), is_doctor()
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helpers (SECURITY DEFINER para evitar recursão de RLS em profiles).
-- ---------------------------------------------------------------------
create or replace function public.current_doctor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where role = 'doctor' limit 1;
$$;

create or replace function public.is_doctor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'doctor'
  );
$$;

-- ---------------------------------------------------------------------
-- handle_new_user: ao criar um utilizador de auth, cria o profile.
-- Atribui 'doctor' SE o email coincidir com app_config.doctor_email,
-- caso contrário 'patient'. Garante a regra "médico único, sem auto-registo".
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
begin
  select value into doctor_email from public.app_config where key = 'doctor_email';

  if doctor_email is not null and lower(new.email) = lower(doctor_email) then
    -- Só atribui 'doctor' se ainda não existir nenhum (índice único reforça isto).
    if not exists (select 1 from public.profiles where role = 'doctor') then
      assigned_role := 'doctor';
    end if;
  end if;

  insert into public.profiles (id, role, full_name, consent_accepted_at)
  values (
    new.id,
    assigned_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    -- Consentimento RGPD vindo do registo (secção 10). Médicos (convite) não passam isto.
    case when (new.raw_user_meta_data ->> 'consent') = 'true' then now() else null end
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- prevent_role_change: o próprio utilizador nunca pode mudar o seu 'role'.
-- Só service_role / postgres (seeding/servidor) o podem fazer.
-- ---------------------------------------------------------------------
create or replace function public.prevent_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and current_user not in ('service_role', 'supabase_admin', 'postgres') then
    raise exception 'Não é permitido alterar o papel (role) do utilizador.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_change();

-- ---------------------------------------------------------------------
-- set_conversation_doctor: preenche doctor_id com o médico único.
-- (O cliente não precisa de saber o id do médico.)
-- ---------------------------------------------------------------------
create or replace function public.set_conversation_doctor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.doctor_id is null then
    new.doctor_id := public.current_doctor_id();
  end if;
  if new.doctor_id is null then
    raise exception 'Não existe conta de médico configurada (seeding em falta).';
  end if;
  return new;
end;
$$;

drop trigger if exists conversations_set_doctor on public.conversations;
create trigger conversations_set_doctor
  before insert on public.conversations
  for each row execute function public.set_conversation_doctor();

-- ---------------------------------------------------------------------
-- handle_message_status: CORAÇÃO DO PRODUTO (secção 6).
-- AFTER INSERT em messages: olha o papel do remetente e atualiza o estado.
--   paciente -> 'unanswered'   |   médico -> 'answered'
-- SECURITY DEFINER para poder atualizar conversations de qualquer paciente.
-- ---------------------------------------------------------------------
create or replace function public.handle_message_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_role text;
begin
  select role into sender_role from public.profiles where id = new.sender_id;

  update public.conversations
     set status = case when sender_role = 'doctor' then 'answered' else 'unanswered' end,
         last_message_at = new.created_at
   where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists messages_update_status on public.messages;
create trigger messages_update_status
  after insert on public.messages
  for each row execute function public.handle_message_status();
