import { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChatView } from '@/components/ChatView';
import { HeaderFilesButton } from '@/components/HeaderFilesButton';
import { HeaderTextButton } from '@/components/HeaderTextButton';
import { CONSULTA_CLOSED } from '@/components/ConsultationsList';
import { markConversationReadDoctor } from '@/lib/doctorInbox';
import { closeConsultation, reopenConsultation } from '@/lib/consultations';
import { confirmAction } from '@/lib/confirm';
import { colors, fontSize, spacing } from '@/theme';

/** Consulta do médico com um paciente (a partir da lista de consultas). */
export function DoctorConversationScreen({ route, navigation }: any) {
  const { conversationId, patientName, patientPhone } = route.params;
  // Estado aberta/fechada — começa do parâmetro; muda ao fechar/reabrir.
  const [open, setOpen] = useState<boolean>(route.params?.isOpen ?? true);
  const [busy, setBusy] = useState(false);
  const [contactBarHeight, setContactBarHeight] = useState(0);

  // Marca como lida pelo médico enquanto o chat está em foco.
  useFocusEffect(
    useCallback(() => {
      if (conversationId) markConversationReadDoctor(conversationId);
    }, [conversationId]),
  );

  const onClose = () => {
    confirmAction({
      title: 'Fechar consulta',
      message: 'Fechar esta consulta? Fica só de leitura e deixa de contar como por responder.',
      confirmLabel: 'Fechar',
      destructive: true,
      onConfirm: async () => {
        setBusy(true);
        try {
          await closeConsultation(conversationId);
          setOpen(false);
        } catch (e: any) {
          Alert.alert('Erro', e.message ?? 'Não foi possível fechar.');
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const onReopen = async () => {
    setBusy(true);
    try {
      await reopenConsultation(conversationId);
      setOpen(true);
    } catch (e: any) {
      Alert.alert('Não foi possível reabrir', e.message ?? 'Erro desconhecido.');
    } finally {
      setBusy(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: patientName ?? 'Consulta',
      headerRight: () => (
        <View style={styles.headerRow}>
          <HeaderFilesButton
            onPress={() =>
              navigation.navigate('ConversationFiles', {
                conversationId,
                title: `Ficheiros — ${patientName ?? 'Paciente'}`,
              })
            }
          />
          <HeaderTextButton
            label={open ? 'Fechar' : 'Reabrir'}
            onPress={open ? onClose : onReopen}
            disabled={busy}
          />
        </View>
      ),
    });
  }, [navigation, patientName, conversationId, open, busy]);

  const callPatient = () => {
    if (!patientPhone) return;
    const tel = `tel:${patientPhone.replace(/\s/g, '')}`;
    Linking.openURL(tel).catch(() =>
      Alert.alert('Não foi possível ligar', 'Verifica se o dispositivo permite chamadas.'),
    );
  };

  return (
    <View style={styles.flex}>
      {patientPhone ? (
        <Pressable
          onPress={callPatient}
          style={styles.contactBar}
          onLayout={(e) => setContactBarHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.flex}>
            <Text style={styles.contactLabel}>Telemóvel do paciente</Text>
            <Text style={styles.contactPhone}>{patientPhone}</Text>
          </View>
          <View style={styles.callBtn}>
            <Text style={styles.callText}>Ligar</Text>
          </View>
        </Pressable>
      ) : null}
      <View style={styles.flex}>
        <ChatView
          conversationId={conversationId}
          extraKeyboardOffset={contactBarHeight}
          lockedReason={open ? null : CONSULTA_CLOSED}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  contactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactLabel: { fontSize: 12, color: colors.textMuted },
  contactPhone: { fontSize: fontSize.base, color: colors.text, fontWeight: '700' },
  callBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  callText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
});
