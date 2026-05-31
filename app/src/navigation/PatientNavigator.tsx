import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PatientHomeScreen } from '@/screens/patient/PatientHomeScreen';
import { PatientChatScreen } from '@/screens/patient/PatientChatScreen';
import { AddMemberScreen } from '@/screens/patient/AddMemberScreen';
import { ConversationFilesScreen } from '@/screens/shared/ConversationFilesScreen';
import { SubscriptionScreen } from '@/screens/patient/SubscriptionScreen';
import { colors } from '@/theme';

const Stack = createNativeStackNavigator();

export function PatientNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen
        name="PatientHome"
        component={PatientHomeScreen}
        options={{ title: 'O meu médico' }}
      />
      <Stack.Screen
        name="PatientChat"
        component={PatientChatScreen}
        options={{ title: 'Conversa' }}
      />
      <Stack.Screen
        name="AddMember"
        component={AddMemberScreen}
        options={{ title: 'Adicionar membro' }}
      />
      <Stack.Screen
        name="PatientFiles"
        component={ConversationFilesScreen}
        options={({ route }: any) => ({ title: route.params?.title ?? 'Ficheiros' })}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ title: 'Subscrição' }}
      />
    </Stack.Navigator>
  );
}
