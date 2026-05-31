-- =====================================================================
-- Tesed — Migração 0014: códigos PAGOS (Fase 5)
-- O código pago é criado por uma função de servidor, chamada pela Edge
-- Function 'ifthenpay-callback' (com service_role), nunca pelo cliente.
-- Regra de ouro (CLAUDE.md nº 2): só servidor verificado cria código pago.
--
-- Idempotência: cada pagamento (payment_ref) gera NO MÁXIMO um código. Se o
-- mesmo callback chegar duas vezes (o Ifthenpay pode repetir), devolve o
-- código já criado em vez de criar outro.
-- =====================================================================

-- Referência única do pagamento (ex.: id/requestId do Ifthenpay).
alter table public.subscription_codes
  add column if not exists payment_ref text;

create unique index if not exists subscription_codes_payment_ref_idx
  on public.subscription_codes (payment_ref)
  where payment_ref is not null;

-- ---------------------------------------------------------------------
-- create_paid_code: cria (ou devolve, se já existir) o código pago.
-- Chamada apenas pelo service_role (Edge Function). Ver GRANT no fim.
-- ---------------------------------------------------------------------
create or replace function public.create_paid_code(
  p_payment_ref     text,
  p_plan_type       text,
  p_duration_months int
)
returns public.subscription_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.subscription_codes;
  v_new      public.subscription_codes;
begin
  if coalesce(trim(p_payment_ref), '') = '' then
    raise exception 'Referência de pagamento em falta.';
  end if;
  if p_plan_type not in ('individual', 'family') then
    raise exception 'Tipo de plano inválido: %', p_plan_type;
  end if;
  if p_duration_months not in (3, 6, 12) then
    raise exception 'Duração inválida (3, 6 ou 12 meses): %', p_duration_months;
  end if;

  -- Idempotência: mesma referência de pagamento -> devolve o código já criado.
  select * into v_existing
    from public.subscription_codes
   where payment_ref = p_payment_ref;
  if v_existing.id is not null then
    return v_existing;
  end if;

  insert into public.subscription_codes
    (code, origin, plan_type, duration_months, status, payment_ref)
  values
    (public.generate_unique_code(), 'paid_website', p_plan_type, p_duration_months, 'active', p_payment_ref)
  returning * into v_new;

  return v_new;
end;
$$;

-- SEGURANÇA CRÍTICA: esta função NÃO valida is_doctor() (é chamada por máquina),
-- por isso tem de ser inacessível a clientes. Só o service_role a pode executar.
revoke all on function public.create_paid_code(text, text, int) from public;
revoke all on function public.create_paid_code(text, text, int) from anon;
revoke all on function public.create_paid_code(text, text, int) from authenticated;
grant execute on function public.create_paid_code(text, text, int) to service_role;
