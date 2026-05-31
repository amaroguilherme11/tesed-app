import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, fontSize, fonts } from '@/theme';

/**
 * Campo de telemóvel: seletor de indicativo de país + número.
 * Lista curta e prática (Portugal e países lusófonos/comuns primeiro). O valor
 * devolvido é a junção "+<indicativo> <número>".
 */
type Country = { code: string; dial: string; flag: string; name: string };

const COUNTRIES: Country[] = [
  { code: 'PT', dial: '351', flag: '🇵🇹', name: 'Portugal' },
  { code: 'BR', dial: '55', flag: '🇧🇷', name: 'Brasil' },
  { code: 'ES', dial: '34', flag: '🇪🇸', name: 'Espanha' },
  { code: 'FR', dial: '33', flag: '🇫🇷', name: 'França' },
  { code: 'GB', dial: '44', flag: '🇬🇧', name: 'Reino Unido' },
  { code: 'DE', dial: '49', flag: '🇩🇪', name: 'Alemanha' },
  { code: 'CH', dial: '41', flag: '🇨🇭', name: 'Suíça' },
  { code: 'LU', dial: '352', flag: '🇱🇺', name: 'Luxemburgo' },
  { code: 'AO', dial: '244', flag: '🇦🇴', name: 'Angola' },
  { code: 'MZ', dial: '258', flag: '🇲🇿', name: 'Moçambique' },
  { code: 'CV', dial: '238', flag: '🇨🇻', name: 'Cabo Verde' },
  { code: 'US', dial: '1', flag: '🇺🇸', name: 'EUA / Canadá' },
];

export function PhoneField({
  label,
  dial,
  onChangeDial,
  number,
  onChangeNumber,
}: {
  label: string;
  dial: string;
  onChangeDial: (d: string) => void;
  number: string;
  onChangeNumber: (n: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = COUNTRIES.find((c) => c.dial === dial) ?? COUNTRIES[0];

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable style={styles.dialBtn} onPress={() => setOpen(true)}>
          <Text style={styles.dialText}>
            {selected.flag} +{selected.dial}
          </Text>
        </Pressable>
        <TextInput
          style={styles.input}
          value={number}
          onChangeText={(t) => onChangeNumber(t.replace(/[^\d\s]/g, ''))}
          placeholder="912 345 678"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
        />
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Indicativo do país</Text>
            <ScrollView>
              {COUNTRIES.map((c) => (
                <Pressable
                  key={c.code}
                  style={styles.option}
                  onPress={() => {
                    onChangeDial(c.dial);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionText}>
                    {c.flag} {c.name}
                  </Text>
                  <Text style={styles.optionDial}>+{c.dial}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Junta indicativo + número num formato canónico "+351 912345678". */
export function composePhone(dial: string, number: string): string | null {
  const digits = number.replace(/\D/g, '');
  if (digits.length < 6) return null; // demasiado curto para ser válido
  return `+${dial} ${digits}`;
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.xs, fontFamily: fonts.display },
  row: { flexDirection: 'row', gap: spacing.sm },
  dialBtn: {
    height: 52,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.base,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialText: { fontSize: fontSize.base, color: colors.text, fontFamily: fonts.body },
  input: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.base,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
    backgroundColor: colors.surface,
    fontFamily: fonts.bodyRegular,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.lg },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.base, maxHeight: '70%', padding: spacing.md },
  sheetTitle: { fontSize: fontSize.lg, fontFamily: fonts.display, color: colors.text, marginBottom: spacing.sm },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionText: { fontSize: fontSize.base, color: colors.text, fontFamily: fonts.body },
  optionDial: { fontSize: fontSize.base, color: colors.textMuted, fontFamily: fonts.body },
});
