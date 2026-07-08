import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { DoctorPatientsScreen } from '@/screens/doctor/DoctorPatientsScreen';
import { DoctorConsultationsScreen } from '@/screens/doctor/DoctorConsultationsScreen';
import { DoctorConversationScreen } from '@/screens/doctor/DoctorConversationScreen';
import { ConversationFilesScreen } from '@/screens/shared/ConversationFilesScreen';
import { CodesScreen } from '@/screens/doctor/CodesScreen';
import { DashboardScreen } from '@/screens/doctor/DashboardScreen';
import { PatientsScreen } from '@/screens/doctor/PatientsScreen';
import { HeaderSignOutButton } from '@/components/HeaderSignOutButton';
import { HeaderTextButton } from '@/components/HeaderTextButton';
import { HeaderLogoTitle } from '@/components/HeaderLogoTitle';
import { colors, spacing } from '@/theme';

const Stack = createNativeStackNavigator();

export function DoctorNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="DoctorPatients"
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        contentStyle: { backgroundColor: colors.bg },
        headerBackTitle: 'Voltar',
      }}
    >
      <Stack.Screen
        name="DoctorPatients"
        component={DoctorPatientsScreen}
        options={({ navigation }: any) => ({
          headerTitle: () => <HeaderLogoTitle title="Pacientes" />,
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
        name="DoctorConsultations"
        component={DoctorConsultationsScreen}
        options={{ title: 'Consultas' }}
      />
      <Stack.Screen
        name="Conversation"
        component={DoctorConversationScreen}
        options={{ title: 'Consulta' }}
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
      <Stack.Screen
        name="Patients"
        component={PatientsScreen}
        options={{ title: 'Pacientes' }}
      />
    </Stack.Navigator>
  );
}
