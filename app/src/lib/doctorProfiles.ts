import { supabase } from '@/lib/supabase';

/**
 * Camada de dados da ADMINISTRAÇÃO de perfis pelo TERAPEUTA (migração 0028).
 * Editar/apagar (soft-delete) titulares e dependentes, e restaurar no período de
 * recuperação (30 dias). Tudo passa por RPCs de servidor com is_doctor().
 */

/** Uma conta/dependente apagado, à espera de restauro ou purga. */
export type DeletedAccount = {
  kind: 'patient' | 'member';
  id: string;
  full_name: string | null;
  /** Para dependentes: nome do titular; para titulares: null. */
  owner_name: string | null;
  deleted_at: string;
  /** Dias até à purga definitiva (0 = já elegível). */
  days_left: number;
};

/** Edita um titular (nome, data de nascimento, telemóvel). */
export async function doctorUpdatePatient(
  id: string,
  fullName: string,
  dob: string | null,
  phone: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('doctor_update_patient', {
    p_id: id,
    p_full_name: fullName,
    p_dob: dob,
    p_phone: phone,
  });
  if (error) throw error;
}

/** Edita um dependente (nome, data de nascimento). */
export async function doctorUpdateMember(
  id: string,
  fullName: string,
  dob: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('doctor_update_member', {
    p_id: id,
    p_full_name: fullName,
    p_dob: dob,
  });
  if (error) throw error;
}

/** Apaga (soft) a conta de um titular. Recuperável durante 30 dias. */
export async function doctorSoftDeletePatient(id: string): Promise<void> {
  const { error } = await supabase.rpc('doctor_soft_delete_patient', { p_id: id });
  if (error) throw error;
}

/** Restaura uma conta de titular apagada. */
export async function doctorRestorePatient(id: string): Promise<void> {
  const { error } = await supabase.rpc('doctor_restore_patient', { p_id: id });
  if (error) throw error;
}

/** Apaga (soft) um dependente. Recuperável durante 30 dias. */
export async function doctorSoftDeleteMember(id: string): Promise<void> {
  const { error } = await supabase.rpc('doctor_soft_delete_member', { p_id: id });
  if (error) throw error;
}

/** Restaura um dependente apagado. */
export async function doctorRestoreMember(id: string): Promise<void> {
  const { error } = await supabase.rpc('doctor_restore_member', { p_id: id });
  if (error) throw error;
}

/** Lista contas/dependentes apagados (para a secção "Contas apagadas"). */
export async function getDoctorDeletedAccounts(): Promise<DeletedAccount[]> {
  const { data, error } = await supabase.rpc('doctor_deleted_accounts');
  if (error) {
    console.warn('[Tesed] doctor_deleted_accounts:', error.message);
    return [];
  }
  return (data ?? []) as DeletedAccount[];
}
