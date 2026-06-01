# Pendências de Produção — Tesed

Itens a tratar **antes do lançamento público** (após o teste interno). Alguns
foram simplificados/desligados durante o desenvolvimento e têm de ser repostos.

## 🔒 Segurança / Auth
- [ ] **Reativar confirmação de email no registo.** Foi desligada para testes.
      Painel: **Authentication → Providers → Email → "Confirm email" = ON**.
      (Com isto, o registo passa a exigir confirmação por email antes de entrar.)
- [ ] **Configurar URLs de redirect.** Painel: **Authentication → URL Configuration**:
      - Site URL: `tesed://` (e, quando existir, o URL do website).
      - Redirect URLs: `tesed://*`.
- [ ] **Rever/rotacionar segredos** (`TESED_PAYMENT_SECRET`, `TESED_WEBHOOK_SECRET`)
      antes de produção, se tiverem sido partilhados em canais inseguros.

## 🔑 Recuperação de password
- [ ] **Página web de reset de password** (funciona em PC e telemóvel). Por agora,
      há recuperação in-app (telemóvel) e reposição via admin/script. A página web
      fica para a próxima versão (alojar no website Tesed ou no nosso lado).

## 📄 Lojas / Legal
- [ ] **Política de Privacidade publicada** num URL público (texto em
      `docs/POLITICA-PRIVACIDADE-RASCUNHO.md`, requer revisão jurídica).
- [ ] Preencher os questionários da Play Console (classificação, data safety, etc.).

## 💳 Pagamentos (Ifthenpay / WooCommerce)
- [ ] Empresa instala o plugin WordPress + define os SKU dos 6 produtos.
- [ ] Definir `TESED_PAYMENT_SECRET` igual nos dois lados.
- [ ] Teste conjunto com um pagamento real (ambiente de testes Ifthenpay).

## 🔔 Notificações push
- [ ] Validar push em dispositivo real (precisa de build com credenciais FCM/APNs).
- [ ] Confirmar o Database Webhook a disparar a função `send-notification`.

## 🧪 Dados de teste
- [ ] Limpar contas/conversas de teste antes de abrir ao público.
