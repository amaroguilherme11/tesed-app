import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius, spacing, fontSize, fonts } from '@/theme';

type Props = TextInputProps & {
  label: string;
};

export function TextField({ label, style, ...rest }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // minWidth: 0 — na web os <input> têm largura mínima intrínseca e não
  // encolhem num flex row (campos lado a lado transbordavam em ecrãs estreitos).
  wrapper: { marginBottom: spacing.md, minWidth: 0 },
  label: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    fontFamily: fonts.display,
  },
  input: {
    minWidth: 0, // idem — deixa o input encolher abaixo da largura intrínseca
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
});
