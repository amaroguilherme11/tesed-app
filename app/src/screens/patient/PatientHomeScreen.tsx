import { useCallback, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { getMySubscription } from '@/lib/subscriptions';
import { getMyMemberProfiles, removeMemberProfile } from '@/lib/family';
import {
  Consultation,
  createConsultation,
  getMyConsultations,
} from '@/lib/consultations';
import {
  ConsultationsList,
  LOCK_NO_SUBSCRIPTION,
  CONSULTA_CLOSED,
} from '@/components/ConsultationsList';
import { markConversationRead } from '@/lib/patientChats';
import { confirmAction } from '@/lib/confirm';
import { formatAge } from '@/lib/age';
import { HeaderTextButton } from '@/components/HeaderTextButton';
import { HeaderSignOutButton } from '@/components/HeaderSignOutButton';
import { MemberProfile, MySubscription } from '@/lib/types';
import { colors, spacing, fontSize, radius, shadow } from '@/theme';

const FAMILY_MAX = 6;

type MemberRow = {
  memberId: string | null; // null = titular
  label: string;
  dob: string | null;
  isPersonal: boolean;
};

export function PatientHomeScreen({ navigation }: any) {
  const { session, profile } = useAuth();
  const [sub, setSub] = useState<MySubscription | null>(null);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!session) return;
    try {
      const [s, cons] = await Promise.all([getMySubscription(), getMyConsultations()]);
      setSub(s);
      setConsultations(cons);
      setMembers(s?.plan_type === 'family' ? await getMyMemberProfiles() : []);
    } catch (e: any) {
      setError(e.message ?? 'Erro a carregar as consultas.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const isActive = !!sub && sub.is_active;
  const isFamily = sub?.plan_type === 'family';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRow}>
          <HeaderTextButton label="Gestão" onPress={() => navigation.navigate('Subscription')} />
          <HeaderSignOutButton />
        </View>
      ),
    });
  }, [navigation]);

  // Abre uma consulta (do titular, no plano individual) no chat.
  const openMine = (c: Consultation) => {
    if (c.is_open) markConversationRead(c.conversation_id);
    navigation.navigate('PatientChat', {
      conversationId: c.conversation_id,
      title: 'A minha consulta',
      lockedReason: c.is_open ? (isActive ? null : LOCK_NO_SUBSCRIPTION) : CONSULTA_CLOSED,
    });
  };

  const newMine = async () => {
    setCreating(true);
    try {
      const id = await createConsultation(null);
      await reload();
      navigation.navigate('PatientChat', {
        conversationId: id,
        title: 'A minha consulta',
        lockedReason: null,
      });
    } catch (e: any) {
      Alert.alert('Não foi possível abrir', e.message ?? 'Erro desconhecido.');
    } finally {
      setCreating(false);
    }
  };

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ---- PLANO FAMÍLIA: seletor de membros → consultas de cada um ----
  if (isFamily) {
    const rows: MemberRow[] = [
      {
        memberId: null,
        label: profile?.full_name || 'Eu',
        dob: profile?.date_of_birth ?? null,
        isPersonal: true,
      },
      ...members.map((m) => ({
        memberId: m.id,
        label: m.full_name,
        dob: m.date_of_birth,
        isPersonal: false,
      })),
    ];
    const total = rows.length;
    const canAdd = total < FAMILY_MAX;

    const hasUnread = (memberId: string | null) =>
      consultations.some((c) => c.member_id === memberId && c.is_open && c.has_unread);

    const openMember = (r: MemberRow) =>
      navigation.navigate('Consultations', {
        memberId: r.memberId,
        title: r.isPersonal ? `${r.label} (eu)` : r.label,
      });

    const onRemove = (r: MemberRow) => {
      if (!r.memberId) return;
      confirmAction({
        title: 'Remover membro',
        message: `Remover ${r.label} e as suas consultas? Esta ação não pode ser anulada.`,
        confirmLabel: 'Remover',
        destructive: true,
        onConfirm: async () => {
          try {
            await removeMemberProfile(r.memberId!);
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
        <Text style={styles.familyHint}>Escolhe de quem são as consultas.</Text>
        <FlatList
          data={rows}
          keyExtractor={(r) => r.memberId ?? 'self'}
          renderItem={({ item }) => {
            const age = formatAge(item.dob);
            const unread = hasUnread(item.memberId);
            return (
              <Pressable
                onPress={() => openMember(item)}
                style={({ pressed }) => [styles.chatRow, pressed && styles.rowPressed]}
              >
                {unread && <View style={styles.unreadDot} />}
                <View style={styles.flex}>
                  <Text style={styles.chatName}>
                    {item.label}
                    {item.isPersonal ? <Text style={styles.tag}>  (eu)</Text> : null}
                    {age ? <Text style={styles.age}>{`  ·  ${age}`}</Text> : null}
                  </Text>
                  {unread && <Text style={styles.unreadText}>Nova resposta do terapeuta</Text>}
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

  // ---- PLANO INDIVIDUAL (ou sem subscrição): consultas do titular ----
  const mine = consultations.filter((c) => c.member_id === null);
  return (
    <ConsultationsList
      consultations={mine}
      isActive={isActive}
      creating={creating}
      onOpen={openMine}
      onNew={newMine}
    />
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
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.unanswered, marginRight: spacing.sm },
  unreadText: { fontSize: fontSize.sm, color: colors.unanswered, fontWeight: '600', marginTop: 2 },
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
