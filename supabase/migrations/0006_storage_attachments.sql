-- =====================================================================
-- Tesed — Migração 0006: Storage de anexos (Fase 3)
-- Bucket PRIVADO 'attachments'. Anexos bidirecionais (paciente <-> médico).
-- Convenção de caminho do ficheiro:  <conversation_id>/<ficheiro>
-- As políticas seguem a permissão da CONVERSA: médico vê tudo; paciente só a sua.
-- =====================================================================

-- Cria o bucket privado (idempotente).
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Helper: extrai o conversation_id (1.ª pasta do caminho) e verifica acesso.
-- Médico tem acesso a tudo; paciente só às conversas onde é o patient_id.
create or replace function public.can_access_conversation_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = (split_part(object_name, '/', 1))::uuid
      and (public.is_doctor() or c.patient_id = auth.uid())
  );
$$;

-- LER/descarregar: quem tiver acesso à conversa do caminho.
drop policy if exists "attachments_read" on storage.objects;
create policy "attachments_read" on storage.objects
  for select using (
    bucket_id = 'attachments'
    and public.can_access_conversation_path(name)
  );

-- CARREGAR: idem (médico ou o paciente dono da conversa).
drop policy if exists "attachments_upload" on storage.objects;
create policy "attachments_upload" on storage.objects
  for insert with check (
    bucket_id = 'attachments'
    and public.can_access_conversation_path(name)
  );
