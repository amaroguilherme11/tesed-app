// =====================================================================
// Tesed — Seeding da conta de médico única (Fase 1, secção 3)
//
// O QUE FAZ: envia um CONVITE por email ao médico. O Supabase cria a conta
// de auth SEM password; o médico define a sua própria password pelo link do
// convite. O trigger handle_new_user atribui automaticamente role='doctor'
// porque o email coincide com app_config.doctor_email.
//
// O QUE NÃO FAZ (de propósito): nunca define passwords nem cria contas em
// nome de terceiros (regra do CLAUDE.md).
//
// COMO USAR:
//   1. Garante que app_config.doctor_email tem o email correto (migração 0004).
//   2. Define as variáveis de ambiente (NÃO commitar segredos):
//        SUPABASE_URL=...                (URL do projeto)
//        SUPABASE_SERVICE_ROLE_KEY=...   (chave de serviço, SÓ no servidor)
//        DOCTOR_EMAIL=medico@exemplo.tesed.pt
//   3. node supabase/scripts/seed-doctor.mjs
// =====================================================================

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const doctorEmail = process.env.DOCTOR_EMAIL;

if (!url || !serviceKey || !doctorEmail) {
  console.error(
    'Faltam variáveis de ambiente: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DOCTOR_EMAIL.'
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.inviteUserByEmail(doctorEmail);

if (error) {
  console.error('Falha ao convidar o médico:', error.message);
  process.exit(1);
}

console.log('Convite enviado para o médico:', data?.user?.email);
console.log('O médico deve abrir o link do email e definir a sua password.');
console.log('O role="doctor" é atribuído automaticamente pelo trigger.');
