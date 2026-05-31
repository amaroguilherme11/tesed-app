import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fonts } from '@/theme';

const symbol = require('../../assets/simbolo-branco.png');

/** Título de cabeçalho: símbolo Tesed (branco) + um texto à frente. */
export function HeaderLogoTitle({ title }: { title: string }) {
  return (
    <View style={styles.row}>
      <Image source={symbol} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 30, height: 30 },
  title: { color: colors.white, fontSize: fontSize.lg, fontFamily: fonts.displayBold },
});
