import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, fontSize, fonts } from '@/theme';

const symbol = require('../../assets/simbolo-branco.png');

/** Título de cabeçalho: símbolo Tesed (branco) + um texto à frente. */
export function HeaderLogoTitle({ title }: { title: string }) {
  // Em ecrãs estreitos os botões à direita (Painel/Códigos/Sair) ocupam quase
  // toda a largura e tapavam/cortavam o título — abaixo de 420px mostra-se só
  // o símbolo (como no cabeçalho do paciente). Em ecrãs normais nada muda.
  const { width } = useWindowDimensions();
  const showText = width >= 420;
  return (
    <View style={styles.row}>
      <Image source={symbol} style={styles.logo} resizeMode="contain" />
      {showText && (
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 30, height: 30 },
  // flexShrink/minWidth: se mesmo assim faltar espaço, o texto trunca com "…"
  // em vez de ficar por baixo dos botões do cabeçalho.
  title: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontFamily: fonts.displayBold,
    flexShrink: 1,
    minWidth: 0,
  },
});
