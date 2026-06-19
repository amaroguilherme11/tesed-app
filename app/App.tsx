import 'react-native-url-polyfill/auto';
import { useEffect, ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';
import { AuthProvider } from '@/contexts/AuthContext';
import { RootNavigator } from '@/navigation/RootNavigator';
import { applyBrandFont } from '@/theme/applyFont';
import { colors } from '@/theme';

/**
 * Em web (ecrãs largos), centra a app numa coluna tipo telemóvel para não
 * esticar feio no desktop. Em iOS/Android é um passthrough (sem moldura).
 */
function AppFrame({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={styles.webBackdrop}>
      <View style={styles.webColumn}>{children}</View>
    </View>
  );
}

// Mantém o splash visível até as fontes da marca carregarem.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      applyBrandFont(); // Quicksand por defeito em todo o texto.
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  // Não renderiza até as fontes carregarem (evita "flash" da fonte do sistema).
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppFrame>
          <RootNavigator />
        </AppFrame>
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // Fundo neutro à volta da coluna (só visível em ecrãs largos).
  webBackdrop: { flex: 1, alignItems: 'center', backgroundColor: '#E7ECED' },
  // "Telemóvel" centrado: largura máxima, fundo da app e sombra subtil.
  // boxShadow (equivalente web) em vez de shadow* — esta coluna só existe em web.
  webColumn: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.bg,
    boxShadow: '0 0 24px rgba(0,0,0,0.12)',
  } as any,
});
