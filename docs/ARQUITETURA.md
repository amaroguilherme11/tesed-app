# Tesed — App de Comunicação Médico-Paciente
## Documento de Arquitetura e Especificação para Desenvolvimento

> Este documento é o ponto de partida para o desenvolvimento da aplicação no Claude Code.
> Descreve o produto, a arquitetura técnica, o modelo de dados e os fluxos críticos.
> Está escrito para ser autossuficiente: alguém (ou o Claude Code) deve conseguir começar a construir a partir daqui.

---

## 1. Visão Geral do Produto

Aplicação móvel (iOS + Android) que permite a pacientes comunicarem com o seu médico
de forma assíncrona e organizada, substituindo o caos de WhatsApp/telemóvel.

**Problema que resolve:** o médico não consegue acompanhar quantas conversas já respondeu.
A app garante que cada conversa tem um estado claro — respondida ou não respondida — para
que nenhum paciente fique sem resposta.

### Funcionalidades centrais
- Registo e autenticação de utilizadores, com dois papéis: **paciente** e **médico/admin**.
- **Existe uma única conta de médico** (o médico da clínica), que responde a todos os
  pacientes. Não há múltiplos médicos. Esta conta acumula também as funções de admin.
- Conversas (chat) entre cada paciente e o médico único.
- **Estado de conversa:** quando o paciente envia mensagem e o médico ainda não respondeu,
  a conversa fica marcada como NÃO RESPONDIDA. Assim que o médico responde, passa a RESPONDIDA.
- Submissão de ficheiros pelos pacientes (exames, documentos, imagens).
- Perfis distintos para médico e paciente.
- Sistema de subscrições com códigos:
  - **Código grátis (3 meses):** gerado pelo médico, entregue em consulta.
  - **Código pago:** gerado automaticamente após compra no website da clínica.
  - Planos: **3, 6 e 12 meses**, em modalidade **individual** ou **família (até 6 pessoas)**.
- A conta de médico acumula a administração (gestão de códigos e métricas). Não há registo
  de novas contas de médico — a conta única é criada uma vez, no arranque do sistema.

### Plataformas
- App nativa para **iOS e Android** a partir de um único código-base (React Native + Expo).
- **Website da clínica** (separado) para venda de subscrições e geração de códigos pagos.

---

## 2. Stack Técnica Recomendada

A escolha prioriza simplicidade, conformidade com RGPD (alojamento na UE) e um só código
para as duas plataformas.

| Camada | Tecnologia | Porquê |
|---|---|---|
| App móvel | **React Native + Expo** | Um código → iOS + Android. Expo simplifica build e publicação. |
| Backend + BD + Auth + Ficheiros | **Supabase** (região UE, ex.: Frankfurt) | Postgres + autenticação + storage + regras de segurança numa só plataforma, alojado na UE. |
| Tempo real (mensagens) | **Supabase Realtime** | Atualização instantânea das conversas. |
| Website da clínica | **Next.js** (ou site existente) | Página de venda + endpoint de webhook. |
| Pagamentos | **Stripe** (cartão) + **gateway PT** (Ifthenpay ou EuPago) para **MB Way/Multibanco** | Cartão internacional + métodos portugueses. |
| Notificações push | **Expo Notifications** | Avisar o médico de novas mensagens e o paciente de respostas. |

### Notas sobre alternativas
- **Flutter** seria igualmente válido, mas React Native liga-se melhor ao ecossistema
  JavaScript/Stripe/Supabase e à colaboração com o Claude.
- **Firebase** poderia substituir o Supabase, mas o Supabase usa Postgres (SQL, mais
  transparente para regras de subscrição) e tem regiões UE claras — melhor para RGPD.

---

## 3. Papéis e Permissões (Roles)

Cada utilizador tem exatamente um papel. A interface e as permissões mudam conforme o papel.
**Há apenas dois papéis na prática:** paciente e médico. A conta de médico é única e acumula
as funções de administração.

