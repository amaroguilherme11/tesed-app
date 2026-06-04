import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { colors, spacing } from '@/theme';

/**
 * Ecrã base com proteção de teclado. Em ecrãs com campos de texto (login,
 * registo, etc.), o teclado deixa de tapar os campos/botões: no iOS o
 * KeyboardAvoidingView com offset do cabeçalho empurra o conteúdo; no Android
 * o ScrollView + ajuste nativo tratam disso.
 */
export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const Content = scroll ? ScrollView : View;
  // useHeaderHeight pode não existir fora de um navigator com header; protege-se.
  let headerHeight = 0;
  try {
    headerHeight = useHeaderHeight();
  } catch {
    headerHeight = 0;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <Content
          style={styles.flex}
          contentContainerStyle={scroll ? styles.content : undefined}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </Content>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: spacing.lg, flexGrow: 1 },
});
