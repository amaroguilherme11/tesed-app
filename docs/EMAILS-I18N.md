# Emails de Auth bilingues (PT/EN) — Tesed

Os emails de **confirmação de conta** e **reposição de password** são enviados pelo
Supabase Auth a partir de *templates* configurados no painel. Estes templates
aceitam *Go templates*, por isso podem **ramificar pelo idioma** do paciente.

Os templates abaixo mantêm o **design existente** (marca Tesed / Saúde Integrada);
só o **texto** é condicional. O cabeçalho e o rodapé (marca) são iguais nas duas
línguas — por isso ficam **fora** do `{{ if }}`, sem duplicação.

## Como funciona o idioma
- No **registo**, a app envia o idioma no `user_metadata` (`locale: 'pt' | 'en'`).
- A migração **0023** e a RPC `set_my_locale` mantêm esse `locale` atualizado
  (quando o paciente troca de idioma na app).
- Nos templates, o idioma lê-se com `{{ .Data.locale }}`.
- Se o `locale` não existir (contas antigas), cai no ramo **PT** (default seguro).

## Onde colar
Painel Supabase → **Authentication → Emails → Templates**. Para cada template
abaixo, cola o **Subject** e o **Message body** (HTML).

> ⚠️ Requer a migração **0023** aplicada e uma build da app que já envie o `locale`
> (para o `{{ .Data.locale }}` ter valor). Antes disso, todos os emails saem em PT.

---

## 1) Confirm signup (Confirmação de conta)

**Subject**
```
{{ if eq .Data.locale "en" }}Welcome to Tesed — confirm your account{{ else }}Bem-vindo(a) à Tesed — confirme a sua conta{{ end }}
```

**Message body (HTML)**
```html
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #383837;">
  <div style="text-align:center; padding: 8px 0 16px;">
    <span style="display:inline-block; background:#009EAB; color:#fff; font-size:24px; font-weight:bold; padding:10px 20px; border-radius:14px; letter-spacing:1px;">Tesed</span>
    <div style="color:#6E7A7B; font-size:13px; margin-top:6px;">Saúde Integrada</div>
  </div>
  {{ if eq .Data.locale "en" }}
  <h2 style="color:#009EAB; font-size:20px;">Welcome to Tesed</h2>
  <p style="line-height:1.5;">You're one step away from activating your account. Tap the button below to confirm your email — the link opens directly in the app.</p>
  <p style="text-align:center; margin: 28px 0;">
    <a href="{{ .ConfirmationURL }}" style="background:#009EAB; color:#ffffff; text-decoration:none; padding:14px 30px; border-radius:14px; font-weight:bold; display:inline-block; font-size:16px;">Confirm my account</a>
  </p>
  <p style="font-size:13px; color:#6E7A7B;">If you didn't create this account, please ignore this email.</p>
  {{ else }}
  <h2 style="color:#009EAB; font-size:20px;">Bem-vindo(a) à Tesed</h2>
  <p style="line-height:1.5;">Falta um passo para ativares a tua conta. Toca no botão abaixo para confirmar o teu email — o link abre diretamente na app.</p>
  <p style="text-align:center; margin: 28px 0;">
    <a href="{{ .ConfirmationURL }}" style="background:#009EAB; color:#ffffff; text-decoration:none; padding:14px 30px; border-radius:14px; font-weight:bold; display:inline-block; font-size:16px;">Confirmar a minha conta</a>
  </p>
  <p style="font-size:13px; color:#6E7A7B;">Se não criaste esta conta, ignore este email.</p>
  {{ end }}
  <hr style="border:none; border-top:1px solid #E1E9EA; margin:24px 0;">
  <p style="font-size:12px; color:#6E7A7B; text-align:center;">Tesed — Saúde Integrada</p>
</div>
```

---

## 2) Reset Password (Reposição de password)

**Subject**
```
{{ if eq .Data.locale "en" }}Reset your Tesed password{{ else }}Redefinir a sua password Tesed{{ end }}
```

**Message body (HTML)**
```html
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #383837;">
  <div style="text-align:center; padding: 8px 0 16px;">
    <span style="display:inline-block; background:#009EAB; color:#fff; font-size:24px; font-weight:bold; padding:10px 20px; border-radius:14px; letter-spacing:1px;">Tesed</span>
    <div style="color:#6E7A7B; font-size:13px; margin-top:6px;">Saúde Integrada</div>
  </div>
  {{ if eq .Data.locale "en" }}
  <h2 style="color:#009EAB; font-size:20px;">Reset your password</h2>
  <p style="line-height:1.5;">Hi,</p>
  <p style="line-height:1.5;">We received a request to reset the password for your Tesed account. Tap the button below to choose a new password — the link opens directly in the app.</p>
  <p style="text-align:center; margin: 28px 0;">
    <a href="{{ .ConfirmationURL }}" style="background:#009EAB; color:#ffffff; text-decoration:none; padding:14px 30px; border-radius:14px; font-weight:bold; display:inline-block; font-size:16px;">Set new password</a>
  </p>
  <p style="font-size:13px; color:#6E7A7B;">This link is valid for 1 hour. If this wasn't you, ignore this email — your password won't be changed.</p>
  {{ else }}
  <h2 style="color:#009EAB; font-size:20px;">Redefinir a sua password</h2>
  <p style="line-height:1.5;">Olá,</p>
  <p style="line-height:1.5;">Recebemos um pedido para redefinir a password da tua conta Tesed. Toca no botão abaixo para escolheres uma nova password — o link abre diretamente na app.</p>
  <p style="text-align:center; margin: 28px 0;">
    <a href="{{ .ConfirmationURL }}" style="background:#009EAB; color:#ffffff; text-decoration:none; padding:14px 30px; border-radius:14px; font-weight:bold; display:inline-block; font-size:16px;">Definir nova password</a>
  </p>
  <p style="font-size:13px; color:#6E7A7B;">Este link é válido por 1 hora. Se não foste tu, ignora este email — a tua password não será alterada.</p>
  {{ end }}
  <hr style="border:none; border-top:1px solid #E1E9EA; margin:24px 0;">
  <p style="font-size:12px; color:#6E7A7B; text-align:center;">Tesed — Saúde Integrada</p>
</div>
```

---

## Notas
- **Design preservado:** é exatamente o teu HTML atual; só se acrescentou o ramo EN
  e o `{{ if eq .Data.locale "en" }}`. O texto PT ficou igual ao que já tinhas.
- **Marca "Saúde Integrada"** fica igual nas duas línguas (é identidade). Se quiseres
  em inglês (ex.: "Integrated Health"), diz — move-se o cabeçalho para dentro do `{{ if }}`.
- O **código após compra** (email do WooCommerce) **não** é deste sistema — vem do
  plugin WordPress no site da empresa; a tradução desse email é do lado deles.
- Para **testar**: cria uma conta de teste com a app em **EN** e confirma que o email
  chega em inglês; depois uma em **PT**.
