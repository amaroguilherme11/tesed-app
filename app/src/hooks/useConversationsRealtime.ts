import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Nome de canal ÚNICO por instância: a lista de membros e a lista de consultas de
// um membro ficam montadas ao mesmo tempo no stack; nomes de canal iguais colidiam
// no Realtime (ecrã em branco). Ver nota equivalente no useConversations do médico.
let seq = 0;

/**
 * Recarrega quando as conversas do PACIENTE mudam no servidor (ex.: a resposta do
 * terapeuta muda status/last_message_at), para o estado "por ler" (bolinha) e a
 * lista atualizarem EM TEMPO REAL, sem o utilizador sair e voltar. A RLS garante
 * que só recebemos as conversas do próprio paciente (titular + dependentes).
 */
export function usePatientConversationsRealtime(onChange: () => void) {
  const { session } = useAuth();
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    const uid = session?.user.id;
    if (!uid) return;
    const name = `patient-convs:${uid}:${++seq}`;
    const channel = supabase
      .channel(name)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `patient_id=eq.${uid}` },
        () => cb.current(),
      )
      .subscribe();
    // Rede móvel: o WebSocket pode cair; ao voltar a primeiro plano, recarrega.
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') cb.current();
    });
    return () => {
      supabase.removeChannel(channel);
      appSub.remove();
    };
  }, [session?.user.id]);
}
