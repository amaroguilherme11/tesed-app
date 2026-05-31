import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '@/components/Button';
import { confirmAction } from '@/lib/confirm';
import { createFreeCode, listCodes, revokeCode } from '@/lib/subscriptions';
import { PlanType, SubscriptionCode } from '@/lib/types';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';

/**
 * Ecrã do MÉDICO (admin): gerar códigos grátis (3 meses) e gerir a tabela
 * de códigos (listar, revogar). Códigos pagos chegam pelo website (Fase 5).
 */
export function CodesScreen() {
  const [codes, setCodes] = useState<SubscriptionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setCodes(await listCodes());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onCreate = async (plan: PlanType) => {
    setCreating(true);
    try {
      const created = await createFreeCode(plan);
      await load();
      Alert.alert(
        'Código criado',
        `${created.code}\n\nPlano ${plan === 'family' ? 'família' : 'individual'}, 3 meses.\nEntrega-o ao paciente.`
      );
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível criar o código.');
    } finally {
      setCreating(false);
    }
  };

  const onRevoke = (item: SubscriptionCode) => {
    confirmAction({
      title: 'Revogar código',
      message: `Revogar ${item.code}? Deixa de poder ser usado.`,
      confirmLabel: 'Revogar',
      destructive: true,
      onConfirm: async () => {
        try {
          await revokeCode(item.id);
          await load();
        } catch (e: any) {
          Alert.alert('Erro', e.message ?? 'Não foi possível revogar.');
        }
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Text style={styles.title}>Gerar código grátis (3 meses)</Text>
        <View style={styles.btnRow}>
          <View style={styles.flex}>
            <Button title="Individual" onPress={() => onCreate('individual')} loading={creating} />
          </View>
          <View style={styles.flex}>
            <Button title="Família" onPress={() => onCreate('family')} loading={creating} />
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={codes}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <CodeRow item={item} onRevoke={() => onRevoke(item)} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>Ainda não há códigos.</Text>}
        />
      )}
    </View>
  );
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  used: 'Usado',
  revoked: 'Revogado',
};

function CodeRow({ item, onRevoke }: { item: SubscriptionCode; onRevoke: () => void }) {
  const statusColor =
    item.status === 'active'
      ? colors.primary
      : item.status === 'used'
        ? colors.textMuted
        : colors.danger;
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text style={styles.code}>{item.code}</Text>
        <Text style={styles.meta}>
          {item.plan_type === 'family' ? 'Família' : 'Individual'} · {item.duration_months} meses ·{' '}
          {item.origin === 'free_consultation' ? 'grátis' : 'pago'}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.status, { color: statusColor }]}>{STATUS_LABEL[item.status]}</Text>
        {item.status === 'active' && (
          <Pressable onPress={onRevoke} hitSlop={8}>
            <Text style={styles.revoke}>Revogar</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  center: { paddingTop: spacing.xl, alignItems: 'center' },
  actions: { padding: spacing.md },
  title: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  listContent: { padding: spacing.md, paddingTop: 0 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  code: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, letterSpacing: 1 },
  meta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: spacing.xs },
  status: { fontSize: fontSize.sm, fontWeight: '600' },
  revoke: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '600' },
});
