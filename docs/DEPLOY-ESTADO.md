# Estado do Deploy — Tesed

Registo do que já está em produção (Supabase) e do que falta configurar.

Projeto Supabase: **tesedappchat** · ref `grahfijlwtdzildrpvgs` · região **Central EU (Frankfurt)**.

## ✅ Edge Functions (deployed)

| Função | URL |
|---|---|
| Pagamentos | `https://grahfijlwtdzildrpvgs.supabase.co/functions/v1/ifthenpay-callback` |
| Notificações | `https://grahfijlwtdzildrpvgs.supabase.co/functions/v1/send-notification` |

Inspecionar: https://supabase.com/dashboard/project/grahfijlwtdzildrpvgs/functions

## ⏳ Falta configurar

### 1. Segredos (definidos por ti + empresa)
Os dois lados de cada segredo têm de ter **o mesmo valor**.

```bash
# Pagamentos — combinar o valor com a empresa
supabase secrets set TESED_PAYMENT_SECRET="<valor-combinado>"
# Notificações — só interno
supabase secrets set TESED_WEBHOOK_SECRET="<valor-interno>"
```
(Correr na raiz do projeto, com a CLI ligada: `supabase link --project-ref grahfijlwtdzildrpvgs`.)

### 2. Migrações 0015 e 0016 (aplicar no SQL Editor)
As migrações foram aplicadas manualmente pelo SQL Editor (não pela CLI), por isso
**não usar `supabase db push`**. Aplicar `0015_notifications.sql` e
`0016_patient_phone.sql` colando no SQL Editor.

### 3. Plugin WordPress (empresa)
Em **Definições → Tesed Subscrições**:
- **URL do endpoint:** `https://grahfijlwtdzildrpvgs.supabase.co/functions/v1/ifthenpay-callback`
- **Segredo partilhado:** o `TESED_PAYMENT_SECRET` combinado.
- Definir os SKU dos 6 produtos (ver `website/wordpress-plugin/README.md`).

### 4. Database Webhook (notificações)
No painel: **Database → Webhooks → Create a new hook** (ou via barra de pesquisa
`Ctrl/Cmd+K` → "webhooks"):
- **Table:** `public.messages` · **Events:** `Insert`
- **Type:** Supabase Edge Functions → `send-notification`
- **HTTP Header:** `Authorization: Bearer <TESED_WEBHOOK_SECRET>`

### 5. Push real (build)
Push não funciona no Expo Go — precisa de development build (EAS) ou build de
loja (teste interno / TestFlight). Ver `docs/NOTIFICACOES.md`.

## Como testar o endpoint de pagamentos (após definir o segredo)
```bash
curl -X POST "https://grahfijlwtdzildrpvgs.supabase.co/functions/v1/ifthenpay-callback" `
  -H "Authorization: Bearer <TESED_PAYMENT_SECRET>" `
  -H "content-type: application/json" `
  -d '{"payment_ref":"TESTE-001","plan":"individual","months":3}'
```
Resposta: `{ "ok": true, "code": "TESED-XXXX-XXXX", ... }`. Repetir com o mesmo
`payment_ref` devolve o mesmo código (idempotência). Resgatar na app (Subscrição).
