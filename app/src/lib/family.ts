import { supabase } from '@/lib/supabase';
import { MemberProfile } from '@/lib/types';

/**
 * Perfis de membros de família (dependentes geridos pelo titular).
 * Tudo via RPC de servidor; o limite de 6 é imposto no servidor.
 */

/** TITULAR: lista os dependentes + o id da conversa de cada um. */
export async function getMyMemberProfiles(): Promise<MemberProfile[]> {
  const { data, error } = await supabase.rpc('my_member_profiles');
  if (error) {
    console.warn('[Tesed] Falha a listar membros:', error.message);
    return [];
  }
  return (data ?? []) as MemberProfile[];
}

/** TITULAR: cria um dependente (nome + data de nascimento ISO opcional). */
export async function addMemberProfile(fullName: string, dob: string | null): Promise<void> {
  const { error } = await supabase.rpc('add_member_profile', {
    p_full_name: fullName,
    p_dob: dob,
  });
  if (error) throw error;
}

/** TITULAR: remove um dependente (apaga também a sua conversa). */
export async function removeMemberProfile(memberId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_member_profile', { p_member_id: memberId });
  if (error) throw error;
}
