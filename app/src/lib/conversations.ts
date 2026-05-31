import { supabase } from '@/lib/supabase';
import { Conversation } from '@/lib/types';

/**
 * Devolve a conversa do paciente com o médico único, criando-a se ainda não existir.
 * O `doctor_id` é preenchido pelo trigger `set_conversation_doctor` no servidor.
 */
export async function getOrCreateMyConversation(patientId: string): Promise<Conversation> {
  // A conversa "pessoal" do titular/paciente individual tem member_id NULL.
  // (Um titular de família pode ter outras conversas, uma por dependente.)
  const existing = await supabase
    .from('conversations')
    .select('*')
    .eq('patient_id', patientId)
    .is('member_id', null)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return existing.data as Conversation;

  const created = await supabase
    .from('conversations')
    .insert({ patient_id: patientId })
    .select('*')
    .single();

  if (created.error) throw created.error;
  return created.data as Conversation;
}
