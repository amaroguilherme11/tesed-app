# Edge Functions — Tesed

## ifthenpay-callback (Fase 5)

Gera o **código pago** após confirmação de pagamento. Ver a especificação de
integração para a empresa em `docs/INTEGRACAO-PAGAMENTOS.md`.

### Deploy (equipa Tesed)

Pré-requisitos: Supabase CLI instalada e projeto ligado (`supabase link`).

```bash
# 1. Definir o segredo partilhado (escolhe um valor forte e aleatório)
supabase secrets set TESED_PAYMENT_SECRET="<segredo-forte-aleatorio>"

# 2. Deploy da função
supabase functions deploy ifthenpay-callback

# (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente.)
```

O URL fica:
```
https://<PROJETO>.supabase.co/functions/v1/ifthenpay-callback
```

### Testar (sem website nem Ifthenpay)

Simular uma confirmação de pagamento com curl (substitui o segredo e o URL):

```bash
curl -X POST "https://<PROJETO>.supabase.co/functions/v1/ifthenpay-callback" \
  -H "Authorization: Bearer <segredo>" \
  -H "content-type: application/json" \
  -d '{"payment_ref":"TESTE-001","plan":"individual","months":3}'
```

Resposta esperada:
```json
{ "ok": true, "code": "TESED-XXXX-XXXX", "plan": "individual", "months": 3, "status": "active" }
```

Repetir a MESMA chamada (mesmo `payment_ref`) devolve o MESMO código
(idempotência) — não cria um segundo código.

Depois, na app, resgata esse código no ecrã de Subscrição (Fase 4).

### Segurança
- Sem o cabeçalho `Authorization: Bearer <segredo>` correto → `401`.
- A função usa a `service_role` só internamente; o cliente nunca lhe chama.
- A RPC `create_paid_code` só é executável pelo `service_role` (ver 0014).
