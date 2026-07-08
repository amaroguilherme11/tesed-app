import { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { DoctorConsultation, getDoctorPatientConsultations } from '@/lib/consultations';
import { formatAge } from '@/lib/age';
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
 * Consultas de um paciente (todos os dependentes), para o terapeuta.
 * route.params = { patientId, patientName, patientPhone? }. Abertas no topo.
 */
export function DoctorConsultationsScreen({ route, navigation }: any) {
  const { patientId, patientName, patientPhone } = route.params;
  const [items, setItems] = useState<DoctorConsultation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setItems(await getDoctorPatientConsultations(patientId));
    setLoading(false);
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: patientName ?? 'Paciente' });
  }, [navigation, patientName]);

  const open = (c: DoctorConsultation) =>
    navigation.navigate('Conversation', {
      conversationId: c.conversation_id,
      patientName: c.member_name ?? patientName,
      patientPhone,
      isOpen: c.is_open,
    });

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
        const who = item.member_name ?? patientName;
        const age = formatAge(item.member_dob);
        const unanswered = item.is_open && item.status === 'unanswered';
        return (
          <Pressable
            onPress={() => open(item)}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowMain}>
              <View style={styles.nameRow}>
                {item.has_unread && <View style={styles.unreadDot} />}
                <Text style={styles.name} numberOfLines={1}>
                  {who}
                  {age ? <Text style={styles.age}>{`  ·  ${age}`}</Text> : null}
                </Text>
              </View>
              <Text style={styles.time}>{relativeTime(item.last_message_at)}</Text>
            </View>
            <Text style={styles.sub}>Consulta de {fmtDate(item.created_at)}</Text>
            {item.is_open ? (
              unanswered ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>POR RESPONDER</Text>
                </View>
              ) : (
                <Text style={styles.answered}>Aberta · respondida</Text>
              )
            ) : (
              <Text style={styles.closed}>Fechada</Text>
            )}
          </Pressable>
        );
      }}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={<Text style={styles.empty}>Este paciente ainda não tem consultas.</Text>}
    />
  );
}

const styles = StyleSheet.create({
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
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.sm },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginRight: spacing.sm },
  name: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, flex: 1 },
  age: { fontWeight: '400', color: colors.textMuted, fontSize: fontSize.sm },
  time: { fontSize: fontSize.sm, color: colors.textMuted },
  sub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
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
  closed: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.sm, fontStyle: 'italic' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
