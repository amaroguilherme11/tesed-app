import { Image, StyleSheet } from 'react-native';

// Símbolo Tesed (branco, fundo transparente) para o cabeçalho turquesa.
const symbol = require('../../assets/simbolo-branco.png');

/** Título do cabeçalho com o símbolo da marca (em vez de texto que corta). */
export function HeaderLogo() {
  return <Image source={symbol} style={styles.logo} resizeMode="contain" />;
}

const styles = StyleSheet.create({
  logo: { width: 34, height: 34 },
});
