// =====================================================================
// Tesed — Criar conta de TESTE (paciente) para experimentar a família
//
// Cria um utilizador já confirmado, via chave de serviço (admin). O trigger
// handle_new_user cria-lhe o perfil como 'patient' (porque o email não é o do
// médico). Útil para testar "adicionar membro à família".
//
// NÃO USAR EM PRODUÇÃO para contas reais — é só para testes. Em produção, os
// utilizadores criam a própria conta (e definem a própria password).
//
// COMO USAR (PowerShell), a partir da raiz do projeto:
//   $env:SUPABASE_URL="https://<o-teu-projeto>.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="<a-tua-service_role-key>"   # painel: Project Settings > API
//   node supabase/scripts/create-test-user.mjs
//
// Opcional (senão usa valores por omissão):
//   $env:TEST_EMAIL="familia.teste@exemplo.pt"
//   $env:TEST_PASSWORD="Teste1234"
//   $env:TEST_NAME="Membro de Teste"
// =====================================================================

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

// Email "ao calhas" por omissão (com timestamp para não colidir).
const email = process.env.TEST_EMAIL || `familia.teste+${Date.now()}@exemplo.pt`;
const password = process.env.TEST_PASSWORD || 'Teste1234';
const fullName = process.env.TEST_NAME || 'Membro de Teste';

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true, // já confirmado: pode entrar de imediato
  user_metadata: { full_name: fullName, consent: 'true' },
});

if (error) {
  console.error('Falha ao criar a conta de teste:', error.message);
  process.exit(1);
}

console.log('Conta de teste criada com sucesso:');
console.log('  email:    ', data.user?.email);
console.log('  password: ', password);
console.log('  nome:     ', fullName);
console.log('');
console.log('Agora, no ecrã de Subscrição (família) do titular, adiciona este email como membro.');
