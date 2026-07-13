import { Pressable, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { confirmAction } from '@/lib/confirm';
import { useI18n } from '@/i18n';
import { colors, fontSize } from '@/theme';

/** Botão de "Sair" para o cabeçalho — bolha clara, pede confirmação. */
export function HeaderSignOutButton() {
  const { signOut } = useAuth();
  const { t } = useI18n();

  const onPress = () => {
    confirmAction({
      title: t.signOut.confirmTitle,
      message: t.signOut.confirmMsg,
      confirmLabel: t.signOut.button,
      destructive: true,
      onConfirm: () => {
        signOut();
      },
    });
  };

  return (
    <Pressable onPress={onPress} hitSlop={10} style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
      <Text style={styles.text}>{t.signOut.button}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  pressed: { opacity: 0.6 },
  text: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700' },
});
