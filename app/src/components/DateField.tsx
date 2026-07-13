import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useI18n } from '@/i18n';
import { colors, radius, spacing, fontSize } from '@/theme';

/**
 * Campo de data simples e cross-platform (web + telemóvel): texto com máscara
 * DD/MM/AAAA. Evita dependências de date-pickers nativos (fiáveis em ambos).
 * Devolve o valor já formatado; usar `parseDateBR` para obter ISO (YYYY-MM-DD).
 */
export function DateField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  const { t } = useI18n();
  const handle = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8); // DDMMYYYY
    let out = digits;
    if (digits.length > 4) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    onChangeText(out);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={handle}
        placeholder={t.fields.datePlaceholder}
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        style={styles.input}
      />
    </View>
  );
}

/** Converte "DD/MM/AAAA" para ISO "YYYY-MM-DD". Devolve null se inválida. */
export function parseDateBR(value: string): string | null {
  const m = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = +dd;
  const month = +mm;
  const year = +yyyy;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  // Confirma que a data existe (ex.: 31/02 inválido) e é razoável.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  const now = new Date();
  if (date > now || year < 1900) return null;
  return `${yyyy}-${mm}-${dd}`;
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.base,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
    backgroundColor: colors.surface,
  },
});
