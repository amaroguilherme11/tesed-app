# Notificações push — diagnóstico (#1)

As notificações não chegavam. Causas possíveis e o que foi/falta fazer.

## O que foi corrigido (código)
- Adicionado o plugin **`expo-notifications`** ao `app.json` (necessário para o
  registo de push funcionar no build nativo).
- O código de registo (`lib/notifications.ts`) já estava correto: pede permissão,
  cria canal Android, obtém o Expo push token e grava-o em `device_tokens`.

## O que FALTA configurar (externo — sem isto o push não chega no Android)

### 1. Credenciais FCM (Firebase) no Android — OBRIGATÓRIO
O Android entrega push **via Firebase Cloud Messaging (FCM)**. O Expo precisa da
chave do FCM para enviar. Sem isto, o token é gerado mas **nenhuma notificação é
entregue**. Passos (uma vez):
1. Criar um projeto no **Firebase Console** (console.firebase.google.com) — ou usar
   um existente da Tesed.
2. Adicionar uma app Android com o package **`pt.tesed.app`**.
3. Em **Project Settings → Cloud Messaging**, obter a credencial (Service Account
   JSON da Firebase Admin SDK).
4. Carregá-la no EAS:
   ```powershell
   eas credentials
   ```
   → Android → "Google Service Account" / "FCM V1" → fornecer o JSON.
   (Ou via painel Expo: Project → Credentials → Android → FCM.)

> Sem este passo, o push Android **não funciona**, mesmo com tudo o resto certo.

### 2. Database Webhook a disparar a função — VERIFICAR
Painel Supabase → **Database → Webhooks**: confirmar que existe um hook em
**INSERT** na tabela **public.messages** a chamar a função `send-notification`,
com o header `Authorization: Bearer <TESED_WEBHOOK_SECRET>`.

Para testar se a função recebe: enviar uma mensagem e ver os **logs** da função
no painel (Edge Functions → send-notification → Logs). Deve aparecer uma invocação.

### 3. Token registado — VERIFICAR
Depois de instalar um build com sessão iniciada, confirmar que há linhas em
`device_tokens` (SQL Editor):
```sql
select user_id, platform, left(token, 20) || '...' as token, updated_at
from public.device_tokens order by updated_at desc;
```
Se estiver vazio: o registo do token falhou (permissão negada? build sem o plugin?).

## Como testar (depois do build novo + FCM)
1. Instalar o build em 2 dispositivos (médico + paciente), iniciar sessão.
2. Confirmar 2 linhas em `device_tokens`.
3. Paciente envia mensagem → médico recebe notificação (e vice-versa).
4. Se não chegar: ver logs da função `send-notification` no painel.

## Resumo
| Item | Estado |
|---|---|
| Plugin expo-notifications no app.json | ✅ feito |
| Código de registo de token | ✅ feito |
| Credenciais FCM no EAS | ⬜ **falta (obrigatório Android)** |
| Database Webhook ativo | ⬜ verificar |
| Tokens a serem gravados | ⬜ verificar após build |
