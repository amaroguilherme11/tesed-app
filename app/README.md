# Tesed — App móvel (Expo)

React Native + Expo (iOS + Android), TypeScript.

## Configurar

1. Instalar dependências (a partir da raiz do monorepo ou desta pasta):
   ```bash
   npm install
   ```
2. Alinhar versões nativas com o SDK do Expo (recomendado):
   ```bash
   npx expo install --fix
   ```
3. Variáveis de ambiente:
   ```bash
   cp .env.example .env
   # preencher EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY
   ```

## Arrancar

```bash
npm run start        # Expo dev server (QR code para Expo Go)
npm run ios          # simulador iOS (macOS)
npm run android      # emulador/dispositivo Android
npm run typecheck    # verificação de tipos
```

## O que existe na Fase 1

- `src/theme/` — **design tokens** centralizados (cores/fontes/medidas). Único sítio
  a editar quando a marca Tesed estiver definida.
- `src/lib/supabase.ts` — cliente Supabase (chave anon).
- `src/contexts/AuthContext.tsx` — sessão + perfil + papel; registo de paciente com
  **consentimento RGPD**; login; recuperação de password.
- `src/navigation/RootNavigator.tsx` — navegação **por papel**: paciente vs médico.
- Ecrãs de auth e ecrãs iniciais de paciente/médico (placeholders).

## O que existe na Fase 2

- `src/hooks/useChat.ts` — mensagens de uma conversa + subscrição **Realtime**.
- `src/hooks/useConversations.ts` — caixa de entrada do médico (NÃO RESPONDIDAS
  primeiro + contador), atualizada em tempo real.
- `src/components/ChatView.tsx` / `MessageBubble.tsx` — UI de conversa partilhada.
- `src/lib/conversations.ts` — cria/abre a conversa do paciente.
- Navegação por papel: `PatientNavigator` (chat) e `DoctorNavigator` (inbox → conversa).

## Como testar (Fase 2)

Com dois dispositivos/sessões (um paciente, o médico):
1. Paciente abre a app → entra direto na conversa com o médico.
2. Paciente envia mensagem → aparece **instantaneamente** no médico (Realtime) e a
   conversa fica **NÃO RESPONDIDA** (badge + contador na caixa do médico).
3. Médico abre a conversa e responde → passa a **Respondida** e a resposta aparece
   no paciente em tempo real.
4. Confirma que o contador de não respondidas sobe/desce sozinho.

## O que existe na Fase 3 (Ficheiros)

- `src/lib/attachments.ts` — escolher ficheiro, upload (web + telemóvel), criar
  mensagem + linha `attachments`, e `openAttachment` (URL assinado temporário).
- `src/hooks/useChat.ts` — Realtime de mensagens **e** anexos (junta o anexo à bolha).
- `src/hooks/useConversationFiles.ts` + `src/screens/shared/ConversationFilesScreen.tsx`
  — vista **📎 Ficheiros** com todos os anexos trocados (paciente e médico).
- Botão 📎 no compositor (ambos os papéis) e no cabeçalho (vista de ficheiros).
- Backend: `supabase/migrations/0006_storage_attachments.sql` (bucket privado + RLS).

## Como testar (Fase 3)

1. Paciente e médico enviam ficheiros pelo 📎 → aparecem como anexo clicável nos dois
   lados, em tempo real, e abrem ao tocar (também para quem enviou).
2. Botão **📎 Ficheiros** no topo → lista todos os ficheiros trocados, com quem enviou.

## Como testar (Fase 1)

1. `npm run typecheck` passa.
2. Com o Supabase configurado e migrações aplicadas:
   - **Registar** um paciente (exige aceitar o consentimento) → confirmar email.
   - **Entrar** → vê o ecrã de paciente.
   - **Médico**: depois de convidado e com password definida, ao entrar vê a
     caixa "Conversas" (médico), não o ecrã de paciente — confirma o routing por papel.
3. O chat real e o estado "não respondida" na UI chegam na **Fase 2**.
