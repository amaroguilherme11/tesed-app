import { useLayoutEffect } from 'react';
import { ChatView } from '@/components/ChatView';
import { HeaderFilesButton } from '@/components/HeaderFilesButton';

/** Conversa do médico com um paciente específico (a partir da caixa de entrada). */
export function DoctorConversationScreen({ route, navigation }: any) {
  const { conversationId, patientName } = route.params;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: patientName ?? 'Conversa',
      headerRight: () => (
        <HeaderFilesButton
          onPress={() =>
            navigation.navigate('ConversationFiles', {
              conversationId,
              title: `Ficheiros — ${patientName ?? 'Paciente'}`,
            })
          }
        />
      ),
    });
  }, [navigation, patientName, conversationId]);

  return <ChatView conversationId={conversationId} />;
}
