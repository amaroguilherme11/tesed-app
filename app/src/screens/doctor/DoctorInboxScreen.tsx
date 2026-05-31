import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useConversations } from '@/hooks/useConversations';
import { InboxGroup } from '@/lib/types';
import { formatAge } from '@/lib/age';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${d.getDate()}/${d.getMonth() + 1} ${hh}:${mm}`;
}

function GroupRow({ group, onOpen }: { group: InboxGroup; onOpen: () => void }) {
  // Família: mostra "Família: nome" + nº de chats e não respondidas.
  if (group.isFamily) {
    return (
      <Pressable onPress={onOpen} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
        <View style={styles.rowMain}>
          <Text style={styles.name} numberOfLines={1}>
            👪 Família: {group.ownerName}
          </Text>
          <Text style={styles.time}>{relativeTime(group.lastMessageAt)}</Text>
        </View>
        <Text style={styles.sub}>
          {group.chats.length} {group.chats.length === 1 ? 'chat' : 'chats'}
        </Text>
        {group.unansweredCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {group.unansweredCount} POR RESPONDER
            </Text>
          </View>
        ) : (
          <Text style={styles.answered}>Tudo respondido</Text>
        )}
      </Pressable>
    );
  }

  // Individual: o grupo tem 1 chat (a conversa pessoal).
  const chat = group.chats[0];
  const age = formatAge(group.ownerDob);
  const unanswered = chat?.status === 'unanswered';
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.rowMain}>
        <Text style={styles.name} numberOfLines={1}>
          {group.ownerName}
          {age ? <Text style={styles.age}>{`  ·  ${age}`}</Text> : null}
        </Text>
        <Text style={styles.time}>{relativeTime(group.lastMessageAt)}</Text>
      </View>
      {unanswered ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>NÃO RESPONDIDA</Text>
        </View>
      ) : (
        <Text style={styles.answered}>Respondida</Text>
      )}
    </Pressable>
  );
}

export function DoctorInboxScreen({ navigation }: any) {
  const { groups, loading, unansweredCount } = useConversations();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const openGroup = (group: InboxGroup) => {
    if (group.isFamily) {
      navigation.navigate('FamilyChats', { ownerName: group.ownerName, ownerId: group.ownerId });
    } else {
      const chat = group.chats[0];
      navigation.navigate('Conversation', {
        conversationId: chat.conversationId,
        patientName: group.ownerName,
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.counter}>{unansweredCount}</Text>
        <Text style={styles.counterLabel}>
          {unansweredCount === 1 ? 'conversa por responder' : 'conversas por responder'}
        </Text>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(g) => g.ownerId}
        renderItem={({ item }) => <GroupRow group={item} onOpen={() => openGroup(item)} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>Ainda não há conversas.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, padding: spacing.lg },
  counter: { fontSize: fontSize.xl, fontWeight: '800', color: colors.unanswered },
  counterLabel: { fontSize: fontSize.base, color: colors.textMuted },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  rowPressed: { opacity: 0.85 },
  rowMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  age: { fontWeight: '400', color: colors.textMuted, fontSize: fontSize.sm },
  sub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  time: { fontSize: fontSize.sm, color: colors.textMuted },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.unanswered,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.sm,
  },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  answered: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.sm },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
