import { useCallback, useLayoutEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ChatView } from '@/components/ChatView';
import { HeaderFilesButton } from '@/components/HeaderFilesButton';
import { markConversationRead } from '@/lib/patientChats';

/**
 * Conversa de um membro específico (ou do próprio titular), aberta a partir da
 * lista de chats da família. route.params = { conversationId, title, locked }
 */
export function PatientChatScreen({ route, navigation }: any) {
  const { conversationId, title, lockedReason } = route.params;

  // Marca como lida enquanto o chat está em foco (resposta nova deixa de contar).
  useFocusEffect(
    useCallback(() => {
      if (conversationId) markConversationRead(conversationId);
    }, [conversationId])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: title ?? 'Conversa',
      headerRight: () => (
        <HeaderFilesButton
          onPress={() =>
            navigation.navigate('PatientFiles', {
              conversationId,
              title: `Ficheiros — ${title ?? ''}`.trim(),
            })
          }
        />
      ),
    });
  }, [navigation, conversationId, title]);

  return <ChatView conversationId={conversationId} lockedReason={lockedReason ?? null} />;
}
