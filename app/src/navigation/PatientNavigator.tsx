import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PatientHomeScreen } from '@/screens/patient/PatientHomeScreen';
import { ConsultationsListScreen } from '@/screens/patient/ConsultationsListScreen';
import { PatientChatScreen } from '@/screens/patient/PatientChatScreen';
import { AddMemberScreen } from '@/screens/patient/AddMemberScreen';
import { ConversationFilesScreen } from '@/screens/shared/ConversationFilesScreen';
import { SubscriptionScreen } from '@/screens/patient/SubscriptionScreen';
import { HeaderLogo } from '@/components/HeaderLogo';
import { useI18n } from '@/i18n';
import { colors } from '@/theme';

const Stack = createNativeStackNavigator();

export function PatientNavigator() {
  const { t } = useI18n();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        contentStyle: { backgroundColor: colors.bg },
        // Rótulo do botão de voltar (senão o iOS mostra o nome técnico do ecrã).
        headerBackTitle: t.common.back,
      }}
    >
      <Stack.Screen
        name="PatientHome"
        component={PatientHomeScreen}
        options={{
          // Símbolo da marca no centro (o texto "O meu médico" cortava com os
          // botões à direita). Nos restantes ecrãs o título textual mantém-se.
          headerTitle: () => <HeaderLogo />,
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="Consultations"
        component={ConsultationsListScreen}
        options={{ title: t.nav.consultations }}
      />
      <Stack.Screen
        name="PatientChat"
        component={PatientChatScreen}
        options={{ title: t.nav.consultation }}
      />
      <Stack.Screen
        name="AddMember"
        component={AddMemberScreen}
        options={{ title: t.nav.addMember }}
      />
      <Stack.Screen
        name="PatientFiles"
        component={ConversationFilesScreen}
        options={({ route }: any) => ({ title: route.params?.title ?? t.nav.files })}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ title: t.nav.subscription }}
      />
    </Stack.Navigator>
  );
}
