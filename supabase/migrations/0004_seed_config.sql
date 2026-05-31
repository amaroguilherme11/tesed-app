-- =====================================================================
-- Tesed — Migração 0004: configuração de arranque
-- Define o EMAIL do médico único. A CONTA em si NÃO é criada aqui:
-- o médico é convidado (sem password) e define a sua própria password.
-- Ver supabase/scripts/seed-doctor.mjs e supabase/README.md.
-- =====================================================================

-- AÇÃO NECESSÁRIA: substituir pelo email real do médico antes de convidar.
-- (Pode também ser definido/atualizado via SQL no painel Supabase.)
insert into public.app_config (key, value)
values ('doctor_email', 'terapeuta@example.com')
on conflict (key) do nothing;
