import 'react-native-url-polyfill/auto';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
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

// Mantém o splash visível até as fontes da marca carregarem (nativo).
SplashScreen.preventAutoHideAsync().catch(() => {});
// Define a fonte da marca já no arranque. Em web, a fonte real aplica-se quando
// o @font-face carregar — por isso NÃO bloqueamos o ecrã à espera dela (senão a
// 1ª visita fica "em branco" até as fontes virem da cache, exigindo refresh).
applyBrandFont();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
  });

  // Em nativo esperamos pelas fontes (evita flash da fonte do sistema), mas com
  // um limite para nunca ficar preso. Em web renderizamos já (a fonte aplica-se
  // assim que carrega) — assim a 1ª visita deixa de ficar "a carregar" em branco.
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const t = setTimeout(() => setFontTimeout(true), 2500);
    return () => clearTimeout(t);
  }, []);

  const ready = Platform.OS === 'web' || fontsLoaded || fontError || fontTimeout;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
