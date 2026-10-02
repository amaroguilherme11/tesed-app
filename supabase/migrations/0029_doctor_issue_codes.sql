-- =====================================================================
-- Tesed — Migração 0029: o TERAPEUTA emite códigos com duração à escolha
--
-- Pedido do cliente: poder criar códigos de MAIS de 3 meses dentro da app (vista
-- do terapeuta), para quem compra a subscrição por mais tempo a dinheiro / outra
-- forma de pagamento fora do website.
--
-- Mantém a regra nº 2 do CLAUDE.md: o código continua a nascer de uma RPC de
-- SERVIDOR (SECURITY DEFINER + is_doctor()); o cliente nunca o forja. A diferença
-- é só o terapeuta escolher a DURAÇÃO (3/6/12) e o PLANO, e marcá-lo como "pago"
-- (origin = 'paid_manual') vs "grátis em consulta" (origin = 'free_consultation').
--
-- Durações: fixas 3/6/12 (decisão do cliente), coerente com o CHECK existente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Nova origem possível: 'paid_manual' (pago, emitido pelo terapeuta).
-- ---------------------------------------------------------------------
alter table public.subscription_codes drop constraint if exists subscription_codes_origin_check;
alter table public.subscription_codes
  add constraint subscription_codes_origin_check
  check (origin in ('free_consultation', 'paid_website', 'paid_manual'));

-- ---------------------------------------------------------------------
-- 2) create_code: o terapeuta gera um código com plano + duração + pago?/grátis.
--    Substitui na prática o create_free_code (que se mantém por retrocompat.).
-- ---------------------------------------------------------------------
create or replace function public.create_code(
  p_plan_type       text    default 'individual',
  p_duration_months int     default 3,
  p_paid            boolean default false
)
returns public.subscription_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code public.subscription_codes;
begin
  if not public.is_doctor() then
    raise exception 'Apenas o terapeuta pode gerar códigos.';
  end if;
  if p_plan_type not in ('individual', 'family') then
    raise exception 'Tipo de plano inválido: %', p_plan_type;
  end if;
  if p_duration_months not in (3, 6, 12) then
    raise exception 'Duração inválida: % (use 3, 6 ou 12 meses).', p_duration_months;
  end if;

  insert into public.subscription_codes (code, origin, plan_type, duration_months, status, created_by)
  values (
    public.generate_unique_code(),
    case when p_paid then 'paid_manual' else 'free_consultation' end,
    p_plan_type,
    p_duration_months,
    'active',
    auth.uid()
  )
  returning * into new_code;

  return new_code;
end;
$$;

grant execute on function public.create_code(text, int, boolean) to authenticated;
