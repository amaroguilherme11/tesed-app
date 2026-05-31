// =====================================================================
// Tesed — Edge Function: send-notification (Fase 7)
//
// Envia UMA notificação push por cada mensagem recebida, ao destinatário certo.
// Acionada por um Database Webhook do Supabase em INSERT na tabela `messages`.
//
// Regras:
//   - Paciente escreve  -> notifica o MÉDICO.
//   - Médico escreve     -> notifica o PACIENTE titular da conversa.
//   - Chats de dependentes pertencem ao titular -> o titular é notificado,
//     com o nome do membro no texto ("... sobre o José").
//
// Segurança: o webhook tem de enviar o cabeçalho
//   Authorization: Bearer <TESED_WEBHOOK_SECRET>
// (configurado no Database Webhook do Supabase). Sem ele -> 401.
//
// Secrets necessários:
//   - TESED_WEBHOOK_SECRET       (obrigatório)
//   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (injetados automaticamente)
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  // --- Autenticação do webhook ---
  const expected = Deno.env.get('TESED_WEBHOOK_SECRET') ?? '';
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!expected || token !== expected) {
    return json(401, { error: 'unauthorized' });
  }

  // --- Payload do Database Webhook: { type, table, record, ... } ---
  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }
  const msg = payload.record;
  if (!msg || !msg.conversation_id || !msg.sender_id) {
    return json(400, { error: 'missing_message' });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // --- Conversa (titular, médico, membro) ---
  const { data: conv } = await supabase
    .from('conversations')
    .select('patient_id, doctor_id, member_id')
    .eq('id', msg.conversation_id)
    .single();
  if (!conv) return json(200, { ok: true, skipped: 'no_conversation' });

  // --- Papel do remetente ---
  const { data: sender } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', msg.sender_id)
    .single();
  const senderIsDoctor = sender?.role === 'doctor';

  // --- Destinatário ---
  const recipientId = senderIsDoctor ? conv.patient_id : conv.doctor_id;
  if (!recipientId) return json(200, { ok: true, skipped: 'no_recipient' });

  // --- Texto da notificação ---
  let title: string;
  let body: string;
  const preview = (msg.body ?? '').toString().slice(0, 120);

  if (senderIsDoctor) {
    // Para o paciente. Se a conversa for de um dependente, menciona o nome.
    let aboutWhom = '';
    if (conv.member_id) {
      const { data: mp } = await supabase
        .from('member_profiles')
        .select('full_name')
        .eq('id', conv.member_id)
        .single();
      if (mp?.full_name) aboutWhom = ` (sobre ${mp.full_name})`;
    }
    title = 'Nova resposta do médico';
    body = `${preview}${aboutWhom}`;
  } else {
    // Para o médico. Identifica o paciente e, se aplicável, o membro.
    const { data: patient } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', conv.patient_id)
      .single();
    let who = patient?.full_name ?? 'Paciente';
    if (conv.member_id) {
      const { data: mp } = await supabase
        .from('member_profiles')
        .select('full_name')
        .eq('id', conv.member_id)
        .single();
      if (mp?.full_name) who = `${who} — ${mp.full_name}`;
    }
    title = `Nova mensagem: ${who}`;
    body = preview;
  }

  // --- Tokens do destinatário ---
  const { data: tokens } = await supabase
    .from('device_tokens')
    .select('token')
    .eq('user_id', recipientId);

  if (!tokens || tokens.length === 0) {
    return json(200, { ok: true, sent: 0, note: 'sem dispositivos registados' });
  }

  // --- Envia para a Expo Push API (uma entrada por token) ---
  const messages = tokens.map((t: { token: string }) => ({
    to: t.token,
    sound: 'default',
    title,
    body,
    data: { conversationId: msg.conversation_id },
  }));

  const res = await fetch(EXPO_PUSH, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(messages),
  });
  const result = await res.json().catch(() => null);

  return json(200, { ok: true, sent: messages.length, expo: result });
});
