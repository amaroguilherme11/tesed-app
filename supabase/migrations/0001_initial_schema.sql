-- =====================================================================
-- Tesed — Migração 0001: modelo de dados inicial
-- Fonte de verdade: docs/ARQUITETURA.md, secção 4.
-- Tipos simplificados; usamos text + CHECK para legibilidade (como na spec).
-- =====================================================================

-- Extensão para gerar UUIDs aleatórios (gen_random_uuid).
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- app_config: configuração de servidor (ex.: email do médico único).
-- Não é exposta ao cliente (RLS sem políticas -> só service_role / SECURITY DEFINER).
-- ---------------------------------------------------------------------
create table public.app_config (
  key   text primary key,
  value text not null
);

-- ---------------------------------------------------------------------
-- profiles: estende auth.users. role 'doctor' é único e acumula admin.
-- ---------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  role                text not null default 'patient' check (role in ('patient', 'doctor')),
  full_name           text,
  date_of_birth       date,
  phone               text,
  specialty           text,        -- médico
  photo_url           text,
  bio                 text,        -- médico
  consent_accepted_at timestamptz, -- RGPD: consentimento explícito no registo (secção 10)
  created_at          timestamptz not null default now()
);

-- Garante no máximo UMA conta de médico (regra inegociável nº 4).
create unique index profiles_single_doctor_idx
  on public.profiles ((role))
  where role = 'doctor';

-- ---------------------------------------------------------------------
-- conversations: cada paciente tem uma conversa com o médico único.
-- ---------------------------------------------------------------------
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  patient_id      uuid not null references public.profiles(id) on delete cascade,
  doctor_id       uuid not null references public.profiles(id),
  status          text not null default 'answered' check (status in ('answered', 'unanswered')),
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (patient_id)  -- uma conversa por paciente
);

create index conversations_status_idx on public.conversations (status, last_message_at desc);

-- ---------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id),
  body            text not null,
  created_at      timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------
-- attachments: ficheiros submetidos, ligados a uma mensagem.
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- subscription_codes: códigos grátis e pagos (secção 7).
-- Códigos pagos só são criados pelo servidor (webhook). Ver RLS em 0002.
-- ---------------------------------------------------------------------
create table public.subscription_codes (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  origin            text not null check (origin in ('free_consultation', 'paid_website')),
  plan_type         text not null check (plan_type in ('individual', 'family')),
  duration_months   integer not null check (duration_months in (3, 6, 12)),
  status            text not null default 'active' check (status in ('active', 'used', 'revoked')),
  created_by        uuid references public.profiles(id),       -- médico (grátis) | null (pago)
  redeemed_by       uuid references public.profiles(id),
  redeemed_at       timestamptz,
  stripe_session_id text,
  created_at        timestamptz not null default now()
);

create index subscription_codes_status_idx on public.subscription_codes (status);

-- ---------------------------------------------------------------------
-- subscriptions: subscrição efetiva (resultado de resgatar um código).
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- family_members: membros adicionais de um plano família.
-- Limite total: 6 pessoas (titular + 5). Imposto no servidor (secção 5).
-- ---------------------------------------------------------------------
create table public.family_members (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  member_id       uuid not null references public.profiles(id) on delete cascade,
  added_at        timestamptz not null default now(),
  unique (subscription_id, member_id)
);

create index family_members_subscription_idx on public.family_members (subscription_id);
