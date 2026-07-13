import { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ConsultationsList } from '@/components/ConsultationsList';
import {
  Consultation,
  createConsultation,
  getMyConsultations,
} from '@/lib/consultations';
import { getMySubscription } from '@/lib/subscriptions';
import { markConversationRead } from '@/lib/patientChats';
import { useI18n } from '@/i18n';
import { colors, spacing } from '@/theme';

/**
 * Lista de consultas de um membro específico da família (ou do titular).
 * route.params = { memberId: string | null, title: string }
 */
export function ConsultationsListScreen({ route, navigation }: any) {
  const { memberId, title } = route.params;
  const { t } = useI18n();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [cons, sub] = await Promise.all([getMyConsultations(), getMySubscription()]);
    setConsultations(cons.filter((c) => c.member_id === (memberId ?? null)));
    setIsActive(!!sub && sub.is_active);
    setLoading(false);
  }, [memberId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({ title: title ?? t.nav.consultations });
  }, [navigation, title, t]);

  const openConsulta = (c: Consultation) => {
    if (c.is_open) markConversationRead(c.conversation_id); // já viu a resposta
    navigation.navigate('PatientChat', {
      conversationId: c.conversation_id,
      title,
      lockedReason: c.is_open
        ? isActive
          ? null
          : t.consultations.lockNoSubscription
        : t.consultations.closedReadOnlyMessage,
    });
  };

  const onNew = async () => {
    setCreating(true);
    try {
      const id = await createConsultation(memberId ?? null);
      await load();
      navigation.navigate('PatientChat', { conversationId: id, title, lockedReason: null });
    } catch (e: any) {
      Alert.alert(t.home.couldNotOpenTitle, e.message ?? t.common.unknownError);
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
    <ConsultationsList
      consultations={consultations}
      isActive={isActive}
      creating={creating}
      onOpen={openConsulta}
      onNew={onNew}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    padding: spacing.lg,
  },
});
