import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getPatientsOverview } from '@/lib/doctorInbox';
import { formatAge } from '@/lib/age';
import { PatientOverview } from '@/lib/types';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';

/**
 * Dashboard de pacientes (só médico): nome, idade, email, telemóvel, tipo e
 * datas de adesão/fim de subscrição. Pesquisável por nome/email.
 */
export function PatientsScreen() {
  const [all, setAll] = useState<PatientOverview[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getPatientsOverview().then((d) => {
        if (active) {
          setAll(d);
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const q = query.trim().toLowerCase();
  const list = q
    ? all.filter(
        (p) =>
          (p.full_name ?? '').toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
      )
    : all;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Pesquisar por nome ou email…"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />
        <Text style={styles.count}>{list.length} paciente(s)</Text>
      </View>
      <FlatList
        data={list}
        keyExtractor={(p) => p.patient_id}
        renderItem={({ item }) => <PatientCard p={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum paciente encontrado.</Text>}
      />
    </View>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getFullYear()}`;
}

function PatientCard({ p }: { p: PatientOverview }) {
  const age = formatAge(p.date_of_birth);
  const plan =
    p.plan_type === 'family' ? 'Família' : p.plan_type === 'individual' ? 'Individual' : 'Sem plano';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name} numberOfLines={1}>
          {p.full_name || 'Paciente'}
          {age ? <Text style={styles.age}>{`  ·  ${age}`}</Text> : null}
        </Text>
        <View style={[styles.pill, p.sub_active ? styles.pillActive : styles.pillInactive]}>
          <Text style={styles.pillText}>{p.sub_active ? 'ATIVA' : 'SEM SUBSCRIÇÃO'}</Text>
        </View>
      </View>

      <Field label="Email" value={p.email} onPress={() => Linking.openURL(`mailto:${p.email}`)} />
      {p.phone ? (
        <Field
          label="Telemóvel"
          value={p.phone}
          onPress={() => Linking.openURL(`tel:${p.phone!.replace(/\s/g, '')}`)}
        />
      ) : (
        <Field label="Telemóvel" value="—" />
      )}
      <Field label="Plano" value={plan} />
      <Field label="Adesão" value={fmtDate(p.sub_starts_at ?? p.created_at)} />
      <Field label="Fim da subscrição" value={fmtDate(p.sub_expires_at)} />
    </View>
  );
}

function Field({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {onPress ? (
        <Pressable onPress={onPress}>
          <Text style={[styles.fieldValue, styles.link]} numberOfLines={1}>
            {value}
          </Text>
        </Pressable>
      ) : (
        <Text style={styles.fieldValue} numberOfLines={1}>
          {value}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  searchWrap: { padding: spacing.md, gap: spacing.xs },
  search: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.base,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: fontSize.base,
  },
  count: { fontSize: fontSize.sm, color: colors.textMuted, marginLeft: spacing.xs },
  listContent: { padding: spacing.md, paddingTop: 0 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  name: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  age: { fontWeight: '400', color: colors.textMuted, fontSize: fontSize.sm },
  pill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  pillActive: { backgroundColor: colors.primary },
  pillInactive: { backgroundColor: colors.textMuted },
  pillText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  fieldLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  fieldValue: { fontSize: fontSize.sm, color: colors.text, maxWidth: '65%' },
  link: { color: colors.primary, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
