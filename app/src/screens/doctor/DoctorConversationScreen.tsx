import { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChatView } from '@/components/ChatView';
import { HeaderBackHome } from '@/components/HeaderBackHome';
import { CONSULTA_CLOSED } from '@/components/ConsultationsList';
import { markConversationReadDoctor } from '@/lib/doctorInbox';
import { closeConsultation, reopenConsultation, toggleStandby } from '@/lib/consultations';
import { confirmAction } from '@/lib/confirm';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';

/** Consulta do médico com um paciente (a partir da lista de consultas). */
export function DoctorConversationScreen({ route, navigation }: any) {
  const { conversationId, patientName, patientPhone } = route.params;
  // Estado aberta/fechada — começa do parâmetro; muda ao fechar/reabrir.
  const [open, setOpen] = useState<boolean>(route.params?.isOpen ?? true);
  const [standby, setStandby] = useState<boolean>(route.params?.isStandby ?? false);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactBarHeight, setContactBarHeight] = useState(0);
  // O standby só faz sentido em consulta ABERTA e POR RESPONDER.
  const canStandby = open && route.params?.status === 'unanswered';

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

  const onToggleStandby = async () => {
    setBusy(true);
    try {
      await toggleStandby(conversationId);
      setStandby((s) => !s);
    } catch (e: any) {
      Alert.alert('Não foi possível alterar o standby', e.message ?? 'Erro desconhecido.');
    } finally {
      setBusy(false);
    }
  };

  const goFiles = () =>
    navigation.navigate('ConversationFiles', {
      conversationId,
      title: `Ficheiros — ${patientName ?? 'Paciente'}`,
    });

  // Fecha o menu e corre a ação (evita menu aberto ao voltar / ao abrir diálogos).
  const run = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      title: patientName ?? 'Consulta',
      // ESQUERDA: voltar + atalho de início (volta direto à lista de pacientes).
      headerLeft: () => (
        <HeaderBackHome onBack={() => navigation.goBack()} onHome={() => navigation.popToTop()} />
      ),
      // DIREITA: UM só botão "⋯" que abre um menu de opções. Antes eram 3 botões
      // de texto (Ficheiros/Standby/Fechar) que, com o botão de início à esquerda,
      // transbordavam e o iOS colapsava-os num "..." nativo que não funcionava.
      headerRight: () => (
        <Pressable
          onPress={() => setMenuOpen(true)}
          hitSlop={10}
          style={styles.moreBtn}
          accessibilityLabel="Mais opções"
        >
          <Text style={styles.moreIcon}>⋯</Text>
        </Pressable>
      ),
    });
  }, [navigation, patientName]);

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

      {/* Menu de opções (overlay próprio — sem depender do cabeçalho nativo). */}
      {menuOpen && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
          <View style={styles.menu}>
            <Pressable style={styles.menuItem} onPress={run(goFiles)}>
              <Text style={styles.menuText}>📎  Ficheiros</Text>
            </Pressable>

            {canStandby && (
              <>
                <View style={styles.menuDivider} />
                <Pressable
                  style={styles.menuItem}
                  onPress={run(onToggleStandby)}
                  disabled={busy}
                >
                  <View style={[styles.dot, { backgroundColor: colors.standby }]} />
                  <Text style={styles.menuText}>
                    {standby ? 'Tirar do standby' : 'Pôr em standby'}
                  </Text>
                </Pressable>
              </>
            )}

            <View style={styles.menuDivider} />
            <Pressable
              style={styles.menuItem}
              onPress={run(open ? onClose : onReopen)}
              disabled={busy}
            >
              <Text style={[styles.menuText, open && styles.menuTextDanger]}>
                {open ? 'Fechar consulta' : 'Reabrir consulta'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  moreBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  moreIcon: { fontSize: 20, lineHeight: 20, fontWeight: '700', color: colors.text },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
  menu: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    minWidth: 210,
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    paddingVertical: spacing.xs,
    ...shadow.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  menuText: { fontSize: fontSize.base, color: colors.text, fontWeight: '600' },
  menuTextDanger: { color: colors.unanswered },
  menuDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
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
