-- =====================================================================
-- Tesed — Migração 0027: corrige MEMBROS DUPLICADOS na lista de família
--
-- Bug (reproduzido com uma cliente): na vista de família do paciente, um membro
-- aparecia REPETIDO quando tinha mais do que uma consulta (ex.: fechar a 1.ª e
-- abrir a 2.ª). Como as linhas repetidas eram o MESMO member_profile, remover
-- uma "cópia" removia o membro todo.
--
-- Causa: my_member_profiles fazia LEFT JOIN com conversations (desenhada quando
-- havia UMA conversa por membro). Com as consultas (0020) passou a haver várias
-- por membro -> o JOIN multiplicava as linhas (uma por consulta).
--
-- Correção: UMA linha por membro. O conversation_id (mantido só para não mudar a
-- forma da RPC; já não é usado pela app) passa a ser o da consulta mais recente
-- via subquery, sem multiplicar.
--
-- FIX SÓ DE SERVIDOR: corrige a app já publicada assim que a migração é aplicada,
-- sem precisar de novo build nem OTA.
-- =====================================================================

create or replace function public.my_member_profiles()
returns table (
  id              uuid,
  full_name       text,
  date_of_birth   date,
  conversation_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    mp.id,
    mp.full_name,
    mp.date_of_birth,
    (
      select c.id
      from public.conversations c
      where c.patient_id = mp.owner_id and c.member_id = mp.id
      order by c.created_at desc
      limit 1
    ) as conversation_id
  from public.member_profiles mp
  where mp.owner_id = auth.uid()
  order by mp.created_at;
$$;
