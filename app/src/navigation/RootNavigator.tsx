import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/theme';

// Auth
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/screens/auth/ResetPasswordScreen';

// Navegadores por papel
import { PatientNavigator } from '@/navigation/PatientNavigator';
import { DoctorNavigator } from '@/navigation/DoctorNavigator';

const Stack = createNativeStackNavigator();

const authScreenOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.white,
  contentStyle: { backgroundColor: colors.bg },
};

export function RootNavigator() {
  const { session, profile, loading, recoveringPassword } = useAuth();

  // Recuperação de password tem prioridade sobre tudo: o utilizador chegou por
  // link de reset e tem de definir nova password antes de seguir.
  if (recoveringPassword) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={authScreenOptions}>
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ title: 'Nova password', headerBackVisible: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // Ecrã de carregamento enquanto a sessão inicial é verificada, OU enquanto há
  // sessão mas o perfil ainda não chegou. Isto é CRÍTICO: sem este segundo caso,
  // um médico cujo perfil ainda não carregou cairia no ramo de paciente e a app
  // criaria uma conversa errada para ele. O routing por papel só decide com o
  // perfil já conhecido.
  if (loading || (session && !profile)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!session ? (
        <Stack.Navigator screenOptions={authScreenOptions}>
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Entrar' }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Criar conta' }} />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ title: 'Recuperar password' }}
          />
        </Stack.Navigator>
      ) : profile?.role === 'doctor' ? (
        <DoctorNavigator />
      ) : (
        <PatientNavigator />
      )}
    </NavigationContainer>
  );
}
