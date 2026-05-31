# Website — Tesed (Fase 5)

Next.js. Ponto **único** de venda de subscrições e endpoints de **webhooks** que
geram os códigos pagos.

> Ainda não implementado. Será construído na **Fase 5** (ver `docs/ARQUITETURA.md`,
> secções 7 e 13). Regra de ouro: um código pago só pode ser criado por um
> **webhook verificado no servidor** — nunca no cliente.

Estrutura prevista (secção 12 da arquitetura):

```
website/
├── pages/
│   ├── planos.tsx
│   └── api/
│       └── webhooks/
│           ├── stripe.ts
│           └── ifthenpay.ts
└── lib/
```
