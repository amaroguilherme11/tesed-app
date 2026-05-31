-- =====================================================================
-- Tesed — Migração 0007: funções de subscrições (Fase 4)
-- Regra de ouro (CLAUDE.md nº 2): códigos e resgate validados NO SERVIDOR.
-- Tudo via funções SECURITY DEFINER; o cliente nunca escreve nestas tabelas.
--   - generate_unique_code()   -> código TESED-XXXX-XXXX (sem 0/O, 1/I)
--   - create_free_code()       -> médico gera código grátis de 3 meses
--   - revoke_code()            -> médico revoga um código ativo
--   - redeem_code()            -> paciente resgata (transacional, sem uso duplo)
--   - add_family_member()      -> adiciona membro à família (máx. 6 no total)
--   - remove_family_member()   -> remove membro da família
-- =====================================================================

-- ---------------------------------------------------------------------
-- Gera um código único no formato TESED-XXXX-XXXX.
-- Charset sem caracteres ambíguos (sem 0/O, 1/I/L).
-- ---------------------------------------------------------------------
create or replace function public.generate_unique_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
  attempts int := 0;
begin
  loop
    candidate := 'TESED-';
    for i in 1..4 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    candidate := candidate || '-';
    for i in 1..4 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    exit when not exists (select 1 from public.subscription_codes where code = candidate);
    attempts := attempts + 1;
    if attempts > 20 then
      raise exception 'Não foi possível gerar um código único.';
    end if;
  end loop;
  return candidate;
end;
$$;

-- ---------------------------------------------------------------------
-- create_free_code: o MÉDICO gera um código grátis (3 meses) para entregar
-- em consulta. plan_type: 'individual' ou 'family'. Devolve o código criado.
-- ---------------------------------------------------------------------
create or replace function public.create_free_code(p_plan_type text default 'individual')
returns public.subscription_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code public.subscription_codes;
begin
  if not public.is_doctor() then
    raise exception 'Apenas o médico pode gerar códigos grátis.';
  end if;
  if p_plan_type not in ('individual', 'family') then
    raise exception 'Tipo de plano inválido: %', p_plan_type;
  end if;

  insert into public.subscription_codes (code, origin, plan_type, duration_months, status, created_by)
  values (public.generate_unique_code(), 'free_consultation', p_plan_type, 3, 'active', auth.uid())
  returning * into new_code;

  return new_code;
end;
$$;

-- ---------------------------------------------------------------------
-- revoke_code: o MÉDICO revoga um código que ainda esteja 'active'.
-- ---------------------------------------------------------------------
create or replace function public.revoke_code(p_code_id uuid)
returns public.subscription_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.subscription_codes;
begin
  if not public.is_doctor() then
    raise exception 'Apenas o médico pode revogar códigos.';
  end if;

  update public.subscription_codes
     set status = 'revoked'
   where id = p_code_id and status = 'active'
  returning * into updated;

  if updated.id is null then
    raise exception 'Código não encontrado ou já não está ativo.';
  end if;
  return updated;
end;
$$;

-- ---------------------------------------------------------------------
-- redeem_code: o PACIENTE resgata um código.
-- Transacional e à prova de uso duplo: bloqueia a linha (FOR UPDATE),
-- valida 'active', marca 'used' e cria a subscription numa só operação.
-- Devolve a subscription criada.
-- ---------------------------------------------------------------------
create or replace function public.redeem_code(p_code text)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.subscription_codes;
  v_sub  public.subscriptions;
  v_uid  uuid := auth.uid();
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

  -- Cria a subscrição efetiva.
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

  return v_sub;
end;
$$;

-- ---------------------------------------------------------------------
-- add_family_member: o TITULAR adiciona um membro à sua subscrição de família.
-- Limite imposto no servidor: 6 pessoas no total (titular + 5 membros).
-- O membro é identificado por email (tem de ter conta criada).
-- ---------------------------------------------------------------------
create or replace function public.add_family_member(p_subscription_id uuid, p_member_email text)
returns public.family_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub        public.subscriptions;
  v_member_id  uuid;
  v_count      int;
  v_new        public.family_members;