### Paciente
- Regista-se livremente na app (email + password).
- Edita o seu perfil (nome, data de nascimento, contacto, notas básicas).
- Tem uma conversa com o médico (único).
- Submete ficheiros dentro da conversa.
- Insere códigos de subscrição; vê o estado e a validade da sua subscrição.

### Médico (conta única, também admin)
- **Existe uma só conta de médico.** É criada uma vez, no arranque do sistema (seeding),
  não há auto-registo nem múltiplos médicos.
- Edita o seu perfil profissional (nome, especialidade, foto, descrição).
- Vê a lista de **todas** as conversas dos pacientes, com as **NÃO RESPONDIDAS em destaque**
  e um contador total.
- Lê e responde a mensagens; vê e descarrega ficheiros.
- Gera códigos grátis de 3 meses para entregar em consulta.
- Funções de administração: gere a tabela de códigos (lista, revoga) e vê métricas básicas
  (nº de conversas por estado, subscrições ativas).

> Nota: como o médico é único, o `doctor_id` é sempre o mesmo. O modelo de dados mantém o
> campo por clareza e para permitir evolução futura, mas a app pode preenchê-lo
> automaticamente com a conta de médico existente.

> A criação de contas individuais é sempre concluída pelo próprio utilizador ao definir a
> sua password. O sistema nunca define passwords em nome de terceiros.

---

## 4. Modelo de Dados (Base de Dados Postgres / Supabase)

Tabelas principais. Tipos simplificados para legibilidade.

### `profiles`
Estende a tabela de utilizadores de autenticação do Supabase.
```
id              uuid    (PK, = auth.users.id)
role            text    ('patient' | 'doctor')   -- a conta 'doctor' é única e também admin
full_name       text
date_of_birth   date    (pacientes)
phone           text
specialty       text    (médico)
photo_url       text
bio             text    (médico)
created_at      timestamptz
```
> Não há papel 'admin' separado nem campo 'approved': existe uma única conta 'doctor',
> criada no seeding inicial, que acumula a administração.

### `conversations`
Cada paciente tem uma conversa com o médico único.
```
id              uuid    (PK)
patient_id      uuid    (FK -> profiles.id)
doctor_id       uuid    (FK -> profiles.id; sempre a conta de médico única)
status          text    ('answered' | 'unanswered')  -- estado central do produto
last_message_at timestamptz
created_at      timestamptz
```
> Regra de estado: ver secção 6.

### `messages`
```
id              uuid    (PK)
conversation_id uuid    (FK -> conversations.id)
sender_id       uuid    (FK -> profiles.id)
body            text
created_at      timestamptz
```

### `attachments`
Ficheiros ligados a uma mensagem. **Bidirecional:** o paciente submete documentos/exames
e o **médico envia ficheiros a cada paciente** (ex.: resultados de exames, relatórios).
O remetente é o `sender_id` da mensagem a que o anexo pertence; as permissões seguem a
conversa (ver secção 5). Ver Fase 3.
```
id              uuid    (PK)
message_id      uuid    (FK -> messages.id)
file_path       text    (caminho no Supabase Storage)
file_name       text
mime_type       text
size_bytes      int
created_at      timestamptz
```

### `subscription_codes`
Tabela única para códigos grátis e pagos.
```
id              uuid    (PK)
code            text    (único, ex.: 'TESED-7F3K-9Q2X')
origin          text    ('free_consultation' | 'paid_website')
plan_type       text    ('individual' | 'family')
duration_months int     (3 | 6 | 12)
status          text    ('active' | 'used' | 'revoked')
created_by      uuid    (FK -> profiles.id; conta de médico para grátis; null/sistema para pago)
redeemed_by     uuid    (FK -> profiles.id; quem usou)
redeemed_at     timestamptz
stripe_session_id text  (referência ao pagamento, se pago)
created_at      timestamptz
```

