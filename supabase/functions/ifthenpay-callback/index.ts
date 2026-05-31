// =====================================================================
// Tesed — Edge Function: ifthenpay-callback (Fase 5)
//
// Gera o CÓDIGO PAGO depois de um pagamento confirmado. Cumpre a regra de
// ouro (CLAUDE.md nº 2): o código pago só nasce de uma chamada de SERVIDOR
// verificada — nunca do browser do cliente.
//
// Como é usada (decisão: "a empresa trata da entrega"):
//   1. O cliente paga no website da empresa (Ifthenpay: MB Way/Multibanco).
//   2. Quando o Ifthenpay confirma, o SERVIDOR da empresa chama esta função,
//      autenticando-se com um segredo partilhado (TESED_PAYMENT_SECRET).
//   3. Esta função gera o código (idempotente) e devolve-o em JSON.
//   4. A empresa entrega o código ao cliente (página de sucesso / email).
//   5. O cliente resgata o código na app (Fase 4, já feito).
//
// Aceita também ser chamada como CALLBACK direto do Ifthenpay (GET com o
// segredo no parâmetro ?key=...), caso se opte por essa via no futuro.
//
// Variáveis de ambiente (definir como secrets da função):
//   - TESED_PAYMENT_SECRET        : segredo partilhado com a empresa (obrigatório)
//   - SUPABASE_URL                : injetado automaticamente pelo Supabase
//   - SUPABASE_SERVICE_ROLE_KEY   : injetado automaticamente pelo Supabase
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // --- Autenticação: segredo partilhado ---
  // POST (servidor da empresa): header  Authorization: Bearer <segredo>
  // GET  (callback Ifthenpay):   parâmetro  ?key=<segredo>
  const expected = Deno.env.get('TESED_PAYMENT_SECRET') ?? '';
  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const keyParam = url.searchParams.get('key') ?? '';
  const provided = bearer || keyParam;

  if (!expected || provided !== expected) {
    return json(401, { error: 'unauthorized' });
  }

  // --- Parâmetros: de JSON (POST) ou da query string (GET) ---
  let body: Record<string, unknown> = {};
  if (req.method === 'POST') {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  }
  const param = (k: string): string | undefined => {
    const v = body[k] ?? url.searchParams.get(k) ?? undefined;
    return v == null ? undefined : String(v);
  };

  // Referência do pagamento (idempotência). Aceita vários nomes comuns.
  const paymentRef =
    param('payment_ref') ?? param('id') ?? param('requestId') ?? param('orderId');
  const plan = param('plan') ?? param('plan_type');
  const monthsStr = param('months') ?? param('duration_months');
  const months = monthsStr ? parseInt(monthsStr, 10) : undefined;

  if (!paymentRef || !plan || !months) {
    return json(400, {
      error: 'missing_params',
      required: ['payment_ref', 'plan (individual|family)', 'months (3|6|12)'],
      received: { payment_ref: paymentRef, plan, months },
    });
  }

  // --- Gera o código via função de servidor (service_role) ---
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabase.rpc('create_paid_code', {
    p_payment_ref: paymentRef,
    p_plan_type: plan,
    p_duration_months: months,
  });

  if (error) {
    return json(400, { error: error.message });
  }

  // Devolve o código para a empresa o entregar ao cliente.
  return json(200, {
    ok: true,
    code: data.code,
    plan: data.plan_type,
    months: data.duration_months,
    status: data.status,
  });
});
