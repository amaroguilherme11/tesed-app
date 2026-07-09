import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
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

type Section = { title: string; dob: string | null; data: DoctorConsultation[] };

/**
 * Consultas de um paciente para o terapeuta, AGRUPADAS por membro (titular
 * primeiro), abertas no topo de cada membro; as fechadas ficam esbatidas.
 * route.params = { patientId, patientName, patientPhone? }
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

  // Agrupa por membro (null = titular). O titular vem primeiro; dentro de cada
  // membro mantém-se a ordem da RPC (abertas antes das fechadas).
  const sections = useMemo<Section[]>(() => {
    const map = new Map<string, Section>();
    for (const c of items) {
      const key = c.member_id ?? '__titular__';
      if (!map.has(key)) {
        map.set(key, { title: c.member_name ?? patientName ?? 'Paciente', dob: c.member_dob, data: [] });
      }
      map.get(key)!.data.push(c);
    }
    const titular = map.get('__titular__');
    const rest = [...map.entries()].filter(([k]) => k !== '__titular__').map(([, v]) => v);
    return [...(titular ? [titular] : []), ...rest];
  }, [items, patientName]);

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
    <SectionList
      sections={sections}
      keyExtractor={(c) => c.conversation_id}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => {
        const age = formatAge((section as Section).dob);
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {(section as Section).title}
              {age ? <Text style={styles.sectionAge}>{`  ·  ${age}`}</Text> : null}
            </Text>
          </View>
        );
      }}
      renderItem={({ item }) => {
        const unanswered = item.is_open && item.status === 'unanswered';
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
  listContent: { padding: spacing.md, paddingTop: spacing.sm },
  sectionHeader: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '800', color: colors.text },
  sectionAge: { fontWeight: '400', color: colors.textMuted, fontSize: fontSize.sm },
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
  badgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  answered: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.sm },
  closed: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing.sm, fontStyle: 'italic' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
