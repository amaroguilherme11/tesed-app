# Prompt de Arranque para o Claude Code

Cola o texto abaixo no Claude Code para iniciar o projeto. Tens o documento completo
em `ARQUITETURA.md` na mesma pasta — referencia-o.

---

## Contexto do projeto

Estou a construir a **Tesed**, uma app móvel (iOS + Android) de comunicação assíncrona
médico-paciente. A especificação completa está em `ARQUITETURA.md`. Lê esse ficheiro
primeiro e usa-o como fonte de verdade.

## Stack

- App: **React Native + Expo** (um código → iOS + Android).
- Backend/BD/Auth/Storage: **Supabase**, região **UE** (RGPD — dados de saúde).
- Website de venda + webhooks: **Next.js**.
- Pagamentos: **Stripe** (cartão) + **Ifthenpay/EuPago** (MB Way/Multibanco).
- Push: **Expo Notifications**.

## O que quero construir primeiro (Fase 1 — Fundação)

1. Inicializa o monorepo com a estrutura de pastas da secção 12 do `ARQUITETURA.md`.
2. Configura o projeto Expo e o cliente Supabase.
3. Cria as migrações SQL para o modelo de dados (secção 4): `profiles`, `conversations`,
   `messages`, `attachments`, `subscription_codes`, `subscriptions`, `family_members`.
4. Implementa autenticação com dois papéis (**paciente** e **médico**) e as regras RLS
   da secção 5. A conta de **médico é única** (criada por seeding, acumula admin) e
   responde a todos os pacientes — não há múltiplos médicos nem auto-registo de médico.
5. Cria o registo de **paciente** e o ecrã de login, e o seeding da conta de médico.

Não avances para mensagens/pagamentos até a fundação estar a funcionar e testada.

## Regras importantes a respeitar

- **Estado "não respondida"** via trigger de base de dados (secção 6), não confiar na app.
- **Códigos pagos** só podem ser criados por webhook verificado no servidor (secção 7).
  Nunca gerar códigos no cliente. O resgate é validado no servidor numa transação.
- **A app NÃO tem compras in-app** — só resgate de código (secção 9).
- **RGPD**: alojamento UE, encriptação, consentimento no registo (secção 10).
- **Design tokens** num só sítio (secção 11); ainda faltam as cores/fontes oficiais do
  Tesed, por isso usa os placeholders e mantém-nos centralizados para troca fácil.

## Como quero trabalhar

Avança fase a fase (secção 13). No fim de cada fase, mostra-me o que foi feito e como
testar antes de seguir. Explica decisões quando houver mais do que um caminho razoável.
