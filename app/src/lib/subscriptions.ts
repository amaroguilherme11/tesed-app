import { supabase } from '@/lib/supabase';
import {
  AdminMetrics,
  MySubscription,
  PlanType,
  SubscriptionCode,
} from '@/lib/types';

/**
 * Camada de dados das subscrições (Fase 4).
 * Tudo passa por funções de SERVIDOR (RPC). O cliente nunca escreve nas tabelas
 * de códigos/subscrições — a validação e o estado são geridos no servidor.
 */

/** PACIENTE: resgata um código. O servidor valida e cria a subscrição (transação). */
export async function redeemCode(code: string): Promise<void> {
  const { error } = await supabase.rpc('redeem_code', { p_code: code });
  if (error) throw error;
}

/** PACIENTE: subscrição efetiva atual (como titular ou membro de família). */
export async function getMySubscription(): Promise<MySubscription | null> {
  const { data, error } = await supabase.rpc('my_subscription');
  if (error) {
    console.warn('[Tesed] Falha a obter subscrição:', error.message);
    return null;
  }
  // A RPC devolve uma tabela (0 ou 1 linha).
  const row = Array.isArray(data) ? data[0] : data;
  return (row as MySubscription) ?? null;
}

// ---- Médico (admin) ----

/** MÉDICO: gera um código grátis de 3 meses. Devolve o código criado. */
export async function createFreeCode(planType: PlanType): Promise<SubscriptionCode> {
  const { data, error } = await supabase.rpc('create_free_code', {
    p_plan_type: planType,
  });
  if (error) throw error;
  return data as SubscriptionCode;
}

/** MÉDICO: revoga um código ativo. */
export async function revokeCode(codeId: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_code', { p_code_id: codeId });
  if (error) throw error;
}

/** MÉDICO: lista todos os códigos (mais recentes primeiro). */
export async function listCodes(): Promise<SubscriptionCode[]> {
  const { data, error } = await supabase
    .from('subscription_codes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('[Tesed] Falha a listar códigos:', error.message);
    return [];
  }
  return (data ?? []) as SubscriptionCode[];
}

/** MÉDICO: métricas agregadas do painel (Fase 6). */
export async function getAdminMetrics(): Promise<AdminMetrics | null> {
  const { data, error } = await supabase.rpc('admin_metrics');
  if (error) {
    console.warn('[Tesed] Falha a obter métricas:', error.message);
    return null;
  }
  return data as AdminMetrics;
}
