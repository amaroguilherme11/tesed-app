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
import * as Clipboard from 'expo-clipboard';
import { Button } from '@/components/Button';
import { confirmAction } from '@/lib/confirm';
import { createCode, listCodes, revokeCode } from '@/lib/subscriptions';
import { PlanType, SubscriptionCode } from '@/lib/types';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';

type Months = 3 | 6 | 12;

/**
 * Ecrã do TERAPEUTA (admin): gerar códigos (plano + duração 3/6/12 + grátis/pago)
 * e gerir a tabela de códigos (listar, revogar). "Pago" = pago em consulta /
 * dinheiro / outra forma fora do website. Códigos do website chegam pela Fase 5.
 */
export function CodesScreen() {
  const [codes, setCodes] = useState<SubscriptionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Escolhas do gerador.
  const [plan, setPlan] = useState<PlanType>('individual');
  const [months, setMonths] = useState<Months>(3);
  const [paid, setPaid] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setCodes(await listCodes());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onCreate = async () => {
    setCreating(true);
    try {
      const created = await createCode(plan, months, paid);
      await load();
      Alert.alert(
        'Código criado',
        `${created.code}\n\nPlano ${plan === 'family' ? 'família' : 'individual'}, ${months} meses, ${
          paid ? 'pago' : 'grátis'
        }.\nEntrega-o ao paciente.`,
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
        <Text style={styles.title}>Gerar código</Text>

        <Text style={styles.segLabel}>Plano</Text>
        <Seg
          options={[
            { key: 'individual', label: 'Individual' },
            { key: 'family', label: 'Família' },
          ]}
          value={plan}
          onChange={(v) => setPlan(v as PlanType)}
        />

        <Text style={styles.segLabel}>Duração</Text>
        <Seg
          options={[
            { key: '3', label: '3 meses' },
            { key: '6', label: '6 meses' },
            { key: '12', label: '12 meses' },
          ]}
          value={String(months)}
          onChange={(v) => setMonths(Number(v) as Months)}
        />

        <Text style={styles.segLabel}>Tipo</Text>
        <Seg
          options={[
            { key: 'free', label: 'Grátis (consulta)' },
            { key: 'paid', label: 'Pago' },
          ]}
          value={paid ? 'paid' : 'free'}
          onChange={(v) => setPaid(v === 'paid')}
        />

        <View style={styles.generateWrap}>
          <Button title="Gerar código" onPress={onCreate} loading={creating} />
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

/** Seletor segmentado simples (uma linha de pílulas). */
function Seg({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.seg}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[styles.segItem, active && styles.segItemActive]}
          >
            <Text style={[styles.segText, active && styles.segTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  used: 'Usado',
  revoked: 'Revogado',
};

function CodeRow({ item, onRevoke }: { item: SubscriptionCode; onRevoke: () => void }) {
  const [copied, setCopied] = useState(false);
  const statusColor =
    item.status === 'active'
      ? colors.primary
      : item.status === 'used'
        ? colors.textMuted
        : colors.danger;

  const onCopy = async () => {
    await Clipboard.setStringAsync(item.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

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
        <View style={styles.rowActions}>
          <Pressable onPress={onCopy} hitSlop={8}>
            <Text style={styles.copy}>{copied ? 'Copiado ✓' : 'Copiar'}</Text>
          </Pressable>
          {item.status === 'active' && (
            <Pressable onPress={onRevoke} hitSlop={8}>
              <Text style={styles.revoke}>Revogar</Text>
            </Pressable>
          )}
        </View>
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
  segLabel: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xs },
  seg: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  segItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  segItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segText: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  segTextActive: { color: colors.white },
  generateWrap: { marginTop: spacing.lg },
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
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  status: { fontSize: fontSize.sm, fontWeight: '600' },
  copy: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  revoke: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '600' },
});
