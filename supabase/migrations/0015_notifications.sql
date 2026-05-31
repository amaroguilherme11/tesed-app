-- =====================================================================
-- Tesed — Migração 0015: notificações push (Fase 7)
-- Guarda os tokens de dispositivo (Expo Push) por utilizador. O ENVIO é feito
-- por uma Edge Function (send-notification), acionada por um Database Webhook
-- em INSERT na tabela messages. Aqui só tratamos do armazenamento dos tokens.
--
-- Membros de família NÃO têm conta/login -> as notificações de chats de
-- dependentes vão para o TITULAR (a conta dona da conversa).
-- =====================================================================

create table if not exists public.device_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  token      text not null unique,           -- ExponentPushToken[...]
  platform   text,                            -- 'ios' | 'android' | 'web'
  updated_at timestamptz not null default now()
);

create index if not exists device_tokens_user_idx on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

-- Cada utilizador só vê/gere os seus próprios tokens.
drop policy if exists "device_tokens_select" on public.device_tokens;
create policy "device_tokens_select" on public.device_tokens
  for select using (user_id = auth.uid());

drop policy if exists "device_tokens_insert" on public.device_tokens;
create policy "device_tokens_insert" on public.device_tokens
  for insert with check (user_id = auth.uid());

drop policy if exists "device_tokens_update" on public.device_tokens;
create policy "device_tokens_update" on public.device_tokens
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "device_tokens_delete" on public.device_tokens;
create policy "device_tokens_delete" on public.device_tokens
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- register_device_token: regista/atualiza o token do dispositivo atual.
-- Upsert por token: se o mesmo token já existir, atualiza o dono e a data
-- (ex.: o mesmo telemóvel muda de conta).
-- ---------------------------------------------------------------------
create or replace function public.register_device_token(p_token text, p_platform text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'É necessário ter sessão iniciada.';
  end if;
  if coalesce(trim(p_token), '') = '' then
    return;
  end if;

  insert into public.device_tokens (user_id, token, platform, updated_at)
  values (auth.uid(), p_token, p_platform, now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------
-- unregister_device_token: remove o token (ex.: ao terminar sessão).
-- ---------------------------------------------------------------------
create or replace function public.unregister_device_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.device_tokens where token = p_token and user_id = auth.uid();
end;
$$;