### `subscriptions`
A subscrição efetiva de um utilizador (resultado de resgatar um código).
```
id              uuid    (PK)
owner_id        uuid    (FK -> profiles.id)  -- titular
plan_type       text    ('individual' | 'family')
starts_at       timestamptz
expires_at      timestamptz
source_code_id  uuid    (FK -> subscription_codes.id)
status          text    ('active' | 'expired')
created_at      timestamptz
```

### `family_members` (apenas para plano família)
Liga membros adicionais a uma subscrição de família. **Limite: 6 pessoas no total**
(o titular + até 5 membros adicionais).
```
id              uuid    (PK)
subscription_id uuid    (FK -> subscriptions.id)
member_id       uuid    (FK -> profiles.id)
added_at        timestamptz
```
> A função de resgate/gestão deve impedir ultrapassar 6 pessoas por subscrição de família.

---

## 5. Segurança da Base de Dados (Row Level Security)

O Supabase usa Postgres RLS. Regras essenciais a implementar:

- Um **paciente** só pode ler/escrever na sua própria conversa e mensagens.
- O **médico** (conta única) pode aceder a todas as conversas (é sempre o `doctor_id`).
- Ficheiros (`attachments`) seguem a permissão da conversa a que pertencem.
- A tabela `subscription_codes` **não é escrita pelo cliente** para códigos pagos —
  só pelo backend (webhook) com chave de serviço. Pacientes só podem fazer "redeem"
  (operação controlada por função do servidor que valida e marca como usado).
- O campo `role` em `profiles` **nunca** pode ser alterado pelo próprio utilizador —
  só por seeding/servidor. Não existe forma de um paciente se promover a médico.
- O limite de 6 pessoas no plano família é imposto no servidor.

> Princípio: nada de confiar no cliente para decisões de segurança ou de dinheiro.

---

## 6. Fluxo Central: Estado "Não Respondida"

Este é o coração do produto. Implementação recomendada:

1. Quando um **paciente** envia uma mensagem:
   → a `conversation.status` passa a `'unanswered'` e `last_message_at` é atualizado.
2. Quando o **médico** envia uma mensagem nessa conversa:
   → a `conversation.status` passa a `'answered'`.
3. O ecrã do médico lista as conversas de **todos** os pacientes, com as `'unanswered'`
   primeiro, com destaque visual (badge, cor de marca), e um contador total de não respondidas.

Implementar via **trigger de base de dados** (mais fiável que confiar na app):
- `AFTER INSERT ON messages`: uma função verifica o papel do `sender_id` e atualiza
  `conversations.status` em conformidade. Assim o estado está sempre correto, mesmo que
  a mensagem entre por outra via.

---

## 7. Fluxo Central: Compra no Website → Código Único → Ativação na App

Este é o fluxo de monetização. Cada passo e onde acontece:

### Passo 1 — Compra (no WEBSITE da clínica)
- O paciente escolhe plano (3/6/12 meses; individual/família) e paga.
- Cartão via **Stripe Checkout**; **MB Way/Multibanco** via gateway PT (Ifthenpay/EuPago).
- A app móvel **não** processa o pagamento (evita comissões das lojas; ver secção 9).

### Passo 2 — Webhook (no BACKEND)
- Após pagamento confirmado, o gateway envia um **webhook** assinado ao backend
  (ex.: `POST https://api.tesed.pt/webhooks/stripe`).
- O backend **verifica a assinatura** do webhook (segredo do Stripe / do gateway) para
  garantir que o pedido é legítimo. **Nunca** gerar código sem esta verificação.

### Passo 3 — Geração do código (no BACKEND)
- O backend cria uma linha em `subscription_codes` com:
  `origin='paid_website'`, `plan_type`, `duration_months`, `status='active'`,
  `stripe_session_id`, e um `code` aleatório único.
- Formato do código: `TESED-XXXX-XXXX` (letras/dígitos não ambíguos; sem 0/O, 1/I).

### Passo 4 — Entrega ao paciente
- O código é mostrado na página de sucesso E enviado por **email**.

