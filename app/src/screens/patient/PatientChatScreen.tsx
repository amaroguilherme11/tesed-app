import { useLayoutEffect } from 'react';
import { ChatView } from '@/components/ChatView';
import { HeaderFilesButton } from '@/components/HeaderFilesButton';

/**
 * Conversa de um membro específico (ou do próprio titular), aberta a partir da
 * lista de chats da família. route.params = { conversationId, title, locked }
 */
export function PatientChatScreen({ route, navigation }: any) {
  const { conversationId, title, lockedReason } = route.params;

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
