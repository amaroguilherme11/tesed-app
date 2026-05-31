/**
 * Design tokens do Tesed — ÚNICO sítio para cores, fontes e medidas.
 * (CLAUDE.md, regra nº 7 + ARQUITETURA.md secção 11.)
 *
 * PLACEHOLDERS — substituir pelos valores oficiais da marca Tesed.
 * Trocar aqui aplica a identidade em toda a app.
 */

export const colors = {
  primary: '#0E7C7B',
  primaryDark: '#075E5D',
  accent: '#F2A541',
  /** Destaque de conversa NÃO respondida — central no produto. */
  unanswered: '#E8503A',
  bg: '#F7F9F9',
  surface: '#FFFFFF',
  text: '#14211F',
  textMuted: '#5C6B68',
  border: '#E2E8E7',
  white: '#FFFFFF',
  danger: '#E8503A',
} as const;

export const fonts = {
  /** Fonte de títulos da marca (placeholder: usa a do sistema por agora). */
  display: undefined as string | undefined,
  /** Fonte de corpo da marca (placeholder). */
  body: undefined as string | undefined,
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
