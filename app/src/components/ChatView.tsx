import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { MessageBubble } from '@/components/MessageBubble';
import { pickFile, sendAttachment } from '@/lib/attachments';
import { colors, fontSize, radius, spacing } from '@/theme';

/**
 * Vista de conversa partilhada por paciente e médico.
 * Recebe o id da conversa; alinha as mensagens próprias à direita.
 * Inclui envio de anexos (bidirecional — Fase 3).
 *
 * `lockedReason`: se definido, o envio fica bloqueado e mostra-se um aviso em vez
 * do compositor (ex.: paciente sem subscrição ativa — Fase 4). O servidor (RLS)
 * é a verdadeira barreira; isto é apenas a experiência na app.
 */
export function ChatView({
  conversationId,
  lockedReason,
}: {
  conversationId: string;
  lockedReason?: string | null;
}) {
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const { messages, loading, send, appendMessage } = useChat(conversationId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const locked = !!lockedReason;
  const insets = useSafeAreaInsets();
  // Altura do teclado, gerida manualmente (mais fiável que KeyboardAvoidingView
  // no Android edge-to-edge do SDK 54). Empurramos o compositor para cima por
  // este valor quando o teclado está visível.
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => {
      // No Android, a safe-area inferior já está "dentro" da altura do teclado,
      // por isso descontamo-la para não duplicar o espaço.
      const h = e.endCoordinates?.height ?? 0;
      setKeyboardHeight(Math.max(0, h - (Platform.OS === 'android' ? insets.bottom : 0)));
      // Mantém a última mensagem visível.
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom]);

  const onSend = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    setSending(true);
    try {
      await send(body, uid);
    } catch {
      setText(body); // repõe o texto se falhar
    } finally {
      setSending(false);
    }
  };

  const onAttach = async () => {
    try {
      const file = await pickFile();
      if (!file) return; // utilizador cancelou
      setUploading(true);
      const message = await sendAttachment({
        conversationId,
        senderId: uid,
        file,
        // Se houver texto escrito, vai como legenda do anexo.
        caption: text.trim() || undefined,
      });
      setText('');
      appendMessage(message); // eco otimista (o Realtime faz dedupe por id)
    } catch (e: any) {
      Alert.alert('Não foi possível enviar o ficheiro', e.message ?? 'Erro desconhecido.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Espaço inferior do compositor: safe-area quando o teclado está fechado;
  // quando aberto, a altura do teclado (empurra a barra para cima dele).
  const composerBottom = keyboardHeight > 0 ? keyboardHeight : insets.bottom;

  return (
    <View style={styles.flex}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <MessageBubble
            body={item.body}
            createdAt={item.created_at}
            mine={item.sender_id === uid}
            attachments={item.attachments}
          />
        )}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <Text style={styles.empty}>Ainda não há mensagens. Escreve a primeira.</Text>
        }
      />

      {locked ? (
        <View style={[styles.locked, { paddingBottom: spacing.md + composerBottom }]}>
          <Text style={styles.lockedText}>{lockedReason}</Text>
        </View>
      ) : (
        <View style={[styles.composer, { paddingBottom: spacing.sm + composerBottom }]}>
          <Pressable
            onPress={onAttach}
            disabled={uploading}
            style={[styles.attachBtn, uploading && styles.sendBtnOff]}
            accessibilityLabel="Anexar ficheiro"
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.attachIcon}>＋</Text>
            )}
          </Pressable>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Escrever mensagem…"
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <Pressable
            onPress={onSend}
            disabled={sending || !text.trim()}
            style={[styles.sendBtn, (sending || !text.trim()) && styles.sendBtnOff]}
          >
            <Text style={styles.sendText}>Enviar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  listContent: { paddingVertical: spacing.md, flexGrow: 1 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachBtn: {
    height: 44,
    width: 44,
    borderRadius: radius.base,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIcon: { fontSize: fontSize.lg },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.base,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    fontSize: fontSize.base,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  sendBtn: {
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.base,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { opacity: 0.5 },
  sendText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
  locked: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  lockedText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
