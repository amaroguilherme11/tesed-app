import { useCallback, useLayoutEffect } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChatView } from '@/components/ChatView';
import { HeaderFilesButton } from '@/components/HeaderFilesButton';
import { markConversationReadDoctor } from '@/lib/doctorInbox';
import { colors, fontSize, spacing } from '@/theme';

/** Conversa do médico com um paciente específico (a partir da caixa de entrada). */
export function DoctorConversationScreen({ route, navigation }: any) {
  const { conversationId, patientName, patientPhone } = route.params;

  // Marca como lida pelo médico enquanto o chat está em foco.
  useFocusEffect(
    useCallback(() => {
      if (conversationId) markConversationReadDoctor(conversationId);
    }, [conversationId])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: patientName ?? 'Conversa',
      headerRight: () => (
        <HeaderFilesButton
          onPress={() =>
            navigation.navigate('ConversationFiles', {
              conversationId,
              title: `Ficheiros — ${patientName ?? 'Paciente'}`,
            })
          }
        />
      ),
    });
  }, [navigation, patientName, conversationId]);

  const callPatient = () => {
    if (!patientPhone) return;
    const tel = `tel:${patientPhone.replace(/\s/g, '')}`;
    Linking.openURL(tel).catch(() =>
      Alert.alert('Não foi possível ligar', 'Verifica se o dispositivo permite chamadas.')
    );
  };

  return (
    <View style={styles.flex}>
      {/* Barra de contacto do paciente: telemóvel + ligar. */}
      {patientPhone ? (
        <Pressable onPress={callPatient} style={styles.contactBar}>
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
        <ChatView conversationId={conversationId} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
