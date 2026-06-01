// =====================================================================
// Tesed — Definir/repor a password de uma conta (admin)
//
// Usa a Admin API (service_role) para DEFINIR uma nova password de um
// utilizador existente, SEM apagar a conta nem depender do email de reset.
// Útil para a conta de médico em fase de teste interno.
//
// NÃO apaga dados, não altera o id do utilizador — só repõe a password.
//
// COMO USAR (PowerShell), a partir da raiz do projeto:
//   $env:SUPABASE_URL="https://grahfijlwtdzildrpvgs.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="<a-tua-service_role-key>"   # painel: Project Settings > API
//   $env:TARGET_EMAIL="terapeuta@example.com"
//   $env:NEW_PASSWORD="<nova-password-forte>"
//   node supabase/scripts/set-doctor-password.mjs
// =====================================================================

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.TARGET_EMAIL;
const newPassword = process.env.NEW_PASSWORD;

if (!url || !serviceKey || !email || !newPassword) {
  console.error(
    'Faltam variáveis: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TARGET_EMAIL, NEW_PASSWORD.'
  );
  process.exit(1);
}
if (newPassword.length < 8) {
  console.error('NEW_PASSWORD deve ter pelo menos 8 caracteres.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Encontrar o utilizador pelo email (percorre as páginas se necessário).
let userId = null;
let page = 1;
while (!userId) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error('Falha a listar utilizadores:', error.message);
    process.exit(1);
  }
  const found = data.users.find((u) => (u.email ?? '').toLowerCase() === email.toLowerCase());
  if (found) userId = found.id;
  if (data.users.length < 200) break; // última página
  page += 1;
}

if (!userId) {
  console.error(`Não foi encontrado nenhum utilizador com o email ${email}.`);
  process.exit(1);
}

const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
  password: newPassword,
});
if (updErr) {
  console.error('Falha a definir a password:', updErr.message);
  process.exit(1);
}

console.log('Password definida com sucesso para:', email);
console.log('Já podes iniciar sessão na app com a nova password.');
