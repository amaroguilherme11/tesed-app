-- =====================================================================
-- Tesed — Migração 0020: CONSULTAS (conversas com ciclo de vida)
--
-- Uma "consulta" é uma conversa que fica ABERTA até o TERAPEUTA a FECHAR.
-- Passam a poder existir VÁRIAS consultas por (paciente, membro) — histórico —
-- mas só UMA aberta de cada vez. Consulta FECHADA = só leitura (ninguém envia).
--
-- Decisões (cliente): conversas atuais → consulta ABERTA (histórico mantido);
-- consulta sem assunto (identifica-se pela data); criar consulta exige
-- subscrição ativa; terapeuta destaca quem tem consulta aberta por responder.
--
-- ADITIVA E RETROCOMPATÍVEL: não altera RPCs antigas (my_patient_chats,
-- doctor_inbox, patients_overview, add_member_profile) — a app 1.0.4 publicada
-- continua a funcionar. Só acrescenta a coluna, ajusta índices/RLS e adiciona
-- novas RPCs para a app nova.
-- =====================================================================

-- 1) Coluna de fecho (NULL = aberta). As conversas atuais ficam ABERTAS.
alter table public.conversations add column if not exists closed_at timestamptz;

create index if not exists conversations_patient_open_idx
  on public.conversations (patient_id, closed_at);

-- 2) Unicidade: no máximo UMA consulta ABERTA por (paciente, membro).
--    Substitui a antiga "uma conversa por (paciente, membro)".
drop index if exists public.conversations_patient_member_idx;
create unique index if not exists conversations_one_open_per_member_idx
  on public.conversations (patient_id, coalesce(member_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where closed_at is null;

-- 3) RLS: consulta FECHADA = só leitura (ninguém — nem médico — envia mensagens).
--    (Mantém as condições de 0009: remetente + médico OU participante c/ subscrição.)
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    -- Só em consultas ABERTAS (fechada = histórico só de leitura).
    and conversation_id in (select id from public.conversations where closed_at is null)
    and (
      public.is_doctor()
      or (
        conversation_id in (
          select id from public.conversations where patient_id = auth.uid()
        )
        and public.has_active_subscription(auth.uid())
      )
    )
  );

