# CLAUDE.md — Contexto do Projeto Tesed

> Este ficheiro é lido automaticamente pelo Claude Code sempre que o projeto é aberto.
> Define o contexto, as regras e o modo de trabalho. A especificação completa está em
> `docs/ARQUITETURA.md` — lê-a como fonte de verdade antes de começar.

## O que é este projeto

**Tesed** — app móvel (iOS + Android) de comunicação assíncrona médico-paciente.
Substitui o caos de WhatsApp/telemóvel: cada conversa tem um estado claro
(respondida / não respondida) para que nenhum paciente fique sem resposta.

Há **uma única conta de médico** que responde a todos os pacientes e acumula a
administração. Pacientes registam-se livremente. As subscrições são vendidas num
website (fora da app) e ativadas na app através de um código.

## Stack

- App móvel: **React Native + Expo** (um código → iOS + Android)
- Backend / BD / Auth / Storage / Realtime: **Supabase**, região **UE** (RGPD)
- Website de venda + webhooks: **Next.js**
- Pagamentos: **Stripe** (cartão) + **Ifthenpay ou EuPago** (MB Way / Multibanco)
- Notificações: **Expo Notifications**

## Documentos de referência (lê primeiro)

- `docs/ARQUITETURA.md` — especificação completa: produto, modelo de dados, segurança,
  fluxos críticos, RGPD, fases. **Esta é a fonte de verdade.**
- `docs/PROMPT-CLAUDE-CODE.md` — instruções de arranque da Fase 1.

## Regras inegociáveis

1. **Estado "não respondida"** implementado via **trigger de base de dados**
   (não confiar na app). Ver secção 6 da arquitetura.
2. **Códigos pagos** só podem ser criados por **webhook verificado no servidor**.
   Nunca gerar códigos no cliente. O resgate é validado no servidor numa transação
   (impede uso duplo). Ver secção 7.
3. **A app NÃO tem compras in-app** — só um campo de resgate de código. Ver secção 9.
4. **Médico único:** dois papéis apenas (paciente / médico). Sem auto-registo de médico;
   a conta de médico é criada por seeding. Ver secção 3.
5. **Plano família: até 6 pessoas** no total, imposto no servidor.
6. **RGPD:** alojamento na UE, encriptação, consentimento explícito no registo.
   Dados de saúde são categoria especial. Ver secção 10. Não deixar para o fim.
7. **Design tokens** num único ficheiro (`app/src/theme/`). Cores/fontes do Tesed
   ainda não estão definidas — usar os placeholders da secção 11 e mantê-los
   centralizados para troca fácil.

## Modo de trabalho

- Avança **fase a fase** (secção 13 da arquitetura). Não saltes à frente.
- No fim de cada fase, **mostra o que foi feito e como testar** antes de prosseguir.
- **Explica decisões** quando houver mais do que um caminho razoável.
- **Pede confirmação antes de alterações destrutivas** (apagar ficheiros, comandos de
  sistema). Mantém o modo de revisão de edições ligado.
- Nunca definas passwords nem cries contas em nome de terceiros — constrói o sistema
  que permite que os utilizadores o façam.

## Estado atual

**Fase 1 — Fundação: concluída.** Monorepo, modelo de dados, RLS, trigger de
estado "não respondida", seeding do médico único (por convite, sem definir password),
design tokens e auth com dois papéis (paciente/médico).

**Fase 2 — Mensagens: concluída.** Conversa paciente↔médico em tempo real
(Supabase Realtime), envio de mensagens, e caixa de entrada do médico com as
NÃO RESPONDIDAS em destaque + contador. O estado é gerido pelo trigger de BD.

Fases 1 e 2 **verificadas em dispositivo real** (Expo Go, SDK 54) + web: routing por
papel, registo com consentimento, e o estado "não respondida" a mudar em tempo real
nos dois sentidos.

**Fase 3 — Ficheiros: concluída e testada.** Anexos **bidirecionais** (paciente↔médico)
via Supabase Storage (bucket privado), RLS a seguir a conversa, URLs assinados
temporários, e vista **📎 Ficheiros** com todos os ficheiros trocados.

**Fase 4 — Subscrições (resgate): concluída e testada.** Tudo via funções de
SERVIDOR (SECURITY DEFINER) — o cliente nunca escreve nos códigos/subscrições:
`create_free_code`, `revoke_code`, `redeem_code` (transacional, FOR UPDATE, sem uso
duplo), `add_family_member`/`remove_family_member` (limite 6 imposto no servidor),
`my_subscription`, `family_of`. Ecrã do paciente (resgatar código, ver validade, gerir
família até 6) e ecrã do médico (gerar código grátis 3 meses, listar/revogar).
Ajustes pedidos e implementados:
- **Resgate cumulativo** (`0008_redeem_cumulative.sql`): com subscrição ativa, o tempo
  soma-se (3+3=6 meses); família "ganha" no upgrade de plano.
- **Subscrição obrigatória para enviar** (`0009_require_active_subscription.sql`):
  quem não tiver subscrição ativa não envia mensagens nem ficheiros (RLS +
  `has_active_subscription`; médico envia sempre; membros de família contam como ativos).
  Na app, o compositor esconde-se com aviso e desbloqueia ao resgatar (useFocusEffect).
