import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { MessageBubble } from '@/components/MessageBubble';
import { pickFiles, pickImages, takePhoto, sendAttachment, PickedFile } from '@/lib/attachments';
import { formatDateSeparator, isSameDay } from '@/lib/date';
import { Message } from '@/lib/types';
import { colors, fontSize, radius, spacing } from '@/theme';

/**
 * Linha da lista do chat: ou uma mensagem, ou um separador de dia. Tratar os
 * separadores como LINHAS PRÓPRIAS (e não desenhá-los dentro da célula da bolha)
 * garante que ficam sempre por cima da 1ª mensagem do dia — a posição de um
 * elemento dentro de uma célula de lista invertida não é fiável.
 */
type ChatRow =
  | { kind: 'sep'; key: string; date: string }
  | { kind: 'msg'; key: string; msg: Message };

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
  extraKeyboardOffset = 0,
}: {
  conversationId: string;
  lockedReason?: string | null;
  /** Altura extra acima do chat (ex.: barra de telemóvel do médico) para o
   *  cálculo do teclado no iOS. */
  extraKeyboardOffset?: number;
}) {
  const { session } = useAuth();
  const uid = session?.user.id ?? '';
  const { messages, loading, send, appendMessage } = useChat(conversationId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Lista INVERTIDA: as linhas vão do mais recente (fundo) para o mais antigo
  // (topo), para o chat ABRIR JÁ nas mensagens recentes, sem scroll de abertura.
  // Construímos primeiro em ordem cronológica, com um separador ANTES da 1ª
  // mensagem de cada dia, e só depois invertemos — assim o separador fica sempre
  // por cima do dia a que pertence (independente da orientação da célula).
  const rows = useMemo<ChatRow[]>(() => {
    const out: ChatRow[] = [];
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const prev = messages[i - 1];
      if (!prev || !isSameDay(prev.created_at, m.created_at)) {
        out.push({ kind: 'sep', key: `sep-${m.id}`, date: m.created_at });
      }
      out.push({ kind: 'msg', key: m.id, msg: m });
    }
    out.reverse();
    return out;
  }, [messages]);
  const locked = !!lockedReason;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

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

  // Envia uma lista de ficheiros/fotos: cada um vira a sua própria mensagem (em
  // sequência). A legenda escrita (se houver) acompanha o primeiro; os restantes
  // vão só com o nome. O trigger de BD trata do estado "respondida/não respondida".
  const sendFiles = async (files: PickedFile[]) => {
    if (files.length === 0) return; // utilizador cancelou
    setUploading(true);
    const caption = text.trim() || undefined;
    setText('');
    try {
      for (let i = 0; i < files.length; i++) {
        const message = await sendAttachment({
          conversationId,
          senderId: uid,
          file: files[i],
          caption: i === 0 ? caption : undefined,
        });
        appendMessage(message); // eco otimista (o Realtime faz dedupe por id)
      }
    } catch (e: any) {
      Alert.alert('Não foi possível enviar', e.message ?? 'Erro desconhecido.');
      if (caption) setText(caption); // repõe a legenda se falhar
    } finally {
      setUploading(false);
    }
  };

  // Abre um seletor (câmara / galeria / ficheiros) e envia o que devolver.
  // O menu fecha primeiro; como é um overlay (não um Modal nativo), não há
  // conflito com o seletor nativo que abre a seguir.
  const runPicker = async (picker: () => Promise<PickedFile[]>) => {
    setMenuOpen(false);
    let files: PickedFile[] = [];
    try {
      files = await picker();
    } catch (e: any) {
      // Tipicamente permissão recusada — mostra a mensagem amigável do attachments.ts.
      Alert.alert('Sem acesso', e.message ?? 'Não foi possível abrir.');
      return;
    }
    await sendFiles(files);
  };

  const openMenu = () => {
    Keyboard.dismiss();
    setMenuOpen(true);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // No Android, o nativo (softwareKeyboardLayoutMode: "pan") desliza a janela
  // para mostrar o campo — não é preciso código JS. No iOS, o KeyboardAvoidingView
  // trata disso. O padding inferior é só a safe-area (barra de navegação).
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // No iOS, o offset do cabeçalho (+ barras extra acima) é essencial para o
      // 'padding' calcular o espaço certo (senão a barra de escrita fica tapada).
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight + extraKeyboardOffset : 0}
    >
      {messages.length === 0 ? (
        // Estado vazio à parte (a lista invertida viraria o texto ao contrário).
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>Ainda não há mensagens. Escreve a primeira.</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={rows}
          inverted
          keyExtractor={(r) => r.key}
          renderItem={({ item }) =>
            item.kind === 'sep' ? (
              <View style={styles.daySepWrap}>
                <Text style={styles.daySepText}>{formatDateSeparator(item.date)}</Text>
              </View>
            ) : (
              <MessageBubble
                body={item.msg.body}
                createdAt={item.msg.created_at}
                mine={item.msg.sender_id === uid}
                attachments={item.msg.attachments}
              />
            )
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {locked ? (
        <View style={[styles.locked, { paddingBottom: spacing.md + insets.bottom }]}>
          <Text style={styles.lockedText}>{lockedReason}</Text>
        </View>
      ) : (
        <View style={[styles.composer, { paddingBottom: spacing.sm + insets.bottom }]}>
          <Pressable
            onPress={openMenu}
            disabled={uploading}
            style={[styles.attachBtn, uploading && styles.sendBtnOff]}
            accessibilityLabel="Anexar foto ou ficheiro"
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

      {/* Menu de anexos (overlay, não Modal nativo, para não colidir com o seletor). */}
      {menuOpen && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: spacing.md + insets.bottom }]}>
            <Pressable style={styles.menuItem} onPress={() => runPicker(takePhoto)}>
              <Text style={styles.menuIcon}>📷</Text>
              <Text style={styles.menuLabel}>Tirar foto</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable style={styles.menuItem} onPress={() => runPicker(pickImages)}>
              <Text style={styles.menuIcon}>🖼️</Text>
              <Text style={styles.menuLabel}>Escolher fotos</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable style={styles.menuItem} onPress={() => runPicker(pickFiles)}>
              <Text style={styles.menuIcon}>📎</Text>
              <Text style={styles.menuLabel}>Enviar ficheiro</Text>
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  list: { flex: 1 },
  listContent: { paddingVertical: spacing.md },
  empty: { textAlign: 'center', color: colors.textMuted },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  daySepWrap: { alignItems: 'center', marginVertical: spacing.sm },
  daySepText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '600',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs / 2,
    overflow: 'hidden',
  },
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
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.base,
    borderTopRightRadius: radius.base,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  menuIcon: { fontSize: fontSize.xl },
  menuLabel: { fontSize: fontSize.base, color: colors.text, fontWeight: '600' },
  menuDivider: { height: 1, backgroundColor: colors.border },
});
