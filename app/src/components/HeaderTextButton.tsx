import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, fontSize } from '@/theme';

/** Botão de texto genérico para o cabeçalho da navegação. */
export function HeaderTextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.btn}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 4 },
  text: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600' },
});
