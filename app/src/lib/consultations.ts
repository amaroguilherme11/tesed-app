import { supabase } from '@/lib/supabase';

/**
 * Consultas = conversas com ciclo de vida (aberta até o terapeuta fechar).
 * Camada de dados sobre as RPCs da migração 0020. Partilhada por paciente e
 * terapeuta.
 */

/** Uma consulta na perspetiva do PACIENTE. */
export type Consultation = {
  conversation_id: string;
  member_id: string | null;
  is_open: boolean;
  status: 'answered' | 'unanswered';
  last_message_at: string | null;
  created_at: string;
  has_unread: boolean;
};

/** Uma consulta na perspetiva do TERAPEUTA (traz info do membro + fecho). */
export type DoctorConsultation = Consultation & {
  member_name: string | null;
  member_dob: string | null;
  closed_at: string | null;
};

/** Um paciente na lista do terapeuta, com flags para destacar por-responder. */
export type DoctorPatientOverview = {
  patient_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  created_at: string;
  plan_type: 'individual' | 'family' | null;
  sub_active: boolean;
  open_count: number;
  needs_response: boolean;
  has_unread: boolean;
};

// ----- PACIENTE -----------------------------------------------------------

/** Consultas do paciente (próprias + dependentes). Abertas primeiro. */
export async function getMyConsultations(): Promise<Consultation[]> {
  const { data, error } = await supabase.rpc('my_consultations');
  if (error) {
    console.warn('[Tesed] my_consultations:', error.message);
    return [];
  }
  return (data ?? []) as Consultation[];
}

/**
 * Abre uma consulta nova (titular: memberId=null; dependente: id do membro).
 * Exige subscrição ativa e que não haja outra aberta (validado no servidor).
 * Devolve o id da conversa criada.
 */
export async function createConsultation(memberId: string | null): Promise<string> {
  const { data, error } = await supabase.rpc('create_consultation', { p_member_id: memberId });
  if (error) throw error;
  return (data as { id: string }).id;
}

// ----- TERAPEUTA ----------------------------------------------------------

/** Pacientes (que já tiveram subscrição), por-responder no topo. */
export async function getDoctorPatients(): Promise<DoctorPatientOverview[]> {
  const { data, error } = await supabase.rpc('doctor_patients_overview');
  if (error) {
    console.warn('[Tesed] doctor_patients_overview:', error.message);
    return [];
  }
  return (data ?? []) as DoctorPatientOverview[];
}

/** Todas as consultas de um paciente (todos os dependentes). Abertas no topo. */
export async function getDoctorPatientConsultations(
  patientId: string,
): Promise<DoctorConsultation[]> {
  const { data, error } = await supabase.rpc('doctor_patient_consultations', {
    p_patient_id: patientId,
  });
  if (error) {
    console.warn('[Tesed] doctor_patient_consultations:', error.message);
    return [];
  }
  return (data ?? []) as DoctorConsultation[];
}

/** Terapeuta fecha uma consulta (fica só de leitura; limpa o estado). */
export async function closeConsultation(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('close_consultation', {
    p_conversation_id: conversationId,
  });
  if (error) throw error;
}

/** Terapeuta reabre uma consulta fechada (se não houver outra aberta). */
export async function reopenConsultation(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('reopen_consultation', {
    p_conversation_id: conversationId,
  });
  if (error) throw error;
}
