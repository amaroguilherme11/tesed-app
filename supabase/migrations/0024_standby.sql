-- =====================================================================
-- Tesed — Migração 0024: estado "Em standby" (só terapeuta)
--
-- O terapeuta pode marcar uma consulta ABERTA e POR RESPONDER como "em standby",
-- para a tirar da contagem de "por responder" sem mudar NADA do lado do paciente
-- (o status continua 'unanswered'; standby_at é um campo à parte, só do terapeuta).
--
-- Volta a "por responder" quando:
--   - chega uma mensagem do paciente (após o standby);
--   - o terapeuta envia uma mensagem (após o standby);   } via trigger em messages
--   - o terapeuta toca no botão de novo (toggle_standby off).
-- Se a consulta for fechada, o standby desaparece (fechada = sem estados).
--
-- Aditiva/retrocompatível: coluna nova (NULL), RPCs recriadas com colunas EXTRA
-- (o cliente antigo ignora-as); a app 1.0.x/1.1.x continua a funcionar.
-- =====================================================================

-- 1) Coluna standby_at (NULL = sem standby). Independente do status.
alter table public.conversations add column if not exists standby_at timestamptz;

-- 2) Qualquer mensagem nova (paciente OU terapeuta) limpa o standby.
create or replace function public.clear_standby_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
     set standby_at = null
   where id = new.conversation_id and standby_at is not null;
  return new;
end;
$$;

drop trigger if exists trg_clear_standby_on_message on public.messages;
create trigger trg_clear_standby_on_message
  after insert on public.messages
  for each row execute function public.clear_standby_on_message();

-- 3) toggle_standby: terapeuta liga/desliga. LIGAR só se ABERTA + 'unanswered';
--    DESLIGAR sempre (enquanto aberta).
create or replace function public.toggle_standby(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_doctor() then
    raise exception 'Apenas o terapeuta pode alterar o standby.';
  end if;
  update public.conversations
     set standby_at = case when standby_at is null then now() else null end
   where id = p_conversation_id
     and closed_at is null
     -- ligar só se por responder; desligar (standby_at not null) sempre.
     and (standby_at is not null or status = 'unanswered');
  if not found then
    raise exception 'Consulta não encontrada, fechada, ou não está por responder.';
  end if;
end;
$$;

grant execute on function public.toggle_standby(uuid) to authenticated;

-- 4) close_consultation: limpa também o standby (fechada = sem estados).
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
         status = 'answered',
         standby_at = null,             -- fechada não tem standby
         doctor_last_read_at = now(),
         patient_last_read_at = now()
   where id = p_conversation_id and closed_at is null;
  if not found then
    raise exception 'Consulta não encontrada ou já fechada.';
  end if;
end;
$$;

-- 5) doctor_patient_consultations: + is_standby; has_unread exclui standby.
drop function if exists public.doctor_patient_consultations(uuid);
create function public.doctor_patient_consultations(p_patient_id uuid)
returns table (
  conversation_id uuid,
  member_id       uuid,
  member_name     text,
  member_dob      date,
  is_open         boolean,
  status          text,
  is_standby      boolean,
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
    (c.standby_at is not null) as is_standby,
    c.last_message_at,
    c.created_at,
    c.closed_at,
    (
      c.closed_at is null
      and c.status = 'unanswered'
      and c.standby_at is null
      and c.last_message_at is not null
      and (c.doctor_last_read_at is null or c.last_message_at > c.doctor_last_read_at)
    ) as has_unread
  from public.conversations c
  left join public.member_profiles mp on mp.id = c.member_id
  where public.is_doctor() and c.patient_id = p_patient_id
  order by (c.closed_at is null) desc, coalesce(c.last_message_at, c.created_at) desc;
$$;

-- 6) doctor_patients_overview: unanswered_count exclui standby; + standby_count.
drop function if exists public.doctor_patients_overview();
create function public.doctor_patients_overview()
returns table (
  patient_id       uuid,
  full_name        text,
  email            text,
  phone            text,
  date_of_birth    date,
  created_at       timestamptz,
  plan_type        text,
  sub_active       boolean,
  open_count       int,
  unanswered_count int,
  standby_count    int,
  needs_response   boolean,
  has_unread       boolean
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
    (select count(*)::int from public.conversations c
       where c.patient_id = p.id and c.closed_at is null
         and c.status = 'unanswered' and c.standby_at is null) as unanswered_count,
    (select count(*)::int from public.conversations c
       where c.patient_id = p.id and c.closed_at is null
         and c.status = 'unanswered' and c.standby_at is not null) as standby_count,
    exists (
      select 1 from public.conversations c
      where c.patient_id = p.id and c.closed_at is null
        and c.status = 'unanswered' and c.standby_at is null
    ) as needs_response,
    exists (
      select 1 from public.conversations c
      where c.patient_id = p.id and c.closed_at is null
        and c.status = 'unanswered' and c.standby_at is null
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
    and exists (select 1 from public.subscriptions s2 where s2.owner_id = p.id)
  order by needs_response desc, standby_count desc, p.full_name;
$$;
