-- =====================================================================
-- Tesed — Migração 0010: métricas do painel do médico/admin (Fase 6)
-- Função única que devolve os números-chave, só acessível ao MÉDICO.
-- SECURITY DEFINER para agregar todas as tabelas; valida is_doctor() dentro.
-- =====================================================================

create or replace function public.admin_metrics()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not public.is_doctor() then
    raise exception 'Apenas o médico pode ver as métricas.';
  end if;

  select json_build_object(
    -- Conversas por estado (o coração do produto)
    'conversations_total',        (select count(*) from public.conversations),
    'conversations_unanswered',   (select count(*) from public.conversations where status = 'unanswered'),
    'conversations_answered',     (select count(*) from public.conversations where status = 'answered'),

    -- Pacientes registados
    'patients_total',             (select count(*) from public.profiles where role = 'patient'),

    -- Subscrições
    'subscriptions_active',       (select count(*) from public.subscriptions where expires_at > now()),
    'subscriptions_expired',      (select count(*) from public.subscriptions where expires_at <= now()),
    'subscriptions_individual',   (select count(*) from public.subscriptions where plan_type = 'individual' and expires_at > now()),
    'subscriptions_family',       (select count(*) from public.subscriptions where plan_type = 'family' and expires_at > now()),

    -- Códigos
    'codes_active',               (select count(*) from public.subscription_codes where status = 'active'),
    'codes_used',                 (select count(*) from public.subscription_codes where status = 'used'),
    'codes_revoked',              (select count(*) from public.subscription_codes where status = 'revoked'),

    -- Mensagens (volume total)
    'messages_total',             (select count(*) from public.messages)
  ) into result;

  return result;
end;
$$;
