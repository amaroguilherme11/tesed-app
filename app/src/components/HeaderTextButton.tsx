import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, fontSize } from '@/theme';

/** Botão de texto para o cabeçalho — bolha clara com texto cinza-escuro. */
export function HeaderTextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={({ pressed }) => [styles.btn, pressed && styles.pressed]}>
      <Text style={styles.text}>{label}</Text>
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
