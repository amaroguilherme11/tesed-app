# Supabase — Tesed

Backend, base de dados, auth, storage e realtime. **Região UE** (RGPD).

## Conteúdo

```
supabase/
├── config.toml                # config local do Supabase CLI
├── migrations/
│   ├── 0001_initial_schema.sql      # modelo de dados (secção 4)
│   ├── 0002_functions_and_triggers.sql  # triggers: novo utilizador, role, estado, doctor_id
│   ├── 0003_rls_policies.sql        # Row Level Security (secção 5)
│   ├── 0004_seed_config.sql         # email do médico único
│   ├── 0005_realtime.sql            # Realtime de mensagens/conversas (Fase 2)
│   ├── 0006_storage_attachments.sql # Bucket privado + RLS de anexos (Fase 3)
│   ├── 0007_subscriptions_rpc.sql   # Funções de códigos/resgate/família (Fase 4)
│   ├── 0008_redeem_cumulative.sql   # Resgate cumulativo (3+3=6 meses) (Fase 4)
│   ├── 0009_require_active_subscription.sql # Subscrição ativa p/ enviar (Fase 4)
│   ├── 0010_admin_metrics.sql       # Métricas do painel do médico (Fase 6)
│   ├── 0011_dob_and_doctor_inbox.sql # Data de nascimento + idade/titular na inbox
│   ├── 0012_family_member_profiles.sql # Perfis de dependentes (família sem email)
│   └── 0013_member_dob_required.sql  # Data de nascimento obrigatória nos membros
├── functions/                 # edge functions (webhooks pagos -> Fase 5)
└── scripts/
    ├── seed-doctor.mjs        # convite do médico (sem definir password)
    └── create-test-user.mjs   # cria paciente de TESTE confirmado (testar família)
```

## Aplicar as migrações

### Opção A — Supabase CLI (local/produção)
```bash
# (uma vez) instalar a CLI: https://supabase.com/docs/guides/cli
supabase start           # ambiente local (Docker)
supabase db reset        # aplica todas as migrações de migrations/
```

Para um projeto remoto (UE):
```bash
supabase link --project-ref <ref-do-projeto-UE>
supabase db push
```

### Opção B — manual
Cola o conteúdo de cada ficheiro `migrations/*.sql`, por ordem, no SQL Editor do
painel Supabase.

## Seeding do médico único

1. Confirma o email do médico em `0004_seed_config.sql` (ou atualiza `app_config`).
2. Define variáveis de ambiente (nunca commitar):
   ```
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   DOCTOR_EMAIL=medico@exemplo.tesed.pt
   ```
3. Executa:
   ```bash
   node supabase/scripts/seed-doctor.mjs
   ```
4. O médico recebe um email de convite e **define a própria password**.
   O `role='doctor'` é atribuído automaticamente pelo trigger `handle_new_user`.

> Nunca definimos passwords nem criamos contas por terceiros. O índice único
> `profiles_single_doctor_idx` garante que existe **no máximo um** médico.

## Como testar (Fase 1)

1. **Schema + RLS**: `supabase db reset` corre sem erros.
2. **Médico único**: tentar criar um segundo perfil com `role='doctor'` falha
   (índice único).
3. **Trigger de estado** (coração do produto):
   - Cria um paciente (registo na app) → cria conversa → envia mensagem do paciente
     → `conversations.status` fica `unanswered`.
   - O médico responde → fica `answered`.
4. **role imutável**: como paciente, `update profiles set role='doctor'` é recusado.
5. **RLS**: um paciente não consegue ler conversas/mensagens de outro paciente.
