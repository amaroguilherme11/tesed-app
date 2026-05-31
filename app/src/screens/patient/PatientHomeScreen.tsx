import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateMyConversation } from '@/lib/conversations';
import { getMySubscription } from '@/lib/subscriptions';
import { getMyMemberProfiles, removeMemberProfile } from '@/lib/family';
import { confirmAction } from '@/lib/confirm';
import { formatAge } from '@/lib/age';
import { ChatView } from '@/components/ChatView';
import { HeaderFilesButton } from '@/components/HeaderFilesButton';
import { HeaderTextButton } from '@/components/HeaderTextButton';
import { HeaderSignOutButton } from '@/components/HeaderSignOutButton';
import { MemberProfile, MySubscription } from '@/lib/types';
import { colors, spacing, fontSize, radius, shadow } from '@/theme';

const LOCK_MESSAGE =
  'Precisas de uma subscrição ativa para enviar mensagens e ficheiros. Toca em 🎟️ para inserir um código.';
const FAMILY_MAX = 6;

type ChatItem = {
  conversationId: string;
  label: string;
  dob: string | null;
  isPersonal: boolean;
  memberId?: string;
};

export function PatientHomeScreen({ navigation }: any) {
  const { session, profile } = useAuth();
  const [personalConvId, setPersonalConvId] = useState<string | null>(null);
  const [sub, setSub] = useState<MySubscription | null>(null);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session) return;
    try {
      const conv = await getOrCreateMyConversation(session.user.id);
      setPersonalConvId(conv.id);
      const s = await getMySubscription();
      setSub(s);
      if (s?.plan_type === 'family') {
        setMembers(await getMyMemberProfiles());
      } else {
        setMembers([]);
      }
    } catch (e: any) {
      setError(e.message ?? 'Erro a abrir a conversa.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const isActive = !!sub && sub.is_active;
  const isFamily = sub?.plan_type === 'family';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRow}>
          <HeaderTextButton label="🎟️" onPress={() => navigation.navigate('Subscription')} />
          {!isFamily && personalConvId && (
            <HeaderFilesButton
              onPress={() =>
                navigation.navigate('PatientFiles', {
                  conversationId: personalConvId,
                  title: 'Os meus ficheiros',
                })
              }
            />
          )}
          <HeaderSignOutButton />
        </View>
      ),
    });
  }, [navigation, personalConvId, isFamily]);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (loading || !personalConvId) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ---- Plano família ativo: lista de chats (Eu + dependentes) ----
  if (isFamily && isActive) {
    const chats: ChatItem[] = [
      {
        conversationId: personalConvId,
        label: profile?.full_name || 'Eu',
        dob: profile?.date_of_birth ?? null,
        isPersonal: true,
      },
      ...members
        .filter((m) => m.conversation_id)
        .map((m) => ({
          conversationId: m.conversation_id as string,
          label: m.full_name,
          dob: m.date_of_birth,
          isPersonal: false,
          memberId: m.id,
        })),
    ];
    const total = chats.length; // titular + dependentes
    const canAdd = total < FAMILY_MAX;

    const openChat = (c: ChatItem) =>
      navigation.navigate('PatientChat', {
        conversationId: c.conversationId,
        title: c.isPersonal ? `${c.label} (eu)` : c.label,
        lockedReason: null,
      });

    const onRemove = (c: ChatItem) => {
      if (!c.memberId) return;
      confirmAction({
        title: 'Remover membro',
        message: `Remover ${c.label} e o seu chat? Esta ação não pode ser anulada.`,
        confirmLabel: 'Remover',
        destructive: true,
        onConfirm: async () => {
          try {
            await removeMemberProfile(c.memberId!);
            await reload();
          } catch (e: any) {
            setError(e.message ?? 'Não foi possível remover.');
          }
        },
      });
    };

    return (
      <View style={styles.container}>
        <Text style={styles.familyTitle}>Família ({total}/{FAMILY_MAX})</Text>
        <Text style={styles.familyHint}>Escolhe de quem é o caso para falar com o médico.</Text>
        <FlatList
          data={chats}
          keyExtractor={(c) => c.conversationId}
          renderItem={({ item }) => {
            const age = formatAge(item.dob);
            return (
              <Pressable
                onPress={() => openChat(item)}
                style={({ pressed }) => [styles.chatRow, pressed && styles.rowPressed]}
              >
                <View style={styles.flex}>
                  <Text style={styles.chatName}>
                    {item.label}
                    {item.isPersonal ? <Text style={styles.tag}>  (eu)</Text> : null}
                    {age ? <Text style={styles.age}>{`  ·  ${age}`}</Text> : null}
                  </Text>
                </View>
                {!item.isPersonal && (
                  <Pressable onPress={() => onRemove(item)} hitSlop={8}>
                    <Text style={styles.remove}>Remover</Text>
                  </Pressable>
                )}
              </Pressable>
            );
          }}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            canAdd ? (
              <Pressable
                onPress={() => navigation.navigate('AddMember')}
                style={({ pressed }) => [styles.addRow, pressed && styles.rowPressed]}
              >
                <Text style={styles.addText}>＋ Adicionar membro</Text>
              </Pressable>
            ) : (
              <Text style={styles.familyHint}>Limite de {FAMILY_MAX} pessoas atingido.</Text>
            )
          }
        />
      </View>
    );
  }

  // ---- Plano individual (ou sem subscrição): chat pessoal direto ----
  return (
    <ChatView conversationId={personalConvId} lockedReason={isActive ? null : LOCK_MESSAGE} />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.lg },
  error: { color: colors.danger, fontSize: fontSize.base, textAlign: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  familyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginTop: spacing.md, marginHorizontal: spacing.md },
  familyHint: { fontSize: fontSize.sm, color: colors.textMuted, marginHorizontal: spacing.md, marginTop: spacing.xs, marginBottom: spacing.sm },
  listContent: { padding: spacing.md, paddingTop: 0 },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  rowPressed: { opacity: 0.85 },
  chatName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  tag: { fontWeight: '400', color: colors.primary, fontSize: fontSize.sm },
  age: { fontWeight: '400', color: colors.textMuted, fontSize: fontSize.sm },
  remove: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '600' },
  addRow: {
    borderRadius: radius.base,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    padding: spacing.md,
    alignItems: 'center',
  },
  addText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.base },
});
