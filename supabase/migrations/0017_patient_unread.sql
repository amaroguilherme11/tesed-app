-- =====================================================================
-- Tesed — Migração 0017: paciente vê mensagens por ler
-- O paciente passa a saber se tem resposta nova do médico que ainda não viu.
-- Mecanismo: cada conversa guarda quando o paciente a leu pela última vez.
-- "Tem não lida" = a conversa está 'answered' (médico respondeu) E a última
-- mensagem é mais recente do que a última leitura do paciente.
-- =====================================================================

alter table public.conversations
  add column if not exists patient_last_read_at timestamptz;

-- ---------------------------------------------------------------------
-- mark_conversation_read: o paciente (dono da conversa) marca-a como lida.
-- Aceita o próprio titular para qualquer das suas conversas (próprias ou de
-- dependentes). SECURITY DEFINER, mas valida que a conversa é do utilizador.
-- ---------------------------------------------------------------------
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
     set patient_last_read_at = now()
   where id = p_conversation_id
     and patient_id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------
-- my_patient_chats: devolve as conversas do paciente (própria + dependentes)
-- com a flag has_unread (resposta do médico ainda não vista).
-- ---------------------------------------------------------------------
create or replace function public.my_patient_chats()
returns table (
  conversation_id uuid,
  member_id       uuid,
  status          text,
  last_message_at timestamptz,
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
    c.status,
    c.last_message_at,
    (
      c.status = 'answered'
      and c.last_message_at is not null
      and (c.patient_last_read_at is null or c.last_message_at > c.patient_last_read_at)
    ) as has_unread
  from public.conversations c
  where c.patient_id = auth.uid();
$$;
