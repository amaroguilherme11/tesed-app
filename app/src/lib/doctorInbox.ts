import { supabase } from '@/lib/supabase';
import { PatientOverview } from '@/lib/types';

/** Médico marca uma conversa como lida (ao abri-la). */
export async function markConversationReadDoctor(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read_doctor', {
    p_conversation_id: conversationId,
  });
  if (error) console.warn('[Tesed] Falha a marcar lida (médico):', error.message);
}

/** Lista de pacientes com dados + subscrição (dashboard do médico). */
export async function getPatientsOverview(): Promise<PatientOverview[]> {
  const { data, error } = await supabase.rpc('patients_overview');
  if (error) {
    console.warn('[Tesed] Falha a obter pacientes:', error.message);
    return [];
  }
  return (data ?? []) as PatientOverview[];
}
