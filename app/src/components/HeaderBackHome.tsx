import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme';

/**
 * Cabeçalho ESQUERDO do terapeuta: seta de VOLTAR + atalho de INÍCIO (lista de
 * pacientes).
 *
 * Nota: o React Navigation não deixa acrescentar um botão AO LADO do botão de
 * voltar nativo — ao definir `headerLeft` ele é substituído. Por isso desenhamos
 * os dois aqui. São só ÍCONES (sem texto) de propósito: o lado direito já tem
 * Ficheiros/Standby/Fechar e o cabeçalho fica apertado em ecrãs estreitos.
 * O gesto de deslizar para voltar (iOS) continua a funcionar.
 */
export function HeaderBackHome({ onBack, onHome }: { onBack: () => void; onHome: () => void }) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onBack} hitSlop={12} accessibilityLabel="Voltar">
        <Text style={styles.back}>←</Text>
      </Pressable>
      <Pressable onPress={onHome} hitSlop={12} accessibilityLabel="Ir para a lista de pacientes">
        <Text style={styles.home}>🏠</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: { color: colors.white, fontSize: 26, lineHeight: 30 },
  home: { fontSize: 20, lineHeight: 30 },
});
