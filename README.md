# Tesed

App móvel (iOS + Android) de comunicação **assíncrona médico–paciente**.
Cada conversa tem um estado claro — **respondida / não respondida** — para que
nenhum paciente fique sem resposta.

> Especificação completa e fonte de verdade: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).
> Contexto e regras de trabalho: [`CLAUDE.md`](CLAUDE.md).

## Estrutura (monorepo)

```
tesed/
├── app/        # React Native + Expo (iOS + Android)
├── website/    # Next.js — venda de subscrições + webhooks (Fase 5)
├── supabase/   # migrações SQL, RLS, triggers, edge functions
└── docs/       # arquitetura e prompts
```

## Estado

**Fase 1 — Fundação** (concluída): monorepo, modelo de dados, RLS, trigger de
estado "não respondida", seeding do médico único, design tokens, auth com dois papéis.

Próximas fases em `docs/ARQUITETURA.md`, secção 13.

## Como arrancar (resumo)

Ver `app/README.md` e `supabase/README.md` para instruções detalhadas e como testar.
