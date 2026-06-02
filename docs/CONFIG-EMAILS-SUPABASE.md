# Configuração de Emails e Auth no Supabase — Tesed

Tudo o que se configura **no painel** (não é código) para o reset de password e a
confirmação de email funcionarem com a marca Tesed e abrirem a app.

---

## 1. Redirect URLs (Authentication → URL Configuration)

Adicionar TODOS estes em **Redirect URLs**:
```
tesed://reset-password
tesed://confirm
tesed://
```
(O último com `*` no fim para cobrir qualquer rota — `tesed` + dois pontos + barra + asterisco.)

> Sem isto, o Supabase ignora o redirect e o link não abre a app corretamente.

**Site URL:** pode ficar `tesed://` (ou o URL do website quando existir).

---

## 2. Ativar confirmação de email (Authentication → Providers → Email)

- Ligar **"Confirm email"**.
- Efeito: ao registar-se, o paciente recebe um email de confirmação e só entra
  depois de clicar no link (que abre a app e cria a sessão).

---

## 3. Template: Confirmar registo (Authentication → Emails → Confirm signup)

**Assunto:**
```
Confirme a sua conta — Tesed
```

**Corpo (HTML):**
```html
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #383837;">
  <div style="text-align:center; padding: 8px 0 16px;">
    <span style="display:inline-block; background:#009EAB; color:#fff; font-size:24px; font-weight:bold; padding:10px 20px; border-radius:14px; letter-spacing:1px;">tesed</span>
    <div style="color:#6E7A7B; font-size:13px; margin-top:6px;">saúde integrada</div>
  </div>
  <h2 style="color:#009EAB; font-size:20px;">Bem-vindo(a) à Tesed</h2>
  <p style="line-height:1.5;">Falta um passo para ativar a sua conta. Toque no botão abaixo para confirmar o seu email — o link abre diretamente na app.</p>
  <p style="text-align:center; margin: 28px 0;">
    <a href="{{ .ConfirmationURL }}" style="background:#009EAB; color:#ffffff; text-decoration:none; padding:14px 30px; border-radius:14px; font-weight:bold; display:inline-block; font-size:16px;">Confirmar a minha conta</a>
  </p>
  <p style="font-size:13px; color:#6E7A7B;">Se não foi você a criar esta conta, ignore este email.</p>
  <hr style="border:none; border-top:1px solid #E1E9EA; margin:24px 0;">
  <p style="font-size:12px; color:#6E7A7B; text-align:center;">Tesed — Saúde Integrada</p>
</div>
```

---

## 4. Template: Redefinir password (Authentication → Emails → Reset Password)

**Assunto:**
```
Redefinir a sua password — Tesed
```

**Corpo (HTML):**
```html
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #383837;">
  <div style="text-align:center; padding: 8px 0 16px;">
    <span style="display:inline-block; background:#009EAB; color:#fff; font-size:24px; font-weight:bold; padding:10px 20px; border-radius:14px; letter-spacing:1px;">tesed</span>
    <div style="color:#6E7A7B; font-size:13px; margin-top:6px;">saúde integrada</div>
  </div>
  <h2 style="color:#009EAB; font-size:20px;">Redefinir a sua password</h2>
  <p style="line-height:1.5;">Olá,</p>
  <p style="line-height:1.5;">Recebemos um pedido para redefinir a password da sua conta Tesed. Toque no botão abaixo para escolher uma nova password — o link abre diretamente na app.</p>
  <p style="text-align:center; margin: 28px 0;">
    <a href="{{ .ConfirmationURL }}" style="background:#009EAB; color:#ffffff; text-decoration:none; padding:14px 30px; border-radius:14px; font-weight:bold; display:inline-block; font-size:16px;">Definir nova password</a>
  </p>
  <p style="font-size:13px; color:#6E7A7B;">Este link é válido por 1 hora. Se não foi você, ignore este email — a sua password não será alterada.</p>
  <hr style="border:none; border-top:1px solid #E1E9EA; margin:24px 0;">
  <p style="font-size:12px; color:#6E7A7B; text-align:center;">Tesed — Saúde Integrada</p>
</div>
```

---

## ⚠️ Regras importantes
- O botão dos DOIS templates **tem de** apontar para `{{ .ConfirmationURL }}` — é a
  variável que o Supabase substitui pelo link real. Não alterar.
- A app já trata os dois tipos de link (reset E confirmação) no AuthContext —
  não é preciso código adicional.
- O fluxo só funciona num **build real** (não no Expo Go), porque depende do deep
  link `tesed://`.

## Nota de produção (limite de emails)
O serviço de email gratuito do Supabase tem um limite baixo de envios/hora (~3-4),
adequado para testes. Para produção, configurar um **SMTP próprio** (Authentication
→ SMTP Settings) com um serviço de email da empresa, para não bloquear envios reais.
