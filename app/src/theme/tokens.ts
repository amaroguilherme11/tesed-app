/**
 * Design tokens do Tesed — ÚNICO sítio para cores, fontes e medidas.
 * (CLAUDE.md, regra nº 7 + ARQUITETURA.md secção 11.)
 *
 * Valores OFICIAIS da marca (Manual de Identidade e Normas Gráficas Tesed):
 *   - Azul-esverdeado (turquesa): #009EAB  (Pantone 2397C)
 *   - Cinza-escuro:               #383837  (Pantone 2336C)
 *   - Fonte: Quicksand (geométrica sans-serif; Regular e Medium)
 */

export const colors = {
  /** Cor corporativa Tesed (turquesa). */
  primary: '#009EAB',
  primaryDark: '#007E89',
  accent: '#00C2D1',
  /** Destaque de conversa NÃO respondida — central no produto. */
  unanswered: '#E8503A',
  bg: '#F4F8F9',
  surface: '#FFFFFF',
  /** Texto principal — cinza-escuro oficial. */
  text: '#383837',
  textMuted: '#6E7A7B',
  border: '#E1E9EA',
  white: '#FFFFFF',
  danger: '#E8503A',
} as const;

export const fonts = {
  /** Títulos da marca — Quicksand Medium/Bold. */
  display: 'Quicksand_600SemiBold',
  displayBold: 'Quicksand_700Bold',
  /** Corpo — Quicksand Regular/Medium. */
  body: 'Quicksand_500Medium',
  bodyRegular: 'Quicksand_400Regular',
} as const;

export const radius = {
  base: 14,
  sm: 8,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
} as const;

export const fontSize = {
  sm: 14,
  base: 16,
  lg: 20,
  xl: 28,
} as const;
