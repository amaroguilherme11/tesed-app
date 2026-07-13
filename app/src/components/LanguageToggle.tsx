import { Pressable, StyleSheet, Text } from 'react-native';
import { useI18n } from '@/i18n';
import { colors, fontSize, fonts, spacing } from '@/theme';

/**
 * Alterna o idioma (PT <-> EN). Mostra o idioma PARA ONDE troca (ex.: em PT
 * mostra "EN"). `tint` permite adaptar a cor ao fundo (branco no cabeçalho azul).
 * Tem padding horizontal para não ficar colado à borda da página.
 */
export function LanguageToggle({ tint }: { tint?: string }) {
  const { lang, toggle } = useI18n();
  return (
    <Pressable
      onPress={toggle}
      hitSlop={10}
      style={styles.btn}
      accessibilityLabel="Change language / Mudar idioma"
    >
      <Text style={[styles.text, { color: tint ?? colors.primary }]}>
        {lang === 'pt' ? '🌐 EN' : '🌐 PT'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  text: { fontSize: fontSize.base, fontFamily: fonts.display },
});