### Passo 5 — Resgate (na APP)
- O paciente insere o código no ecrã de subscrição.
- A app chama uma **função de servidor** (Supabase Edge Function / RPC) que:
  1. verifica se o código existe e está `'active'`;
  2. marca `status='used'`, `redeemed_by`, `redeemed_at`;
  3. cria a `subscription` com `expires_at = now() + duration_months`;
  4. (família) permite adicionar membros até ao limite de **6 pessoas no total**.
- Tudo numa transação, para evitar uso duplo do mesmo código.

### Regra de ouro de segurança
> Só um webhook verificado pode criar um código pago.
> O resgate é validado e marcado como usado no servidor, nunca no cliente.

### Códigos grátis (3 meses)
- Mesmo mecanismo de resgate, mas o código é criado pelo **médico** no seu painel,
  com `origin='free_consultation'`, `duration_months=3`.

---

## 8. Ecrãs da Aplicação (mapa de navegação)

### Comuns
- Splash / arranque
- Registo (paciente)
- Login
- Recuperação de password

### Paciente
- A sua conversa com o médico (mensagens + anexar ficheiro)
- Submissão de ficheiro
- Perfil (editar dados)
- Subscrição (inserir código, ver validade, gerir família até 6)

### Médico (também admin)
- Caixa de entrada de conversas de todos os pacientes (NÃO RESPONDIDAS em destaque + contador)
- Conversa (ler, responder, ver ficheiros)
- Perfil profissional
- Gerar código grátis (3 meses)
- Gestão de códigos (listar, revogar) e métricas básicas

---

## 9. Pagamentos e Lojas — Decisão Estratégica

Para **não pagar comissão de 15–30%** das lojas, as subscrições são vendidas **fora da app**,
no website, e a app apenas ativa via código. Regras a respeitar:

- Na UE, é permitido vender fora da app e comunicar essas ofertas, MAS uma app não pode
  simultaneamente usar In-App Purchase e promover pagamento externo na mesma storefront.
  → Decisão: **a app NÃO terá compras in-app**; só o campo de resgate de código.
- O website é o único ponto de venda. Isto mantém o modelo simples e sem comissões de loja
  (só a taxa do processador de pagamento, ~1.5–2.9%).
- Confirmar as políticas atuais da App Store/Play Store antes da submissão, pois mudam.

---

## 10. Conformidade RGPD (dados de saúde)

Dados de saúde são **categoria especial** sob o RGPD. Requisitos não negociáveis:

- **Alojamento na UE** (Supabase região UE; gateways de pagamento UE).
- **Encriptação** em trânsito (HTTPS/TLS) e em repouso (Supabase fá-lo; confirmar storage).
- **Consentimento explícito** no registo, com política de privacidade clara.
- **Minimização de dados:** recolher apenas o necessário.
- O **médico/clínica** é o responsável pelo tratamento (data controller); definir um
  contrato de subcontratação com os fornecedores (Supabase, etc.).
- Direito ao apagamento: prever fluxo de eliminação de conta e dados.
- Considerar a necessidade de um **Encarregado de Proteção de Dados (DPO)**.

> Recomendação: validar com um jurista/DPO em paralelo ao desenvolvimento.
> Esta secção afeta decisões de arquitetura — não deixar para o fim.

---

## 11. Sistema de Design (Tokens) — alinhar com a marca Tesed

A implementação usa **design tokens** (variáveis) para que a identidade Tesed seja
aplicada num único sítio. Substituir os valores-exemplo pelos oficiais da marca.

```
/* PLACEHOLDERS — substituir pelos valores oficiais do Tesed */
--color-primary:      #0E7C7B;   /* cor principal da marca */
--color-primary-dark: #075E5D;
--color-accent:       #F2A541;   /* destaque (ex.: badges, CTAs) */
--color-unanswered:   #E8503A;   /* destaque de conversa NÃO respondida */
--color-bg:           #F7F9F9;
--color-surface:      #FFFFFF;
--color-text:         #14211F;
--color-text-muted:   #5C6B68;

--font-display:       /* fonte de títulos da marca */;
--font-body:          /* fonte de corpo da marca */;

--radius:             14px;
--shadow:             0 4px 16px rgba(0,0,0,0.08);
```

