import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useI18n } from '@/i18n';
import { colors, fontSize, fonts, spacing } from '@/theme';

/**
 * Alterna o idioma (PT <-> EN). Mostra o idioma PARA ONDE troca (ex.: em PT
 * mostra "EN"). `tint` permite adaptar a cor ao fundo (branco no cabeçalho azul).
 * Tem padding horizontal para não ficar colado à borda da página.
 */
export function LanguageToggle({ tint }: { tint?: string }) {
  const { lang, toggle } = useI18n();
  // Em ecrãs muito estreitos o cabeçalho fica sem espaço (toggle + logo +
  // botões) — encolhe o padding para nada sair do ecrã. Em normais nada muda.
  const { width } = useWindowDimensions();
  const tight = width < 360;
  return (
    <Pressable
      onPress={toggle}
      hitSlop={10}
      style={[styles.btn, tight && styles.btnTight]}
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
  btnTight: { paddingHorizontal: spacing.xs },
  text: { fontSize: fontSize.base, fontFamily: fonts.display },
});
