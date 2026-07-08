-- =====================================================================
-- Tesed — Migração 0021: versão mínima da app (forçar atualização em mobile)
--
-- A app lê esta versão no arranque; se a versão instalada for INFERIOR, mostra
-- um ecrã a bloquear com botão para a loja. Controla-se AQUI (sem rebuild):
-- basta atualizar o valor de 'min_app_version' quando quiseres forçar o update.
--
-- ⚠️ Só sobe o 'min_app_version' DEPOIS de a versão nova estar mesmo publicada
--    nas lojas — senão bloqueias utilizadores sem terem como atualizar.
-- =====================================================================

-- Valor inicial: 1.0.0 (ninguém é bloqueado). Sobe quando quiseres forçar.
insert into public.app_config (key, value)
values ('min_app_version', '1.0.0')
on conflict (key) do nothing;

-- RPC pública (SECURITY DEFINER — app_config tem RLS sem políticas): devolve a
-- versão mínima. Chamável por anon/authenticated (a verificação corre mesmo antes
-- do login).
create or replace function public.app_min_version()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select value from public.app_config where key = 'min_app_version';
$$;

grant execute on function public.app_min_version() to anon, authenticated;