> AÇÃO NECESSÁRIA DO UTILIZADOR: fornecer cores hex, fontes e logótipo oficiais do Tesed.
> Sem isto, o desenvolvimento usa estes placeholders e ajusta-se depois num só ficheiro.

---

## 12. Estrutura de Pastas Sugerida (monorepo)

```
tesed/
├── app/                      # React Native + Expo (iOS + Android)
│   ├── src/
│   │   ├── screens/          # ecrãs (auth, patient, doctor, admin)
│   │   ├── components/       # componentes reutilizáveis
│   │   ├── navigation/       # navegação por papel
│   │   ├── lib/              # cliente supabase, helpers
│   │   ├── theme/            # design tokens (secção 11)
│   │   └── hooks/
│   └── app.json
├── website/                  # Next.js — venda de subscrições + webhooks
│   ├── pages/
│   │   ├── planos.tsx
│   │   └── api/
│   │       └── webhooks/     # stripe.ts, ifthenpay.ts
│   └── lib/
├── supabase/                 # migrações SQL, RLS, edge functions
│   ├── migrations/
│   └── functions/
│       └── redeem-code/      # resgate de código (servidor)
└── docs/
    └── ARQUITETURA.md        # este documento
```

---

## 13. Fases de Desenvolvimento Sugeridas

1. **Fundação:** projeto Expo + Supabase (UE) + modelo de dados + RLS + auth com papéis
   (paciente/médico) + seeding da conta de médico única.
2. **Mensagens:** conversa paciente↔médico, mensagens, trigger de estado não respondida, tempo real.
3. **Ficheiros:** submissão e leitura de anexos, **nos dois sentidos** — o paciente
   submete documentos/exames e o **médico envia ficheiros a cada paciente** (resultados
   de exames, relatórios). Via Supabase Storage, com permissões a seguir a conversa.
4. **Subscrições (resgate):** tabela de códigos + função de resgate + ecrã de subscrição.
   Começar pelos **códigos grátis** (mais simples, gerados pelo médico).
5. **Website + pagamentos:** página de planos + Stripe + gateway PT + webhook que gera códigos.
6. **Painel do médico/admin:** gestão de códigos e métricas.
7. **Notificações push:** **uma notificação por cada mensagem recebida**, nos dois
   sentidos (o paciente é avisado quando o médico responde; o médico é avisado de cada
   nova mensagem de paciente). Via Expo Notifications.
8. **Polimento de design** (aplicar tokens Tesed) + testes + submissão às lojas.

---

## 14. Decisões Já Tomadas (registo)

- **Uma única conta de médico** responde a todos os pacientes; acumula a administração.
  Não há múltiplos médicos nem auto-registo de médico.
- Pagamentos PT: **cartão + MB Way/Multibanco**.
- Distribuição: **app nativa nas lojas** (licenças Apple e Google já adquiridas).
- Venda de subscrições: **no website**, ativação por **código** na app (sem in-app purchase).
- Plano **família: até 6 pessoas** no total.
- Design: **alinhado com a marca Tesed**; por agora **placeholders** centralizados (tokens).
- **Anexos bidirecionais:** o médico também envia ficheiros a cada paciente (exames,
  relatórios), além de o paciente submeter os seus. Tratado na Fase 3.
- **Notificações por mensagem:** cada nova mensagem gera uma notificação para o
  destinatário (médico e paciente). Tratado na Fase 7.

---

## 15. Questões em Aberto (a confirmar pelo utilizador)

- Identidade visual oficial do Tesed (cores, fontes, logótipo) — por agora placeholders.
- Há limite de tamanho/tipo de ficheiros que os pacientes podem submeter?
- Preços de cada plano (3/6/12; individual/família).
- Gateway PT preferido para MB Way/Multibanco (Ifthenpay vs EuPago).

**Resolvidas:** médico único (não há múltiplos); plano família até 6 pessoas;
design avança com placeholders.
