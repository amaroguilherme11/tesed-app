import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, fontSize } from '@/theme';

/**
 * Botão de texto para o cabeçalho — bolha clara com texto cinza-escuro.
 * `bg`/`color` permitem um estado destacado (ex.: standby ativo a âmbar).
 */
export function HeaderTextButton({
  label,
  onPress,
  disabled = false,
  bg,
  color,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  bg?: string;
  color?: string;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      hitSlop={10}
      style={({ pressed }) => [
        styles.btn,
        bg ? { backgroundColor: bg } : null,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <Text style={[styles.text, color ? { color } : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  pressed: { opacity: 0.6 },
  text: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700' },
});
