-- =====================================================================
-- Tesed — Migração 0005: Realtime (Fase 2)
-- Ativa a replicação em tempo real para mensagens e conversas.
-- O Realtime respeita a RLS: cada utilizador só recebe o que pode ler.
-- =====================================================================

-- Adiciona as tabelas à publicação do Supabase Realtime (idempotente).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;

-- A caixa de entrada do médico reage a UPDATEs de estado (answered/unanswered).
-- REPLICA IDENTITY FULL garante que o payload do UPDATE traz a linha completa.
alter table public.conversations replica identity full;
