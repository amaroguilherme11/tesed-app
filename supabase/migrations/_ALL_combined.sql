-- =====================================================================
-- Tesed — TODAS as migrações combinadas (0001 → 0005)
-- Cola este ficheiro INTEIRO no SQL Editor do Supabase e clica em RUN.
-- Gerado a partir de supabase/migrations/*.sql (fonte de verdade).
-- =====================================================================


-- =====================================================================
-- 0001 — modelo de dados inicial (ARQUITETURA.md, secção 4)
-- =====================================================================
create extension if not exists "pgcrypto";

create table public.app_config (
  key   text primary key,
  value text not null
);

create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  role                text not null default 'patient' check (role in ('patient', 'doctor')),
  full_name           text,
  date_of_birth       date,
  phone               text,
  specialty           text,
  photo_url           text,
  bio                 text,
  consent_accepted_at timestamptz,
  created_at          timestamptz not null default now()
);

create unique index profiles_single_doctor_idx
  on public.profiles ((role))
  where role = 'doctor';

create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  doctor_id       uuid not null references public.profiles(id),
  status          text not null default 'answered' check (status in ('answered', 'unanswered')),
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (patient_id)
);

create index conversations_status_idx on public.conversations (status, last_message_at desc);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id),
  body            text not null,
  created_at      timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

create table public.attachments (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.messages(id) on delete cascade,
  file_path   text not null,
  file_name   text not null,
  mime_type   text,
  size_bytes  integer,
  created_at  timestamptz not null default now()
);

create index attachments_message_idx on public.attachments (message_id);

create table public.subscription_codes (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  origin            text not null check (origin in ('free_consultation', 'paid_website')),
  plan_type         text not null check (plan_type in ('individual', 'family')),
  duration_months   integer not null check (duration_months in (3, 6, 12)),
  status            text not null default 'active' check (status in ('active', 'used', 'revoked')),
  created_by        uuid references public.profiles(id),
  redeemed_by       uuid references public.profiles(id),
  redeemed_at       timestamptz,
  stripe_session_id text,
  created_at        timestamptz not null default now()
);

create index subscription_codes_status_idx on public.subscription_codes (status);

create table public.subscriptions (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  plan_type      text not null check (plan_type in ('individual', 'family')),
  starts_at      timestamptz not null default now(),
  expires_at     timestamptz not null,
  source_code_id uuid references public.subscription_codes(id),
  status         text not null default 'active' check (status in ('active', 'expired')),
  created_at     timestamptz not null default now()
);

create index subscriptions_owner_idx on public.subscriptions (owner_id);

create table public.family_members (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  member_id       uuid not null references public.profiles(id) on delete cascade,
  added_at        timestamptz not null default now(),
  unique (subscription_id, member_id)
);

create index family_members_subscription_idx on public.family_members (subscription_id);


-- =====================================================================
-- 0002 — funções e triggers
-- =====================================================================
create or replace function public.current_doctor_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where role = 'doctor' limit 1;
$$;

create or replace function public.is_doctor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'doctor'
  );
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  doctor_email text;
  assigned_role text := 'patient';
begin
  select value into doctor_email from public.app_config where key = 'doctor_email';

  if doctor_email is not null and lower(new.email) = lower(doctor_email) then
    if not exists (select 1 from public.profiles where role = 'doctor') then
      assigned_role := 'doctor';
    end if;
  end if;

  insert into public.profiles (id, role, full_name, consent_accepted_at)
  values (
    new.id,
    assigned_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    case when (new.raw_user_meta_data ->> 'consent') = 'true' then now() else null end
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.prevent_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
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

create or replace function public.set_conversation_doctor()
returns trigger language plpgsql security definer set search_path = public as $$
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

create or replace function public.handle_message_status()
returns trigger language plpgsql security definer set search_path = public as $$
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


-- =====================================================================
-- 0003 — Row Level Security (secção 5)
-- =====================================================================
alter table public.app_config         enable row level security;
alter table public.profiles           enable row level security;
alter table public.conversations      enable row level security;
alter table public.messages           enable row level security;
alter table public.attachments        enable row level security;
alter table public.subscription_codes enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.family_members     enable row level security;

create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid() or role = 'doctor' or public.is_doctor()
  );

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "conversations_select" on public.conversations
  for select using (patient_id = auth.uid() or public.is_doctor());

create policy "conversations_insert_own" on public.conversations
  for insert with check (patient_id = auth.uid());

create policy "conversations_update_doctor" on public.conversations
  for update using (public.is_doctor());

create policy "messages_select" on public.messages
  for select using (
    public.is_doctor()
    or conversation_id in (select id from public.conversations where patient_id = auth.uid())
  );

create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (
      public.is_doctor()
      or conversation_id in (select id from public.conversations where patient_id = auth.uid())
    )
  );

create policy "attachments_select" on public.attachments
  for select using (
    message_id in (
      select m.id from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where public.is_doctor() or c.patient_id = auth.uid()
    )
  );

create policy "attachments_insert" on public.attachments
  for insert with check (
    message_id in (select m.id from public.messages m where m.sender_id = auth.uid())
  );

create policy "subscription_codes_select_doctor" on public.subscription_codes
  for select using (public.is_doctor());

create policy "subscriptions_select" on public.subscriptions
  for select using (owner_id = auth.uid() or public.is_doctor());

create policy "family_members_select" on public.family_members
  for select using (
    member_id = auth.uid()
    or public.is_doctor()
    or subscription_id in (select id from public.subscriptions where owner_id = auth.uid())
  );


-- =====================================================================
-- 0004 — configuração de arranque: EMAIL DO MÉDICO
-- >>> SUBSTITUIR o email abaixo pelo email real do médico <<<
-- =====================================================================
insert into public.app_config (key, value)
values ('doctor_email', 'terapeuta@example.com')
on conflict (key) do nothing;


-- =====================================================================
-- 0005 — Realtime (Fase 2)
-- =====================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;

alter table public.conversations replica identity full;
