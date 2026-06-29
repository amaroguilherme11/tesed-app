-- =====================================================================
-- Tesed — Migração 0019: caixa do terapeuta só mostra quem JÁ teve subscrição
--
-- Pedido do cliente: evitar "clutter" de conversas de contas que se registaram
-- mas NUNCA tiveram subscrição. A caixa do médico passa a listar apenas as
-- conversas cujo TITULAR (patient_id) tem (ou teve) uma subscrição — ativa OU
-- expirada (basta existir alguma linha em subscriptions para esse titular).
--
-- Notas:
--  - Inclui expiradas de propósito ("alguma vez teve") — o médico continua a ver
--    pacientes antigos.
--  - Família: os chats dos dependentes têm patient_id = titular (que tem a
--    subscrição), por isso aparecem na mesma.
--  - Só altera a leitura do médico (doctor_inbox). O paciente continua a ver os
--    seus próprios chats (my_patient_chats) sem alteração.
-- =====================================================================

drop function if exists public.doctor_inbox();
create or replace function public.doctor_inbox()
returns table (
  id               uuid,
  patient_id       uuid,
  member_id        uuid,
  status           text,
  last_message_at  timestamptz,
  created_at       timestamptz,
  owner_name       text,
  owner_dob        date,
  owner_phone      text,
  member_name      text,
  member_dob       date,
  is_family        boolean,
  has_unread       boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.patient_id,
    c.member_id,
    c.status,
    c.last_message_at,
    c.created_at,
    p.full_name as owner_name,
    p.date_of_birth as owner_dob,
    p.phone as owner_phone,
    mp.full_name as member_name,
    mp.date_of_birth as member_dob,
    exists (
      select 1 from public.subscriptions s
      where s.owner_id = c.patient_id and s.plan_type = 'family' and s.expires_at > now()
    ) as is_family,
    (
      c.last_message_at is not null
      and c.status = 'unanswered'  -- última foi do paciente
      and (c.doctor_last_read_at is null or c.last_message_at > c.doctor_last_read_at)
    ) as has_unread
  from public.conversations c
  join public.profiles p on p.id = c.patient_id
  left join public.member_profiles mp on mp.id = c.member_id
  where public.is_doctor()
    -- NOVO: só conversas de titulares que (alguma vez) tiveram subscrição.
    and exists (
      select 1 from public.subscriptions s2 where s2.owner_id = c.patient_id
    )
  order by
    case when c.status = 'unanswered' then 0 else 1 end,
    c.last_message_at desc nulls last;
$$;
