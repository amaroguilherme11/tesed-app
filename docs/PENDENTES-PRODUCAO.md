# Pendências de Produção — Tesed

Itens a tratar **antes do lançamento público** (após o teste interno). Alguns
foram simplificados/desligados durante o desenvolvimento e têm de ser repostos.

> 🚀 **ESTADO (2026-07-01):** app **publicada e a funcionar nas três plataformas** —
> Google Play, App Store (**v1.0.2**) e Web (**chat.tesed.pt**, alojada no cPanel do
> site). Fixes já lançados: notificações limpas no logout, auto-recuperação do
> arranque (perfil recarrega sozinho, sem reabrir), caixa do terapeuta só com quem
> teve subscrição (migração 0019), separadores de data e copiar código. Os itens
> abaixo ficam para a **próxima atualização** ou para confirmar.

## 🩺 Consultas + aviso de atualização (v1.1.0) — código pronto, a publicar

**Consultas:** as conversas passam a ser **consultas** com ciclo de vida (abertas
até o terapeuta fechar; fechadas = só leitura; paciente cria novas se não houver
aberta; terapeuta vê pacientes → consultas e pode fechar/reabrir).

**Aviso de atualização (mobile):** no arranque, a app compara a versão instalada
com `min_app_version` (Supabase). Se for inferior, mostra um ecrã a bloquear com
botão para a loja. Controla-se **sem rebuild**: sobe `min_app_version` no
`app_config` quando quiseres **forçar** um update (⚠️ só depois de a versão nova
estar mesmo publicada nas lojas, senão trancas quem não tem como atualizar).

Código todo commitado (migrações **0020** + **0021** + ecrãs). **Sequência de
publicação (por esta ordem):**

- [ ] **1. Aplicar as migrações `0020` e `0021`** no Supabase (SQL Editor: colar
      cada ficheiro e correr). São **aditivas e retrocompatíveis** — a 1.0.x
      publicada continua a funcionar; as conversas atuais tornam-se a 1.ª consulta
      **aberta**; `min_app_version` fica em `1.0.0` (ninguém bloqueado).
- [ ] **2. Build 1.1.0** (iOS + Android) via EAS + re-export web.
- [ ] **3. Testar** no TestFlight/interno e na web (logado): criar consulta (só com
      subscrição e sem outra aberta), consulta fechada só-leitura, família por
      membro, terapeuta fecha/reabre, por-responder no topo.
- [ ] **4. Publicar** nas 3 plataformas (App Store precisa de versão > 1.0.4 → 1.1.0).
- [ ] **5. (Opcional) Forçar update:** depois de a 1.1.0 estar live, subir
      `min_app_version` para `1.1.0` no `app_config` se quiseres obrigar todos a atualizar.

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

- [x] **Chat: abrir já nas mensagens mais recentes.** (Implementado na **1.0.3**.)
      No `ChatView`, o `onContentSizeChange` faz o **1.º salto sem animação**
      (`scrollToEnd({ animated: false })`) e só anima nas mensagens seguintes —
      deixa de se ver o "deslizar do topo".
