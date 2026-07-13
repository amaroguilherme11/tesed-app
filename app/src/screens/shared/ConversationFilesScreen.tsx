import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useConversationFiles, FileItem } from '@/hooks/useConversationFiles';
import { openAttachment } from '@/lib/attachments';
import { useI18n } from '@/i18n';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';

/**
 * Vista de Ficheiros de uma conversa: todos os anexos trocados por ambas as
 * partes, com indicação de quem enviou. Acessível por paciente e médico.
 * Espera route.params = { conversationId }.
 */
export function ConversationFilesScreen({ route }: any) {
  const { conversationId } = route.params;
  const { session } = useAuth();
  const { t } = useI18n();
  const uid = session?.user.id ?? '';
  const { files, loading } = useConversationFiles(conversationId);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={files}
        keyExtractor={(f) => f.id}
        renderItem={({ item }) => <FileRow item={item} mine={item.message?.sender_id === uid} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>{t.files.empty}</Text>}
      />
    </View>
  );
}

function formatSize(bytes: number | null): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = d.getDate().toString().padStart(2, '0');
  const mo = (d.getMonth() + 1).toString().padStart(2, '0');
  const hh = d.getHours().toString().padStart(2, '0');
  const mi = d.getMinutes().toString().padStart(2, '0');
  return `${dd}/${mo} ${hh}:${mi}`;
}

function FileRow({ item, mine }: { item: FileItem; mine: boolean }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const open = async () => {
    setLoading(true);
    try {
      await openAttachment(item.file_path);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Pressable onPress={open} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.file_name}
        </Text>
        <Text style={styles.meta}>
          {mine ? t.files.sentByMe : t.files.received} · {formatSize(item.size_bytes)} ·{' '}
          {formatDate(item.created_at)}
        </Text>
      </View>
      {loading && <ActivityIndicator size="small" color={colors.primary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  listContent: { padding: spacing.md },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  rowPressed: { opacity: 0.85 },
  icon: { fontSize: fontSize.xl },
  info: { flex: 1 },
  name: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
});
