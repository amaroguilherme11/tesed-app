import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, shadow, spacing } from '@/theme';

/**
 * Botão "⋯" para o cabeçalho + overlay de opções próprio (não depende do
 * colapso do cabeçalho nativo do iOS, que não funciona — ver DoctorConversationScreen).
 */

export function HeaderMoreButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.moreBtn} accessibilityLabel="Mais opções">
      <Text style={styles.moreIcon}>⋯</Text>
    </Pressable>
  );
}

export type MenuItem = {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function OverlayMenu({
  visible,
  onClose,
  items,
}: {
  visible: boolean;
  onClose: () => void;
  items: MenuItem[];
}) {
  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.menu}>
        {items.map((it, i) => (
          <View key={it.label}>
            {i > 0 && <View style={styles.divider} />}
            <Pressable
              style={styles.item}
              disabled={it.disabled}
              onPress={() => {
                onClose();
                it.onPress();
              }}
            >
              <Text style={[styles.text, it.danger && styles.textDanger, it.disabled && styles.textDisabled]}>
                {it.label}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  moreBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  moreIcon: { fontSize: 20, lineHeight: 20, fontWeight: '700', color: colors.text },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
  menu: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    minWidth: 220,
    backgroundColor: colors.surface,
    borderRadius: radius.base,
    paddingVertical: spacing.xs,
    ...shadow.card,
  },
  item: { paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  text: { fontSize: fontSize.base, color: colors.text, fontWeight: '600' },
  textDanger: { color: colors.unanswered },
  textDisabled: { color: colors.textMuted },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginHorizontal: spacing.sm },
});
