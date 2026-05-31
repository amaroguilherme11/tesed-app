import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const Content = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Content
        style={styles.flex}
        contentContainerStyle={scroll ? styles.content : undefined}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </Content>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { padding: spacing.lg, flexGrow: 1 },
});
