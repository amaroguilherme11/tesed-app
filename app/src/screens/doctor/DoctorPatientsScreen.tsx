import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { DoctorPatientOverview, getDoctorPatients } from '@/lib/consultations';
import { formatAge } from '@/lib/age';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';

/** Home do terapeuta: lista de pacientes, com por-responder em destaque no topo. */
export function DoctorPatientsScreen({ navigation }: any) {
  const [patients, setPatients] = useState<DoctorPatientOverview[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setPatients(await getDoctorPatients());
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const needCount = patients.filter((p) => p.needs_response).length;

  const open = (p: DoctorPatientOverview) =>
    navigation.navigate('DoctorConsultations', {
      patientId: p.patient_id,
      patientName: p.full_name ?? 'Paciente',
      patientPhone: p.phone,
    });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.counter}>{needCount}</Text>
        <Text style={styles.counterLabel}>
          {needCount === 1 ? 'paciente por responder' : 'pacientes por responder'}
        </Text>
      </View>

      <FlatList
        data={patients}
        keyExtractor={(p) => p.patient_id}
        renderItem={({ item }) => {
          const age = formatAge(item.date_of_birth);
          return (
            <Pressable
              onPress={() => open(item)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.rowMain}>
                <View style={styles.nameRow}>
                  {item.has_unread && <View style={styles.unreadDot} />}
                  <Text style={styles.name} numberOfLines={1}>
                    {item.full_name || 'Paciente'}
                    {age ? <Text style={styles.age}>{`  ·  ${age}`}</Text> : null}
                  </Text>
                </View>
              </View>
              <Text style={styles.sub}>
                {item.plan_type === 'family' ? 'Família' : 'Individual'}
                {item.open_count > 0
                  ? ` · ${item.open_count} ${item.open_count === 1 ? 'consulta aberta' : 'consultas abertas'}`
                  : ' · sem consultas abertas'}
                {item.sub_active ? '' : ' · subscrição inativa'}
              </Text>
              {item.needs_response ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>POR RESPONDER</Text>
                </View>
              ) : null}
            </Pressable>
          );
        }}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>Ainda não há pacientes com subscrição.</Text>
        }
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
  nameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginRight: spacing.sm },
  name: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, flex: 1 },
  age: { fontWeight: '400', color: colors.textMuted, fontSize: fontSize.sm },
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
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
