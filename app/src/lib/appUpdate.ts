import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

/**
 * Verificação de versão mínima: a app lê 'min_app_version' do servidor (RPC
 * app_min_version, migração 0021) e compara com a versão instalada. Se estiver
 * abaixo, o UpdateGate mostra um ecrã a bloquear com botão para a loja.
 */

/** Versão instalada (vem do app.json, ex.: "1.1.0"). */
export function currentAppVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

/** True se `a` é uma versão inferior a `b` (compara por partes numéricas). */
function isLower(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

/**
 * Devolve true se a app instalada está ABAIXO da versão mínima do servidor.
 * Fail-open: se a verificação falhar (sem rede, erro), NÃO bloqueia (devolve
 * false) — mais vale deixar usar do que trancar por causa de uma falha.
 */
export async function isUpdateRequired(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('app_min_version');
    if (error || !data) return false;
    return isLower(currentAppVersion(), String(data));
  } catch {
    return false;
  }
}
