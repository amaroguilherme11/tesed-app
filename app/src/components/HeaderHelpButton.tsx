import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '@/theme';

/** Botão "?" do cabeçalho — abre o guia de utilização da app. */
export function HeaderHelpButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={styles.btn}
      accessibilityLabel="Como usar a app / How to use the app"
    >
      <Text style={styles.text}>?</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: colors.white, fontSize: 18, fontWeight: '800' },
});