-- ---------------------------------------------------------------------
-- 4) create_consultation: o PACIENTE abre uma consulta nova (titular ou membro).
--    Exige subscrição ativa; não pode já haver uma ABERTA para esse (paciente,
--    membro). O doctor_id é preenchido pelo trigger existente.
-- ---------------------------------------------------------------------
create or replace function public.create_consultation(p_member_id uuid default null)
returns public.conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_new public.conversations;
begin
  if v_uid is null then
    raise exception 'É necessário ter sessão iniciada.';
  end if;
  if not public.has_active_subscription(v_uid) then
    raise exception 'Precisas de uma subscrição ativa para abrir uma consulta.';
  end if;
  -- Se for para um dependente, tem de pertencer ao próprio titular.
  if p_member_id is not null and not exists (
    select 1 from public.member_profiles mp where mp.id = p_member_id and mp.owner_id = v_uid
  ) then
    raise exception 'Membro inválido.';
  end if;
  -- Não pode existir já uma consulta ABERTA para este (paciente, membro).
  if exists (
    select 1 from public.conversations c
    where c.patient_id = v_uid
      and coalesce(c.member_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = coalesce(p_member_id, '00000000-0000-0000-0000-000000000000'::uuid)
      and c.closed_at is null
  ) then
    raise exception 'Já existe uma consulta aberta.';
  end if;

  insert into public.conversations (patient_id, member_id)
  values (v_uid, p_member_id)
  returning * into v_new;
  return v_new;
end;
$$;

-- ---------------------------------------------------------------------
-- 5) close_consultation: só o TERAPEUTA fecha. Marca closed_at e LIMPA o estado
--    (deixa de contar como por-responder / por-ler em qualquer lado).
-- ---------------------------------------------------------------------
create or replace function public.close_consultation(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_doctor() then
    raise exception 'Apenas o terapeuta pode fechar consultas.';
  end if;
  update public.conversations
     set closed_at = now(),
         status = 'answered',           -- tira o estado "por responder"
         doctor_last_read_at = now(),   -- tira "por ler" (médico)
         patient_last_read_at = now()   -- tira "por ler" (paciente)
   where id = p_conversation_id and closed_at is null;
  if not found then
    raise exception 'Consulta não encontrada ou já fechada.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 5b) reopen_consultation: só o TERAPEUTA reabre uma consulta fechada (ex.:
--    fecho por engano). Só se NÃO houver outra aberta desse (paciente, membro).
-- ---------------------------------------------------------------------
create or replace function public.reopen_consultation(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv public.conversations;
begin
  if not public.is_doctor() then
    raise exception 'Apenas o terapeuta pode reabrir consultas.';
  end if;
  select * into v_conv from public.conversations where id = p_conversation_id;
  if v_conv.id is null then
    raise exception 'Consulta não encontrada.';
  end if;
  if v_conv.closed_at is null then
    return; -- já está aberta
  end if;
  -- Respeita "uma aberta de cada vez" por (paciente, membro).
  if exists (
    select 1 from public.conversations c
    where c.patient_id = v_conv.patient_id
      and coalesce(c.member_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = coalesce(v_conv.member_id, '00000000-0000-0000-0000-000000000000'::uuid)
      and c.closed_at is null
  ) then
    raise exception 'Já existe uma consulta aberta para este paciente/membro. Fecha-a primeiro.';
  end if;
  update public.conversations set closed_at = null where id = p_conversation_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 6) my_consultations: consultas do paciente (próprias + dependentes), com
--    estado. Abertas primeiro; depois por data descendente.
-- ---------------------------------------------------------------------
create or replace function public.my_consultations()
returns table (
  conversation_id uuid,
  member_id       uuid,
  is_open         boolean,
  status          text,
  last_message_at timestamptz,
  created_at      timestamptz,
  has_unread      boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.member_id,
    (c.closed_at is null) as is_open,
    c.status,
    c.last_message_at,
    c.created_at,
    (
      c.closed_at is null
      and c.status = 'answered'
      and c.last_message_at is not null
      and (c.patient_last_read_at is null or c.last_message_at > c.patient_last_read_at)
    ) as has_unread
  from public.conversations c
  where c.patient_id = auth.uid()
  order by (c.closed_at is null) desc, coalesce(c.last_message_at, c.created_at) desc;
$$;

-- ---------------------------------------------------------------------
-- 7) doctor_patient_consultations: todas as consultas de um paciente (todos os
--    dependentes incluídos), para o terapeuta. Abertas no topo.
-- ---------------------------------------------------------------------
create or replace function public.doctor_patient_consultations(p_patient_id uuid)
returns table (
  conversation_id uuid,
  member_id       uuid,
  member_name     text,
  member_dob      date,
  is_open         boolean,
  status          text,
  last_message_at timestamptz,
  created_at      timestamptz,
  closed_at       timestamptz,
  has_unread      boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.member_id,
    mp.full_name,
    mp.date_of_birth,
    (c.closed_at is null) as is_open,
    c.status,
    c.last_message_at,
    c.created_at,
    c.closed_at,
    (
      c.closed_at is null
      and c.status = 'unanswered'
      and c.last_message_at is not null
      and (c.doctor_last_read_at is null or c.last_message_at > c.doctor_last_read_at)
    ) as has_unread
  from public.conversations c
  left join public.member_profiles mp on mp.id = c.member_id
  where public.is_doctor() and c.patient_id = p_patient_id
  order by (c.closed_at is null) desc, coalesce(c.last_message_at, c.created_at) desc;
$$;

-- ---------------------------------------------------------------------
-- 8) doctor_patients_overview: pacientes (titulares) que JÁ tiveram subscrição
--    (0019), com contadores/flags para o terapeuta destacar e pôr no topo quem
--    tem consulta ABERTA por responder. Idade calculada na app.
-- ---------------------------------------------------------------------
create or replace function public.doctor_patients_overview()
returns table (
  patient_id     uuid,
  full_name      text,
  email          text,
  phone          text,
  date_of_birth  date,
  created_at     timestamptz,
  plan_type      text,
  sub_active     boolean,
  open_count     int,
  needs_response boolean,
  has_unread     boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    u.email,
    p.phone,
    p.date_of_birth,
    p.created_at,
    s.plan_type,
    (s.expires_at is not null and s.expires_at > now()) as sub_active,
    (select count(*)::int from public.conversations c
       where c.patient_id = p.id and c.closed_at is null) as open_count,
    exists (
      select 1 from public.conversations c
      where c.patient_id = p.id and c.closed_at is null and c.status = 'unanswered'
    ) as needs_response,
    exists (
      select 1 from public.conversations c
      where c.patient_id = p.id and c.closed_at is null and c.status = 'unanswered'
        and c.last_message_at is not null
        and (c.doctor_last_read_at is null or c.last_message_at > c.doctor_last_read_at)
    ) as has_unread
  from public.profiles p
  join auth.users u on u.id = p.id
  left join lateral (
    select s1.plan_type, s1.expires_at
    from public.subscriptions s1
    where s1.owner_id = p.id
    order by s1.expires_at desc
    limit 1
  ) s on true
  where p.role = 'patient'
    and public.is_doctor()
    -- Só quem (alguma vez) teve subscrição — coerente com a 0019.
    and exists (select 1 from public.subscriptions s2 where s2.owner_id = p.id)
  order by needs_response desc, p.full_name;
$$;
