// =====================================================================
// Tesed — Criar conta de DEMONSTRAÇÃO para a análise das lojas
// (Google Play "Acesso a apps" / App Store Connect "Sign-in information").
//
// Cria um PACIENTE já confirmado E com SUBSCRIÇÃO ATIVA, para o revisor
// poder testar tudo (login, conversa, enviar mensagens/fotos/ficheiros).
//
//   - email_confirm: true  -> a conta nasce confirmada; NÃO é enviado email,
//     por isso o email NÃO precisa de existir de verdade (é só o login).
//   - subscrição ativa     -> obrigatória para enviar mensagens/fotos (RLS).
//
// É seguro re-executar: se a conta já existir, repõe a password; se já tiver
// subscrição ativa, não cria outra.
//
// NÃO partilhar a service_role key. Esta conta é só para os revisores das lojas.
//
// COMO USAR (PowerShell), a partir da raiz do projeto:
//   $env:SUPABASE_URL="https://grahfijlwtdzildrpvgs.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role key>"   # painel: Project Settings > API
//   node supabase/scripts/create-review-account.mjs
//
// Opcional (senão usa os valores por omissão abaixo):
//   $env:REVIEW_EMAIL="demo.review@example.com"
//   $env:REVIEW_PASSWORD="TesedReview!2026"
//   $env:REVIEW_NAME="Conta de Demonstração"
//   $env:REVIEW_PLAN="individual"     # individual | family
//   $env:REVIEW_MONTHS="24"           # duração da subscrição demo
// =====================================================================

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('✗ Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const email = process.env.REVIEW_EMAIL || 'demo.review@example.com';
const password = process.env.REVIEW_PASSWORD || 'TesedReview!2026';
const fullName = process.env.REVIEW_NAME || 'Conta de Demonstração';
const plan = process.env.REVIEW_PLAN || 'individual';
const months = parseInt(process.env.REVIEW_MONTHS || '24', 10);

if (!['individual', 'family'].includes(plan)) {
  console.error(`✗ REVIEW_PLAN inválido: "${plan}" (usa "individual" ou "family").`);
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------
// 1) Criar (ou reaproveitar) o utilizador, já confirmado.
// ---------------------------------------------------------------------
let userId;
const created = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true, // confirmada de imediato; não envia email
  user_metadata: { full_name: fullName, consent: 'true' },
});

if (created.error) {
  if (/registered|already|exists/i.test(created.error.message)) {
    // Já existe: encontrar e repor a password para garantir o acesso do revisor.
    const list = await admin.auth.admin.listUsers({ perPage: 1000 });
    const existing = list.data?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!existing) {
      console.error('✗ A conta já existe mas não a consegui localizar na lista de utilizadores.');
      process.exit(1);
    }
    userId = existing.id;
    const upd = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (upd.error) {
      console.error('✗ Falha a repor a password:', upd.error.message);
      process.exit(1);
    }
    console.log('• Conta já existia — password reposta e email confirmado.');
  } else {
    console.error('✗ Falha ao criar a conta:', created.error.message);
    process.exit(1);
  }
} else {
  userId = created.data.user.id;
  console.log('• Conta de paciente criada e confirmada.');
}

// ---------------------------------------------------------------------
// 2) Garantir subscrição ATIVA (sem duplicar).
//    "Ativa" = expires_at no futuro (ver has_active_subscription / 0009).
// ---------------------------------------------------------------------
const nowIso = new Date().toISOString();
const { data: activeSubs, error: subSelErr } = await admin
  .from('subscriptions')
  .select('id, plan_type, expires_at')
  .eq('owner_id', userId)
  .gt('expires_at', nowIso);

if (subSelErr) {
  console.error('✗ Falha a verificar subscrições existentes:', subSelErr.message);
  process.exit(1);
}

if (activeSubs && activeSubs.length > 0) {
  console.log(`• Já tinha subscrição ativa (${activeSubs[0].plan_type}) — não criei outra.`);
} else {
  const expiresAt = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error: subInsErr } = await admin.from('subscriptions').insert({
    owner_id: userId,
    plan_type: plan,
    starts_at: nowIso,
    expires_at: expiresAt,
    status: 'active',
    source_code_id: null, // demo: sem código de origem
  });
  if (subInsErr) {
    console.error('✗ Falha ao ativar a subscrição:', subInsErr.message);
    process.exit(1);
  }
  console.log(`• Subscrição ativa criada (${plan}, ~${months} meses).`);
}

// ---------------------------------------------------------------------
// 3) Resumo + texto pronto a colar na consola das lojas.
// ---------------------------------------------------------------------
const block = [
  'Conta de demonstração (paciente):',
  `  Email: ${email}`,
  `  Password: ${password}`,
  '',
  'Notas para o revisor:',
  '- App destinada a pacientes (registo livre na app). O "terapeuta" é uma conta',
  '  interna única, não disponível no registo público.',
  '- Esta conta já tem subscrição ativa: é possível enviar mensagens, fotos',
  '  (câmara e galeria) e ficheiros na conversa com o terapeuta.',
].join('\n');

console.log('\n========================================================');
console.log(' CONTA DE DEMONSTRAÇÃO PRONTA');
console.log('========================================================');
console.log(`  Email:    ${email}`);
console.log(`  Password: ${password}`);
console.log('--------------------------------------------------------');
console.log(' Cola isto no campo de instruções de acesso:');
console.log('--------------------------------------------------------');
console.log(block);
console.log('========================================================');
