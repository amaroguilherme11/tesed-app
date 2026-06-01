# Email de recuperação de password — Tesed

Como personalizar o email de reset (#5) e configurar os redirects para o link
abrir a app.

## 1. Configurar os Redirect URLs (necessário para o link abrir a app)

Painel Supabase → **Authentication → URL Configuration**:
- **Redirect URLs:** adicionar
  ```
  tesed://reset-password
  tesed://*
  ```
- (Em produção, quando houver página web de reset, acrescentar também o URL do site.)

> Sem isto, o Supabase recusa o `redirectTo` e o link não abre a app.

## 2. Personalizar o template do email

Painel Supabase → **Authentication → Emails → "Reset Password"** (Templates).

**Subject (assunto):**
```
Redefinir a sua password — Tesed
```

**Message body (HTML):** colar o seguinte (usa as variáveis do Supabase
`{{ .ConfirmationURL }}`):

```html
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #383837;">
  <div style="text-align:center; padding: 16px 0;">
    <div style="display:inline-block; background:#009EAB; color:#fff; font-size:22px; font-weight:bold; padding:10px 18px; border-radius:12px; letter-spacing:1px;">
      tesed
    </div>
  </div>
  <h2 style="color:#009EAB; font-size:20px;">Redefinir a sua password</h2>
  <p>Recebemos um pedido para redefinir a password da sua conta Tesed.</p>
  <p>Toque no botão abaixo para definir uma nova password. Este link abre a app Tesed.</p>
  <p style="text-align:center; margin: 28px 0;">
    <a href="{{ .ConfirmationURL }}"
       style="background:#009EAB; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:12px; font-weight:bold; display:inline-block;">
      Definir nova password
    </a>
  </p>
  <p style="font-size:13px; color:#6E7A7B;">
    Se não foi você a pedir, ignore este email — a sua password não será alterada.
  </p>
  <hr style="border:none; border-top:1px solid #E1E9EA; margin:24px 0;">
  <p style="font-size:12px; color:#6E7A7B; text-align:center;">
    Tesed — Saúde Integrada
  </p>
</div>
```

Guardar.

## 3. Testar
1. Na app → **Esqueci-me da password** → introduzir o email.
2. Abrir o email (já com a marca Tesed) → tocar em **"Definir nova password"**.
3. O link abre a app no ecrã **"Definir nova password"** → escrever a nova password
   (duas vezes) → **Guardar**.
4. Voltar ao login e entrar com a nova password.

> ⚠️ O fluxo in-app funciona num **build real** (não no Expo Go), porque depende do
> deep link `tesed://`. Em teste interno (build de loja) funciona.

## Nota de produção
A **página web de reset** (funciona em PC e telemóvel sem app) fica para a próxima
versão — ver `docs/PENDENTES-PRODUCAO.md`. Para já, a recuperação é in-app
(telemóvel) ou via admin.
