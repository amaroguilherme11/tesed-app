import { supabase } from '@/lib/supabase';

/** Estado de leitura de uma conversa do paciente. */
export type PatientChat = {
  conversation_id: string;
  member_id: string | null;
  status: 'answered' | 'unanswered';
  last_message_at: string | null;
  has_unread: boolean;
};

/** Lista as conversas do paciente (própria + dependentes) com flag de não lida. */
export async function getMyPatientChats(): Promise<PatientChat[]> {
  const { data, error } = await supabase.rpc('my_patient_chats');
  if (error) {
    console.warn('[Tesed] Falha a obter estado das conversas:', error.message);
    return [];
  }
  return (data ?? []) as PatientChat[];
}

/** Marca uma conversa como lida pelo paciente (ao abrir o chat). */
export async function markConversationRead(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
  });
  if (error) console.warn('[Tesed] Falha a marcar como lida:', error.message);
}
