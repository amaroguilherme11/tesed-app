# Pendências de Produção — Tesed

Itens a tratar **antes do lançamento público** (após o teste interno). Alguns
foram simplificados/desligados durante o desenvolvimento e têm de ser repostos.

> 🚀 **ESTADO (2026-07-01):** app **publicada e a funcionar nas três plataformas** —
> Google Play, App Store (**v1.0.2**) e Web (**chat.tesed.pt**, alojada no cPanel do
> site). Fixes já lançados: notificações limpas no logout, auto-recuperação do
> arranque (perfil recarrega sozinho, sem reabrir), caixa do terapeuta só com quem
> teve subscrição (migração 0019), separadores de data e copiar código. Os itens
> abaixo ficam para a **próxima atualização** ou para confirmar.

## 🔒 Segurança / Auth
- [ ] **Reativar confirmação de email no registo.** Foi desligada para testes.
      Painel: **Authentication → Providers → Email → "Confirm email" = ON**.
      Ver `docs/CONFIG-EMAILS-SUPABASE.md` (templates + redirect URLs já preparados).
- [ ] **Configurar SMTP próprio** (Authentication → SMTP Settings). O email
      gratuito do Supabase só envia ~3-4/hora — insuficiente para produção.
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
- [x] **Política de Privacidade publicada** em
      `https://www.tesed.pt/tesed-chat-politica-de-privacidade/` (com secção de
      eliminação de conta em `#eliminar-conta`). ⚠️ Falta confirmar que o
      `[PREENCHER: email de suporte]` foi substituído pelo email real.
- [x] Questionários da Play Console (classificação, público-alvo, Data safety,
      app de saúde, ID de publicidade = Não) — preenchidos e submetidos.
- [x] App Store: ficha, App Privacy, classificação etária, conta de revisão.

## 💳 Pagamentos (Ifthenpay / WooCommerce)
- [ ] Empresa instala o plugin WordPress + define os SKU dos 6 produtos.
- [ ] Definir `TESED_PAYMENT_SECRET` igual nos dois lados.
- [ ] Teste conjunto com um pagamento real (ambiente de testes Ifthenpay).

## 🔔 Notificações push
- [ ] Validar push em dispositivo real (precisa de build com credenciais FCM/APNs).
- [ ] Confirmar o Database Webhook a disparar a função `send-notification`.

## 🧪 Dados de teste
- [ ] Limpar contas/conversas de teste antes de abrir ao público (mantendo SEMPRE a
      conta do terapeuta e a `demo.review@example.com`). Query transacional bulletproof
      (apaga de baixo para cima por causa de `messages_sender_id_fkey`) já preparado
      nesta sessão — confirmar que correu sem erro.

## 📱 Recomendações da Google Play (próxima atualização — NÃO bloqueiam)

Apareceram como "ações recomendadas" na faixa de Produção. São de nível
framework/design, não bloqueiam a publicação nem a revisão. Tratar quando se fizer
um **build novo (vc11)**, idealmente junto com uma **subida de Expo SDK**.

- [ ] **APIs de "edge-to-edge" descontinuadas (Android 15).** Avisos em
      `setStatusBarColor` / `setNavigationBarColor` / `LAYOUT_IN_DISPLAY_CUTOUT_MODE_*`.
      **Não é código nosso** — vêm do React Native, react-native-screens, expo-image-picker
      e Material Components. Resolve-se ao **atualizar o Expo SDK** (o 54 ainda avisa);
      não é corrigível diretamente por nós.
- [ ] **Restrição de orientação para ecrãs grandes (Android 16).** A app fixa
      `android:screenOrientation="PORTRAIT"` (vem de `orientation: "portrait"` no
      `app.json`). A partir do Android 16, tablets/dobráveis ignoram o bloqueio.
      Só mexer se quisermos **suportar bem tablets/dobráveis** — implica tirar o lock
      de portrait, **testar todos os ecrãs em horizontal** e fazer build novo.
      Decisão de produto (app é pensada para telemóvel em vertical).

## 🔜 Melhorias da app (próxima atualização)

- [ ] **Chat: abrir já nas mensagens mais recentes.** Ao entrar numa conversa, a
      lista começa no topo e **desliza (animado)** até ao fim — vê-se o "salto".
      Objetivo: mostrar **logo o fundo** (mensagens recentes), sem animação visível.
      Onde: `app/src/components/ChatView.tsx` — o `FlatList` usa
      `onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}`.
      Fix sugerido: no **1.º carregamento** fazer `scrollToEnd({ animated: false })`
      (salto instantâneo) e só **animar** nas mensagens seguintes; em alternativa,
      usar `FlatList` **`inverted`** (renderiza de baixo para cima → o fundo aparece
      logo). Vale para todas as plataformas (é código → precisa de build + re-deploy web).
