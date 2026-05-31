-- =====================================================================
-- Tesed — Migração 0009: exigir subscrição ATIVA para enviar (Fase 4, regra)
-- Quem não tiver subscrição ativa NÃO pode enviar mensagens nem ficheiros.
-- Imposto no SERVIDOR (RLS) — a app não é fonte de verdade.
-- Exceções: o MÉDICO envia sempre; MEMBROS de família contam como ativos.
-- =====================================================================

-- Helper: o utilizador tem subscrição ativa? (titular OU membro de família)
create or replace function public.has_active_subscription(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions s
    left join public.family_members fm on fm.subscription_id = s.id
    where s.expires_at > now()
      and (s.owner_id = p_uid or fm.member_id = p_uid)
  );
$$;

-- Recria a política de INSERT de mensagens com a exigência de subscrição.
-- Médico: sempre. Paciente: tem de ser participante da conversa E ter ativa.
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
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

-- Defesa em profundidade: anexos só por quem pode (médico, ou paciente com
-- subscrição ativa que seja o remetente da mensagem). O envio de anexo cria
-- sempre uma mensagem primeiro (já barrada acima), mas reforçamos aqui também.
drop policy if exists "attachments_insert" on public.attachments;
create policy "attachments_insert" on public.attachments
  for insert with check (
    message_id in (select m.id from public.messages m where m.sender_id = auth.uid())
    and (public.is_doctor() or public.has_active_subscription(auth.uid()))
  );
