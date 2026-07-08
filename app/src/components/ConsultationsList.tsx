import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Consultation } from '@/lib/consultations';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';

/** Mensagem de bloqueio: sem subscrição ativa (não pode enviar/abrir). */
export const LOCK_NO_SUBSCRIPTION =
  'Precisas de uma subscrição ativa para enviar mensagens. Toca em "Gestão" para inserir um código.';
/** Mensagem de bloqueio: consulta fechada (só leitura). */
export const CONSULTA_CLOSED =
  'Esta consulta está fechada. Podes ler o histórico, mas não podes enviar mensagens.';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/**
 * Lista de consultas de um paciente/membro (abertas no topo + histórico
 * fechado). O botão "Nova consulta" só aparece se NÃO houver aberta e houver
 * subscrição ativa. Componente de apresentação — a navegação/dados ficam no ecrã.
 */
export function ConsultationsList({
  consultations,
  isActive,
  creating,
  onOpen,
  onNew,
}: {
  consultations: Consultation[];
  isActive: boolean;
  creating: boolean;
  onOpen: (c: Consultation) => void;
  onNew: () => void;
}) {
  const hasOpen = consultations.some((c) => c.is_open);

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        {hasOpen ? (
          <Text style={styles.hint}>Tens uma consulta aberta — toca nela para continuar.</Text>
        ) : isActive ? (
          <Button title="Nova consulta" onPress={onNew} loading={creating} />
        ) : (
          <Text style={styles.hint}>
            Precisas de uma subscrição ativa para abrir uma consulta. Toca em "Gestão".
          </Text>
        )}
      </View>

      <FlatList
        data={consultations}
        keyExtractor={(c) => c.conversation_id}
        renderItem={({ item }) => {
          const unread = item.is_open && item.has_unread;
          return (
            <Pressable
              onPress={() => onOpen(item)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              {unread && <View style={styles.unreadDot} />}
              <View style={styles.flex}>
                <Text style={styles.title}>Consulta de {fmtDate(item.created_at)}</Text>
                <Text style={[styles.meta, item.is_open ? styles.metaOpen : styles.metaClosed]}>
                  {item.is_open
                    ? unread
                      ? 'Aberta · nova resposta do terapeuta'
                      : 'Aberta'
                    : 'Fechada · só leitura'}
                </Text>
              </View>
            </Pressable>
          );
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Ainda não tens consultas.{isActive ? ' Abre a primeira com "Nova consulta".' : ''}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  top: { padding: spacing.md },
  hint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: { padding: spacing.md, paddingTop: 0 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  rowPressed: { opacity: 0.85 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.unanswered,
    marginRight: spacing.sm,
  },
  title: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  meta: { fontSize: fontSize.sm, marginTop: 2 },
  metaOpen: { color: colors.primary, fontWeight: '600' },
  metaClosed: { color: colors.textMuted },
});