- **`lib/confirm.ts`**: confirmação cross-platform (o Alert.alert não dispara botões na
  web — afetava revogar código e remover membro).
- `supabase/scripts/create-test-user.mjs`: cria paciente de teste confirmado (testar família).
Ficheiros: `0007_subscriptions_rpc.sql`, `0008_redeem_cumulative.sql`,
`0009_require_active_subscription.sql`, `lib/subscriptions.ts`, `lib/confirm.ts`,
`screens/patient/SubscriptionScreen.tsx`, `screens/doctor/CodesScreen.tsx`.

**Família por PERFIS de dependentes (0011 + 0012): concluída e testada.**
Mudança de modelo importante a pedido do cliente:
- Registo passa a pedir **data de nascimento** (campo DD/MM/AAAA validado).
- Os membros de família **deixam de ser contas com email**. O **titular** gere
  **perfis de dependentes** (nome + data nascimento, sem login) — tabela `member_profiles`,
  RPCs `add_member_profile`/`remove_member_profile`/`my_member_profiles` (limite 6 no servidor).
- `conversations` ganha `member_id` (NULL = chat do próprio titular). **Uma conversa por
  (titular, membro)**; cada dependente tem o seu chat.
- **Paciente:** plano família mostra lista de chats (Eu + dependentes) com idade; escolhe
  de quem é o caso. Adicionar/remover membros no ecrã principal.
- **Médico:** caixa de entrada agrupa por titular; família aparece como
  **"Família: nome"** e abre para os chats separados de cada membro (com idade).
  `doctor_inbox()` reescrita para devolver titular+membro; idade calculada na app (`lib/age.ts`,
  meses para bebés). Removido o mecanismo antigo por email (`family_members` + RPCs).
Ficheiros: `0011_dob_and_doctor_inbox.sql`, `0012_family_member_profiles.sql`,
`lib/age.ts`, `lib/family.ts`, `screens/patient/{PatientChat,AddMember}Screen.tsx`,
`screens/doctor/DoctorFamilyChatsScreen.tsx`, `components/DateField.tsx`.
NOTA (bug corrigido): `useConversations` usa nome de canal Realtime único por instância
(`doctor-inbox-N`) — dois ecrãs a usar o mesmo nome causavam ecrã em branco na vista
de família do médico.

**Fase 6 — Painel médico/admin: concluída e testada.** Função de servidor
`admin_metrics()` (só médico) e ecrã **Painel** com conversas por estado (destaque das
não respondidas), pacientes, subscrições (ativas/expiradas/individual/família), códigos
(ativos/usados/revogados) e total de mensagens. Botões "Painel" e "Códigos" no
cabeçalho do médico. Ficheiros: `0010_admin_metrics.sql`,
`screens/doctor/DashboardScreen.tsx`.

**Fase 5 — Pagamentos (Ifthenpay/WooCommerce): backend + plugin prontos (a fazer
deploy/integrar).** O website é **WordPress + WooCommerce** e JÁ tem o fluxo
Ifthenpay a funcionar — NÃO se altera. A ponte para a app é um **plugin WordPress**.
Decisão: Edge Function no nosso Supabase; o código pago só nasce de chamada de
servidor verificada por **segredo partilhado** (regra nº 2).
- `0014_paid_codes.sql`: `create_paid_code(payment_ref, plan, months)` — idempotente
  (mesma `payment_ref` nunca gera 2 códigos), só executável pela `service_role`.
- `supabase/functions/ifthenpay-callback/`: endpoint autenticado por `TESED_PAYMENT_SECRET`.
- `website/wordpress-plugin/tesed-ifthenpay-bridge.php`: plugin que reage ao gancho
  `woocommerce_payment_complete`, lê o **SKU** (TESED-IND-3 … TESED-FAM-12) → (plan,
  months), chama o endpoint, e mostra/envia o código (página de obrigado + email WooCommerce).
- Docs: `docs/INTEGRACAO-PAGAMENTOS.md` (para a empresa) + `website/wordpress-plugin/README.md`
  + `supabase/functions/README.md` (deploy).
Falta (depende de externos): deploy da função + definir segredo (nós); instalar/configurar
o plugin e definir os SKU (empresa); teste conjunto.

NOTAS IMPORTANTES (decididas pelo cliente):
- **O website JÁ ESTÁ criado pela empresa** — não construímos o site de raiz; integramos
  com o existente (página de planos já existe). O nosso foco é o **webhook** que, após
  pagamento confirmado, gera o código pago em `subscription_codes` (origin='paid_website')
  e o entrega ao cliente. O webhook é verificado no servidor (regra nº 2).
- **Método de pagamento principal: Ifthenpay** (MB Way / Multibanco). Stripe (cartão)
  fica secundário/opcional.

Requisito posterior (Fase 7): **uma notificação por cada mensagem recebida**, para
médico e paciente (Expo Notifications).

## Questões em aberto (não bloqueiam a Fase 1)

- Identidade visual oficial do Tesed (cores, fontes, logótipo) — por agora placeholders.
- Limite de tamanho/tipo de ficheiros submetidos pelos pacientes.
- Preços de cada plano (3/6/12; individual/família).
- ~~Gateway PT: Ifthenpay vs EuPago.~~ **RESOLVIDO: Ifthenpay** (principal). Website já
  existe (criado pela empresa) — integrar via webhook, não construir de raiz.
