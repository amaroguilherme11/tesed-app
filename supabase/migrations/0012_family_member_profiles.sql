-- =====================================================================
-- Tesed — Migração 0012: perfis de membros de família (dependentes)
--
-- MUDANÇA DE MODELO: os membros de família deixam de ser contas com email.
-- O TITULAR (conta com login) gere PERFIS de dependentes (nome + data de
-- nascimento, sem login próprio). Cada perfil tem a SUA conversa com o médico.
-- Total: titular (conversa "pessoal", member_id NULL) + até 5 perfis = 6 pessoas.
--
-- Substitui o antigo mecanismo por email (family_members + RPCs associadas).
-- =====================================================================

-- ---------------------------------------------------------------------
-- member_profiles: dependentes geridos pelo titular (sem conta/login).
-- ---------------------------------------------------------------------
create table if not exists public.member_profiles (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  full_name     text not null,
  date_of_birth date,
  created_at    timestamptz not null default now()
);

create index if not exists member_profiles_owner_idx on public.member_profiles (owner_id);

alter table public.member_profiles enable row level security;

-- Titular vê/edita os seus; médico vê todos. Escrita de criar/apagar é por RPC.
drop policy if exists "member_profiles_select" on public.member_profiles;
create policy "member_profiles_select" on public.member_profiles
  for select using (owner_id = auth.uid() or public.is_doctor());

-- ---------------------------------------------------------------------
-- conversations: passa a poder haver VÁRIAS por paciente (uma por membro).
-- member_id NULL = conversa do próprio titular/paciente individual.
-- ---------------------------------------------------------------------
alter table public.conversations
  add column if not exists member_id uuid references public.member_profiles(id) on delete cascade;

-- Remove a unicidade antiga (uma conversa por paciente).
alter table public.conversations drop constraint if exists conversations_patient_id_key;

-- Nova unicidade: uma conversa por (titular, membro). Sentinela para o caso NULL
-- garante no máximo UMA conversa pessoal por paciente.
create unique index if not exists conversations_patient_member_idx
  on public.conversations (patient_id, coalesce(member_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ---------------------------------------------------------------------
-- add_member_profile: o TITULAR cria um dependente + a respetiva conversa.
-- Exige plano FAMÍLIA ativo e respeita o limite de 6 (titular + 5).
-- ---------------------------------------------------------------------
create or replace function public.add_member_profile(p_full_name text, p_dob date default null)
returns public.member_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_sub   public.subscriptions;
  v_count int;
  v_new   public.member_profiles;
begin
  if v_uid is null then
    raise exception 'É necessário ter sessão iniciada.';
  end if;
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Indica o nome completo do membro.';
  end if;

  -- Tem de ter um plano FAMÍLIA ativo de que seja titular.
  select * into v_sub
    from public.subscriptions
   where owner_id = v_uid and plan_type = 'family' and expires_at > now()
   order by expires_at desc
   limit 1;
  if v_sub.id is null then
    raise exception 'Precisas de um plano família ativo para adicionar membros.';
  end if;

  -- Limite: titular + 5 dependentes = 6.
  select count(*) into v_count from public.member_profiles where owner_id = v_uid;
  if v_count >= 5 then
    raise exception 'Limite atingido: uma família tem no máximo 6 pessoas.';
  end if;

  insert into public.member_profiles (owner_id, full_name, date_of_birth)
  values (v_uid, trim(p_full_name), p_dob)
  returning * into v_new;

  -- Cria a conversa do dependente (doctor_id preenchido pelo trigger).
  insert into public.conversations (patient_id, member_id)
  values (v_uid, v_new.id);

  return v_new;
end;
$$;

-- ---------------------------------------------------------------------
-- remove_member_profile: o TITULAR remove um dependente (cascata: conversa).
-- ---------------------------------------------------------------------
create or replace function public.remove_member_profile(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.member_profiles
   where id = p_member_id and owner_id = auth.uid();
  if not found then
    raise exception 'Membro não encontrado ou sem permissão.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- my_member_profiles: dependentes do titular + id da conversa de cada um.
-- ---------------------------------------------------------------------
create or replace function public.my_member_profiles()
returns table (
  id              uuid,
  full_name       text,
  date_of_birth   date,
  conversation_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select mp.id, mp.full_name, mp.date_of_birth, c.id as conversation_id
    from public.member_profiles mp
    left join public.conversations c
      on c.patient_id = mp.owner_id and c.member_id = mp.id
   where mp.owner_id = auth.uid()
   order by mp.created_at;
$$;

-- ---------------------------------------------------------------------
-- Atualiza has_active_subscription: agora SÓ por titular (dependentes não
-- têm login). Mantém o médico a enviar sempre (verificado noutras políticas).
-- ---------------------------------------------------------------------
create or replace function public.has_active_subscription(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where owner_id = p_uid and expires_at > now()
  );
$$;

-- ---------------------------------------------------------------------
-- Atualiza my_subscription: sem dependência de family_members (já não existe
-- o conceito de membro-utilizador). O utilizador é sempre titular.
-- (DROP necessário: o tipo de retorno não muda, mas garantimos consistência.)
-- ---------------------------------------------------------------------
drop function if exists public.my_subscription();
create or replace function public.my_subscription()
returns table (
  subscription_id uuid,
  owner_id        uuid,
  plan_type       text,
  starts_at       timestamptz,
  expires_at      timestamptz,
  is_active       boolean,
  days_left       int,
  my_role         text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.owner_id, s.plan_type, s.starts_at, s.expires_at,
         (s.expires_at > now()) as is_active,
         greatest(0, ceil(extract(epoch from (s.expires_at - now())) / 86400))::int as days_left,
         'owner'::text as my_role
    from public.subscriptions s
   where s.owner_id = auth.uid()
   order by s.expires_at desc
   limit 1;
$$;

-- ---------------------------------------------------------------------
-- doctor_inbox: uma linha por CONVERSA, com info do titular e do membro.
-- A app agrupa por titular e mostra "Família: nome" quando há plano família.
-- (DROP necessário: o tipo de retorno mudou desde a 0011.)
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

-- ---------------------------------------------------------------------
-- Limpeza: remove o mecanismo antigo de membros por email.
-- ---------------------------------------------------------------------
drop function if exists public.add_family_member(uuid, text);
drop function if exists public.remove_family_member(uuid, uuid);
drop function if exists public.family_of(uuid);
drop table if exists public.family_members cascade;
