import { useLayoutEffect } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useConversations } from '@/hooks/useConversations';
import { InboxChat } from '@/lib/types';
import { formatAge } from '@/lib/age';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';

/**
 * Chats de uma família (lado do médico): lista o titular e cada dependente em
 * conversas separadas, para o médico tratar cada caso individualmente.
 * route.params = { ownerId, ownerName }
 */
export function DoctorFamilyChatsScreen({ route, navigation }: any) {
  const { ownerId, ownerName, ownerPhone } = route.params;
  const { groups, loading } = useConversations();
  const group = groups.find((g) => g.ownerId === ownerId);

  useLayoutEffect(() => {
    navigation.setOptions({ title: `Família: ${ownerName ?? ''}`.trim() });
  }, [navigation, ownerName]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const chats = group?.chats ?? [];

  const open = (chat: InboxChat) => {
    navigation.navigate('Conversation', {
      conversationId: chat.conversationId,
      patientName: chat.isPersonal ? `${ownerName} (titular)` : chat.label,
      // O telemóvel é do TITULAR (dependentes não têm número próprio).
      patientPhone: ownerPhone,
    });
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(c) => c.conversationId}
        renderItem={({ item }) => {
          const age = formatAge(item.dob);
          const unanswered = item.status === 'unanswered';
          return (
            <Pressable onPress={() => open(item)} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
              <View style={styles.rowMain}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.label}
                  {item.isPersonal ? <Text style={styles.tag}>  (titular)</Text> : null}
                  {age ? <Text style={styles.age}>{`  ·  ${age}`}</Text> : null}
                </Text>
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
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>Sem chats nesta família.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  listContent: { padding: spacing.md },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  rowPressed: { opacity: 0.85 },
  rowMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, flex: 1 },
  tag: { fontWeight: '400', color: colors.primary, fontSize: fontSize.sm },
  age: { fontWeight: '400', color: colors.textMuted, fontSize: fontSize.sm },
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
