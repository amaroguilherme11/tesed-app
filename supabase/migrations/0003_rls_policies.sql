-- =====================================================================
-- Tesed — Migração 0003: Row Level Security (secção 5)
-- Princípio: nunca confiar no cliente para segurança ou dinheiro.
-- =====================================================================

alter table public.app_config         enable row level security;
alter table public.profiles           enable row level security;
alter table public.conversations      enable row level security;
alter table public.messages           enable row level security;
alter table public.attachments        enable row level security;
alter table public.subscription_codes enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.family_members     enable row level security;

-- app_config: sem políticas -> inacessível ao cliente.
-- Só service_role e funções SECURITY DEFINER lhe tocam.

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
-- Ler: o próprio, OU qualquer perfil de médico (info pública do médico),
-- OU tudo se for o médico (admin).
create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or role = 'doctor'
    or public.is_doctor()
  );

-- Atualizar: só o próprio perfil. (A mudança de 'role' é bloqueada por trigger.)
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
-- Nota: INSERT é feito pelo trigger handle_new_user (SECURITY DEFINER).

-- ---------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------
create policy "conversations_select" on public.conversations
  for select using (patient_id = auth.uid() or public.is_doctor());

-- Paciente cria a SUA conversa (doctor_id é preenchido por trigger).
create policy "conversations_insert_own" on public.conversations
  for insert with check (patient_id = auth.uid());

-- Atualização direta só pelo médico (o estado é gerido por trigger de mensagens).
create policy "conversations_update_doctor" on public.conversations
  for update using (public.is_doctor());

-- ---------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------
create policy "messages_select" on public.messages
  for select using (
    public.is_doctor()
    or conversation_id in (
      select id from public.conversations where patient_id = auth.uid()
    )
  );

-- Inserir: tem de ser o remetente E participante da conversa.
create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (
      public.is_doctor()
      or conversation_id in (
        select id from public.conversations where patient_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------
-- attachments: seguem a permissão da conversa da mensagem.
-- ---------------------------------------------------------------------
create policy "attachments_select" on public.attachments
  for select using (
    message_id in (
      select m.id from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where public.is_doctor() or c.patient_id = auth.uid()
    )
  );

create policy "attachments_insert" on public.attachments
  for insert with check (
    message_id in (
      select m.id from public.messages m
      where m.sender_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- subscription_codes
-- Códigos pagos só são criados pelo servidor (service_role, sem política).
-- O médico (admin) pode listar; o resgate faz-se por RPC (Fase 4).
-- ---------------------------------------------------------------------
create policy "subscription_codes_select_doctor" on public.subscription_codes
  for select using (public.is_doctor());

-- ---------------------------------------------------------------------
-- subscriptions: o titular vê a sua; o médico vê todas.
-- Criação/edição só por RPC de resgate (Fase 4) com service_role.
-- ---------------------------------------------------------------------
create policy "subscriptions_select" on public.subscriptions
  for select using (owner_id = auth.uid() or public.is_doctor());

-- ---------------------------------------------------------------------
-- family_members: o membro vê a sua linha; o titular e o médico veem.
-- Inserção só por RPC de resgate (Fase 4), com limite de 6 imposto no servidor.
-- ---------------------------------------------------------------------
create policy "family_members_select" on public.family_members
  for select using (
    member_id = auth.uid()
    or public.is_doctor()
    or subscription_id in (
      select id from public.subscriptions where owner_id = auth.uid()
    )
  );
