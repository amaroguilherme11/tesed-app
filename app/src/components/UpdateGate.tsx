import { ReactNode, useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { isUpdateRequired } from '@/lib/appUpdate';
import { colors, fontSize, spacing } from '@/theme';

// Link da loja de cada plataforma (App ID iOS e package Android da Tesed).
const STORE_URL = Platform.select({
  ios: 'https://apps.apple.com/app/id6776727727',
  android: 'https://play.google.com/store/apps/details?id=pt.tesed.app',
  default: '',
}) as string;

/**
 * Mostra a app normalmente; se a versão instalada estiver abaixo da mínima do
 * servidor (só mobile), sobrepõe um ecrã a bloquear com botão para a loja.
 * A verificação corre em segundo plano — não atrasa o arranque (overlay).
 */
export function UpdateGate({ children }: { children: ReactNode }) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return; // a web está sempre na versão mais recente
    let active = true;
    isUpdateRequired().then((v) => {
      if (active) setBlocked(v);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.flex}>
      {children}
      {blocked && (
        <View style={styles.overlay}>
          <Text style={styles.title}>Atualização necessária</Text>
          <Text style={styles.body}>
            Há uma versão nova da Tesed. Atualiza a app para continuares a usá-la.
          </Text>
          <View style={styles.btn}>
            <Button
              title="Atualizar"
              onPress={() => {
                if (STORE_URL) Linking.openURL(STORE_URL).catch(() => {});
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  body: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  btn: { alignSelf: 'stretch' },
});
