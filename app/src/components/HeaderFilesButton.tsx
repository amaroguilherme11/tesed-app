import { Pressable, Text, StyleSheet } from 'react-native';
import { useI18n } from '@/i18n';
import { colors, fontSize } from '@/theme';

/** Botão "Ficheiros" para o cabeçalho — bolha clara com texto cinza-escuro. */
export function HeaderFilesButton({ onPress }: { onPress: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable onPress={onPress} hitSlop={10} style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
      <Text style={styles.text}>{t.nav.files}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  pressed: { opacity: 0.6 },
  text: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700' },
});
