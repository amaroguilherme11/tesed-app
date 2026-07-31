import { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  DoctorConsultation,
  doctorCreateConsultation,
  getDoctorPatientConsultations,
} from '@/lib/consultations';
import { Button } from '@/components/Button';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${d.getDate()}/${d.getMonth() + 1} ${hh}:${mm}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/**
 * Consultas de um paciente (individual) OU de UM membro da família (drill-down).
 * route.params = { patientId, patientName, patientPhone?, memberId?, filterMember?, title? }
 * - filterMember=true (família): mostra só as consultas de `memberId` (null = titular).
 * - sem filterMember (individual): mostra todas (que são só do titular).
 */
export function DoctorConsultationsScreen({ route, navigation }: any) {
  const { patientId, patientName, patientPhone, memberId, filterMember, title } = route.params;
  const [items, setItems] = useState<DoctorConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    let list = await getDoctorPatientConsultations(patientId);
    if (filterMember) {
      list = list.filter((c) => (c.member_id ?? null) === (memberId ?? null));
    }
    setItems(list);
    setLoading(false);
  }, [patientId, memberId, filterMember]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: title ?? patientName ?? 'Paciente' });
  }, [navigation, title, patientName]);

  const open = (c: DoctorConsultation) =>
    navigation.navigate('Conversation', {
      conversationId: c.conversation_id,
      patientName: c.member_name ?? patientName,
      patientPhone,
      isOpen: c.is_open,
      status: c.status,
      isStandby: c.is_standby,
    });

  // Só pode existir UMA consulta aberta por (paciente, membro): o botão de abrir
  // só aparece quando não há nenhuma aberta na vista atual.
  const hasOpen = items.some((c) => c.is_open);

  const onNew = async () => {
    setCreating(true);
    try {
      const conv = await doctorCreateConsultation(patientId, memberId ?? null);
      await load();
      navigation.navigate('Conversation', {
        conversationId: conv.id,
        patientName: title ?? patientName,
        patientPhone,
        isOpen: true,
        status: conv.status,
        isStandby: false,
      });
    } catch (e: any) {
      Alert.alert('Não foi possível abrir', e.message ?? 'Erro desconhecido.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(c) => c.conversation_id}
      renderItem={({ item }) => {
        const unanswered = item.is_open && item.status === 'unanswered' && !item.is_standby;
        return (
          <Pressable
            onPress={() => open(item)}
            style={({ pressed }) => [
              styles.row,
              !item.is_open && styles.rowClosed,
              pressed && styles.rowPressed,
            ]}
          >
            <View style={styles.rowMain}>
              <View style={styles.nameRow}>
                {item.has_unread && <View style={styles.unreadDot} />}
                <Text style={styles.date}>Consulta de {fmtDate(item.created_at)}</Text>
              </View>
              <Text style={styles.time}>{relativeTime(item.last_message_at)}</Text>
            </View>
            {!item.is_open ? (
              <Text style={styles.closed}>Fechada</Text>
            ) : item.is_standby ? (
              <View style={[styles.badge, styles.badgeStandby]}>
                <Text style={styles.badgeText}>EM STANDBY</Text>
              </View>
            ) : unanswered ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>POR RESPONDER</Text>
              </View>
            ) : (
              <Text style={styles.answered}>Aberta · respondida</Text>
            )}
          </Pressable>
        );
      }}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        !hasOpen ? (
          <View style={styles.newWrap}>
            <Button title="Nova consulta" onPress={onNew} loading={creating} />
          </View>
        ) : null
      }
      ListEmptyComponent={<Text style={styles.empty}>Sem consultas.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  listContent: { padding: spacing.md },
  newWrap: { marginBottom: spacing.md },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  rowClosed: { opacity: 0.5 },
  rowPressed: { opacity: 0.85 },
  rowMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.sm },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginRight: spacing.sm },
  date: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, flex: 1 },
  time: { fontSize: fontSize.sm, color: colors.textMuted },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.unanswered,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.sm,
  },
  badgeStandby: { backgroundColor: colors.standby },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  answered: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.sm },
  closed: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.sm, fontStyle: 'italic' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
