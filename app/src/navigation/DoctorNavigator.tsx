import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { DoctorInboxScreen } from '@/screens/doctor/DoctorInboxScreen';
import { DoctorConversationScreen } from '@/screens/doctor/DoctorConversationScreen';
import { DoctorFamilyChatsScreen } from '@/screens/doctor/DoctorFamilyChatsScreen';
import { ConversationFilesScreen } from '@/screens/shared/ConversationFilesScreen';
import { CodesScreen } from '@/screens/doctor/CodesScreen';
import { DashboardScreen } from '@/screens/doctor/DashboardScreen';
import { HeaderSignOutButton } from '@/components/HeaderSignOutButton';
import { HeaderTextButton } from '@/components/HeaderTextButton';
import { HeaderLogoTitle } from '@/components/HeaderLogoTitle';
import { colors, spacing } from '@/theme';

const Stack = createNativeStackNavigator();

export function DoctorNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen
        name="DoctorInbox"
        component={DoctorInboxScreen}
        options={({ navigation }: any) => ({
          headerTitle: () => <HeaderLogoTitle title="Conversas" />,
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <HeaderTextButton label="Painel" onPress={() => navigation.navigate('Dashboard')} />
              <HeaderTextButton label="Códigos" onPress={() => navigation.navigate('Codes')} />
              <HeaderSignOutButton />
            </View>
          ),
        })}
      />
      <Stack.Screen
        name="FamilyChats"
        component={DoctorFamilyChatsScreen}
        options={{ title: 'Família' }}
      />
      <Stack.Screen
        name="Conversation"
        component={DoctorConversationScreen}
        options={{ title: 'Conversa' }}
      />
      <Stack.Screen
        name="ConversationFiles"
        component={ConversationFilesScreen}
        options={({ route }: any) => ({ title: route.params?.title ?? 'Ficheiros' })}
      />
      <Stack.Screen
        name="Codes"
        component={CodesScreen}
        options={{ title: 'Códigos e subscrições' }}
      />
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Painel' }}
      />
    </Stack.Navigator>
  );
}