begin
  select * into v_sub from public.subscriptions where id = p_subscription_id;
  if v_sub.id is null then
    raise exception 'Subscrição não encontrada.';
  end if;
  if v_sub.owner_id <> auth.uid() then
    raise exception 'Apenas o titular pode gerir os membros da família.';
  end if;
  if v_sub.plan_type <> 'family' then
    raise exception 'Esta subscrição não é do tipo família.';
  end if;

  -- Encontra o perfil do membro pelo email.
  select p.id into v_member_id
    from auth.users u
    join public.profiles p on p.id = u.id
   where lower(u.email) = lower(trim(p_member_email));
  if v_member_id is null then
    raise exception 'Não existe nenhum utilizador com esse email. Peça-lhe para criar conta primeiro.';
  end if;
  if v_member_id = v_sub.owner_id then
    raise exception 'O titular já faz parte da subscrição.';
  end if;

  -- Limite de 6 no total = titular (1) + até 5 membros.
  select count(*) into v_count from public.family_members where subscription_id = p_subscription_id;
  if v_count >= 5 then
    raise exception 'Limite atingido: uma família tem no máximo 6 pessoas.';
  end if;

  insert into public.family_members (subscription_id, member_id)
  values (p_subscription_id, v_member_id)
  on conflict (subscription_id, member_id) do nothing
  returning * into v_new;

  if v_new.id is null then
    raise exception 'Este membro já faz parte da família.';
  end if;
  return v_new;
end;
$$;

-- ---------------------------------------------------------------------
-- my_subscription: devolve a subscrição EFETIVA do utilizador atual,
-- seja como TITULAR, seja como MEMBRO de uma família. Inclui campos
-- calculados (is_active, dias restantes) e o papel do utilizador.
-- SECURITY DEFINER para um membro poder ver a subscrição do titular.
-- ---------------------------------------------------------------------
create or replace function public.my_subscription()
returns table (
  subscription_id uuid,
  owner_id        uuid,
  plan_type       text,
  starts_at       timestamptz,
  expires_at      timestamptz,
  is_active       boolean,
  days_left       int,
  my_role         text   -- 'owner' | 'member'
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.owner_id, s.plan_type, s.starts_at, s.expires_at,
         (s.expires_at > now()) as is_active,
         greatest(0, ceil(extract(epoch from (s.expires_at - now())) / 86400))::int as days_left,
         case when s.owner_id = auth.uid() then 'owner' else 'member' end as my_role
    from public.subscriptions s
    left join public.family_members fm on fm.subscription_id = s.id
   where s.owner_id = auth.uid() or fm.member_id = auth.uid()
   order by s.expires_at desc
   limit 1;
$$;

-- ---------------------------------------------------------------------
-- family_of: lista os membros de uma subscrição de família (nome + email),
-- visível ao titular e ao médico. SECURITY DEFINER para juntar auth.users.
-- ---------------------------------------------------------------------
create or replace function public.family_of(p_subscription_id uuid)
returns table (member_id uuid, full_name text, email text, added_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select fm.member_id, p.full_name, u.email, fm.added_at
    from public.family_members fm
    join public.profiles p on p.id = fm.member_id
    join auth.users u on u.id = fm.member_id
   where fm.subscription_id = p_subscription_id
     and (
       public.is_doctor()
       or exists (
         select 1 from public.subscriptions s
         where s.id = p_subscription_id and s.owner_id = auth.uid()
       )
     )
   order by fm.added_at;
$$;

-- ---------------------------------------------------------------------
-- remove_family_member: o TITULAR remove um membro da sua família.
-- ---------------------------------------------------------------------
create or replace function public.remove_family_member(p_subscription_id uuid, p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.subscriptions where id = p_subscription_id;
  if v_owner is null then
    raise exception 'Subscrição não encontrada.';
  end if;
  if v_owner <> auth.uid() then
    raise exception 'Apenas o titular pode gerir os membros da família.';
  end if;

  delete from public.family_members
   where subscription_id = p_subscription_id and member_id = p_member_id;
end;
$$;
