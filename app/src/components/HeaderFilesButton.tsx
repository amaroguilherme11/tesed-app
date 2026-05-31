import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, fontSize } from '@/theme';

/** Botão "Ficheiros" para o cabeçalho — abre a vista de anexos da conversa. */
export function HeaderFilesButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.btn}>
      <Text style={styles.text}>📎 Ficheiros</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: 4 },
  text: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600' },
});
