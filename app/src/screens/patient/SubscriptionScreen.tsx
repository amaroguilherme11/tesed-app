import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { getMySubscription, redeemCode } from '@/lib/subscriptions';
import { MySubscription } from '@/lib/types';
import { useI18n } from '@/i18n';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';

export function SubscriptionScreen() {
  const { t } = useI18n();
  const [sub, setSub] = useState<MySubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSub(await getMySubscription());
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRedeem = async () => {
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      await redeemCode(code.trim());
      setCode('');
      Alert.alert(t.subscription.activatedTitle, t.subscription.activatedMsg);
      await load();
    } catch (e: any) {
      Alert.alert(t.subscription.couldNotRedeemTitle, e.message ?? t.common.unknownError);
    } finally {
      setRedeeming(false);
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
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.subscription.mySubscription}</Text>
        {sub ? (
          <>
            <View style={[styles.badge, sub.is_active ? styles.badgeActive : styles.badgeExpired]}>
              <Text style={styles.badgeText}>{sub.is_active ? t.subscription.active : t.subscription.expired}</Text>
            </View>
            <Text style={styles.row}>
              {t.subscription.plan}{' '}
              <Text style={styles.bold}>
                {sub.plan_type === 'family' ? t.subscription.family : t.subscription.individual}
              </Text>
            </Text>
            <Text style={styles.row}>
              {t.subscription.validity} <Text style={styles.bold}>{formatDate(sub.expires_at)}</Text>
            </Text>
            {sub.is_active && <Text style={styles.muted}>{t.subscription.daysLeft(sub.days_left)}</Text>}
            {sub.plan_type === 'family' && sub.is_active && (
              <Text style={styles.muted}>{t.subscription.manageFamilyHint}</Text>
            )}
          </>
        ) : (
          <Text style={styles.muted}>{t.subscription.noSubscription}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.subscription.enterCode}</Text>
        <Text style={styles.muted}>{t.subscription.enterCodeHint}</Text>
        <TextField
          label={t.subscription.codeLabel}
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase())}
          autoCapitalize="characters"
          placeholder="TESED-XXXX-XXXX"
        />
        <Button title={t.subscription.redeem} onPress={onRedeem} loading={redeeming} />
      </View>
    </ScrollView>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getFullYear()}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  row: { fontSize: fontSize.base, color: colors.text, marginTop: spacing.xs },
  bold: { fontWeight: '700' },
  muted: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 20 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    marginVertical: spacing.sm,
  },
  badgeActive: { backgroundColor: colors.primary },
  badgeExpired: { backgroundColor: colors.unanswered },
  badgeText: { color: colors.white, fontWeight: '700', fontSize: 12 },
});
