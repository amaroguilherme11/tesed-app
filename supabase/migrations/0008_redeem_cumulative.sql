-- =====================================================================
-- Tesed — Migração 0008: resgate CUMULATIVO (Fase 4, ajuste)
-- Se o paciente já tiver uma subscrição ATIVA ao resgatar um novo código,
-- o tempo é ACUMULADO (ex.: 3 meses + 3 meses = 6 meses), em vez de criar
-- uma subscrição nova. Se não houver ativa, cria uma nova a partir de agora.
-- Continua transacional e à prova de uso duplo (FOR UPDATE no código).
-- =====================================================================

create or replace function public.redeem_code(p_code text)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code     public.subscription_codes;
  v_existing public.subscriptions;
  v_sub      public.subscriptions;
  v_uid      uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'É necessário ter sessão iniciada.';
  end if;

  -- Bloqueia a linha do código para impedir resgate simultâneo (uso duplo).
  select * into v_code
    from public.subscription_codes
   where upper(code) = upper(trim(p_code))
   for update;

  if v_code.id is null then
    raise exception 'Código inválido.';
  end if;
  if v_code.status = 'used' then
    raise exception 'Este código já foi utilizado.';
  end if;
  if v_code.status = 'revoked' then
    raise exception 'Este código foi revogado.';
  end if;

  -- Marca o código como usado.
  update public.subscription_codes
     set status = 'used', redeemed_by = v_uid, redeemed_at = now()
   where id = v_code.id;

  -- Existe subscrição ATIVA de que este utilizador é TITULAR?
  -- (Bloqueada para evitar corrida em resgates simultâneos do mesmo dono.)
  select * into v_existing
    from public.subscriptions
   where owner_id = v_uid and expires_at > now()
   order by expires_at desc
   limit 1
   for update;

  if v_existing.id is not null then
    -- ACUMULA: soma a duração ao fim da subscrição existente.
    update public.subscriptions
       set expires_at = v_existing.expires_at + (v_code.duration_months || ' months')::interval,
           -- Se o novo código for família, faz upgrade do plano (família "ganha").
           plan_type  = case when v_code.plan_type = 'family' then 'family' else plan_type end,
           status     = 'active'
     where id = v_existing.id
    returning * into v_sub;
  else
    -- Sem subscrição ativa: cria uma nova a começar agora.
    insert into public.subscriptions (owner_id, plan_type, starts_at, expires_at, source_code_id, status)
    values (
      v_uid,
      v_code.plan_type,
      now(),
      now() + (v_code.duration_months || ' months')::interval,
      v_code.id,
      'active'
    )
    returning * into v_sub;
  end if;

  return v_sub;
end;
$$;
