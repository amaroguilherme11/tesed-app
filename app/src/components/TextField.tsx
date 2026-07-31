import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useI18n } from '@/i18n';
import { colors, radius, spacing, fontSize, fonts } from '@/theme';

type Props = TextInputProps & {
  label: string;
};

export function TextField({ label, style, secureTextEntry, ...rest }: Props) {
  const { t } = useI18n();
  const isSecure = !!secureTextEntry;
  // Campos de password começam ocultos; o botão "Mostrar/Ocultar" alterna.
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isSecure && hidden}
          style={[styles.input, isSecure && styles.inputSecure, style]}
          {...rest}
        />
        {isSecure && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            style={styles.toggle}
            accessibilityLabel={hidden ? t.common.show : t.common.hide}
          >
            <Text style={styles.toggleText}>{hidden ? t.common.show : t.common.hide}</Text>
          </Pressable>
        )}
      </View>
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
  // Contentor relativo: o botão de mostrar/ocultar fica sobreposto à direita.
  inputRow: { position: 'relative', justifyContent: 'center' },
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
  // Espaço à direita para o texto do botão não ficar por cima da password.
  inputSecure: { paddingRight: 90 },
  toggle: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  toggleText: { color: colors.primary, fontSize: fontSize.sm, fontFamily: fonts.display },
});
