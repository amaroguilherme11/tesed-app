import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  DeletedAccount,
  getDoctorDeletedAccounts,
  doctorRestorePatient,
  doctorRestoreMember,
} from '@/lib/doctorProfiles';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/**
 * Contas/dependentes apagados (soft-delete), recuperáveis durante 30 dias.
 * O terapeuta pode restaurar; ao fim de 30 dias são purgados em definitivo.
 */
export function DoctorDeletedAccountsScreen() {
  const [items, setItems] = useState<DeletedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setItems(await getDoctorDeletedAccounts());
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRestore = (item: DeletedAccount) => {
    const what = item.kind === 'member' ? 'o membro' : 'a conta';
    Alert.alert('Restaurar', `Restaurar ${what} de ${item.full_name ?? 'sem nome'}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Restaurar',
        onPress: async () => {
          setBusy(item.id);
          try {
            if (item.kind === 'member') await doctorRestoreMember(item.id);
            else await doctorRestorePatient(item.id);
            await load();
          } catch (e: any) {
            Alert.alert('Erro', e.message ?? 'Não foi possível restaurar.');
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
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
      keyExtractor={(i) => `${i.kind}:${i.id}`}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>
              {item.full_name ?? 'Sem nome'}
            </Text>
            <Text style={styles.meta}>
              {item.kind === 'member' ? `Membro de ${item.owner_name ?? '—'}` : 'Conta (titular)'}
              {'  ·  '}apagada em {fmtDate(item.deleted_at)}
            </Text>
            <Text style={[styles.meta, item.days_left <= 3 && styles.urgent]}>
              {item.days_left > 0
                ? `Recuperável por mais ${item.days_left} ${item.days_left === 1 ? 'dia' : 'dias'}`
                : 'Prestes a ser apagada em definitivo'}
            </Text>
          </View>
          <Pressable
            onPress={() => onRestore(item)}
            disabled={busy === item.id}
            style={({ pressed }) => [styles.restoreBtn, pressed && styles.pressed]}
          >
            <Text style={styles.restoreText}>{busy === item.id ? '...' : 'Restaurar'}</Text>
          </Pressable>
        </View>
      )}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <Text style={styles.intro}>
          Contas e membros apagados. Podem ser restaurados durante 30 dias; depois são
          apagados em definitivo.
        </Text>
      }
      ListEmptyComponent={<Text style={styles.empty}>Não há contas apagadas.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  flex: { flex: 1 },
  listContent: { padding: spacing.md },
  intro: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.md, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  name: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  urgent: { color: colors.unanswered, fontWeight: '600' },
  restoreBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  restoreText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
});
