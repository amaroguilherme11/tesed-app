-- =====================================================================
-- Tesed — Migração 0025: "Em standby" nas métricas do Painel
--
-- Acrescenta 'conversations_standby' e torna 'conversations_unanswered'
-- coerente com o resto da app: POR RESPONDER = consulta ABERTA, por responder e
-- SEM standby (as em standby passam a contar no seu próprio número).
--
-- Depende da 0024 (coluna conversations.standby_at).
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
    -- Por responder: ABERTA + por responder + SEM standby.
    'conversations_unanswered',   (select count(*) from public.conversations
                                     where closed_at is null
                                       and status = 'unanswered'
                                       and standby_at is null),
    -- Em standby: ABERTA + por responder + COM standby.
    'conversations_standby',      (select count(*) from public.conversations
                                     where closed_at is null
                                       and status = 'unanswered'
                                       and standby_at is not null),
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
