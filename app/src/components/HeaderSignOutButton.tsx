import { Pressable, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fontSize } from '@/theme';

/** Botão de "Sair" para o cabeçalho da navegação. */
export function HeaderSignOutButton() {
  const { signOut } = useAuth();
  return (
    <Pressable onPress={signOut} hitSlop={8}>
      <Text style={styles.text}>Sair</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: { color: colors.white, fontSize: fontSize.base, fontWeight: '600' },
});
