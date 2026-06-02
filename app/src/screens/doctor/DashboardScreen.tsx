import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAdminMetrics } from '@/lib/subscriptions';
import { AdminMetrics } from '@/lib/types';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';

/**
 * Painel do médico/admin (Fase 6): métricas-chave do sistema.
 * Reavalia ao ganhar foco e suporta "puxar para atualizar".
 */
export function DashboardScreen({ navigation }: any) {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const m = await getAdminMetrics();
    setMetrics(m);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!metrics) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Não foi possível carregar as métricas.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.primary}
        />
      }
    >
      {/* Destaque: o coração do produto */}
      <View style={[styles.hero, metrics.conversations_unanswered > 0 && styles.heroAlert]}>
        <Text style={styles.heroNumber}>{metrics.conversations_unanswered}</Text>
        <Text style={styles.heroLabel}>
          {metrics.conversations_unanswered === 1
            ? 'conversa por responder'
            : 'conversas por responder'}
        </Text>
      </View>

      {/* Atalho para a lista detalhada de pacientes */}
      <Pressable
        onPress={() => navigation.navigate('Patients')}
        style={({ pressed }) => [styles.patientsBtn, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.patientsBtnText}>👥 Ver pacientes ({metrics.patients_total})</Text>
      </Pressable>

      <Section title="Conversas">
        <Stat label="Total" value={metrics.conversations_total} />
        <Stat label="Respondidas" value={metrics.conversations_answered} />
        <Stat label="Por responder" value={metrics.conversations_unanswered} highlight />
        <Stat label="Mensagens (total)" value={metrics.messages_total} />
      </Section>

      <Section title="Pacientes">
        <Stat label="Registados" value={metrics.patients_total} />
      </Section>

      <Section title="Subscrições">
        <Stat label="Ativas" value={metrics.subscriptions_active} />
        <Stat label="Expiradas" value={metrics.subscriptions_expired} />
        <Stat label="Individuais (ativas)" value={metrics.subscriptions_individual} />
        <Stat label="Família (ativas)" value={metrics.subscriptions_family} />
      </Section>

      <Section title="Códigos">
        <Stat label="Ativos" value={metrics.codes_active} />
        <Stat label="Usados" value={metrics.codes_used} />
        <Stat label="Revogados" value={metrics.codes_revoked} />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  muted: { color: colors.textMuted, fontSize: fontSize.base },
  patientsBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadow.card,
  },
  patientsBtnText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.base },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.base,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadow.card,
  },
  heroAlert: { backgroundColor: colors.unanswered },
  heroNumber: { fontSize: 48, fontWeight: '800', color: colors.white },
  heroLabel: { fontSize: fontSize.base, color: colors.white, marginTop: spacing.xs },
  section: { marginBottom: spacing.md },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    paddingHorizontal: spacing.md,
    ...shadow.card,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  statLabel: { fontSize: fontSize.base, color: colors.text },
  statValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  statValueHighlight: { color: colors.unanswered },
});
