import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Message } from '@/lib/types';

// Mensagens trazem sempre os seus anexos (Fase 3).
const MESSAGE_SELECT = '*, attachments(*)';
// Intervalo do polling de segurança (ms). Garante entrega mesmo se o WebSocket
// Realtime cair (comum em iOS/redes móveis ao mudar de rede ou voltar do fundo).
const POLL_MS = 4000;

/**
 * Carrega as mensagens de uma conversa (com anexos) e mantém-nas atualizadas por
 * TRÊS vias complementares, para fiabilidade em telemóvel (iOS incluído):
 *  1. Realtime (WebSocket) — entrega instantânea quando a ligação está viva.
 *  2. Polling de segurança — refetch periódico leve (apanha o que o WS perder).
 *  3. AppState — refetch imediato quando a app volta a primeiro plano.
 * O Realtime/RLS garante que cada utilizador só vê o que pode ler; o refetch
 * usa a mesma query com RLS.
 */
export function useChat(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  // Guardamos as mensagens num ref para o merge não depender do closure.
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    setLoading(true);

    // Substitui a lista por completo (refetch). Mantém mensagens "otimistas"
    // que ainda não vieram do servidor (evita "piscar" o que acabámos de enviar).
    const applyServerList = (serverList: Message[]) => {
      setMessages((prev) => {
        const serverIds = new Set(serverList.map((m) => m.id));
        const pendingLocal = prev.filter((m) => !serverIds.has(m.id));
        const merged = [...serverList, ...pendingLocal];
        merged.sort((a, b) => a.created_at.localeCompare(b.created_at));
        return merged;
      });
    };

    const refetch = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(MESSAGE_SELECT)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (!active) return;
      if (error) {
        console.warn('[Tesed] Falha a carregar mensagens:', error.message);
        return;
      }
      if (data) applyServerList(data as Message[]);
    };

    // 1ª carga
    refetch().then(() => {
      if (active) setLoading(false);
    });

    // (1) Realtime — entrega instantânea. Qualquer evento desta conversa ou dos
    // anexos despoleta um refetch (simples e robusto: a fonte de verdade é o servidor).
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => refetch()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attachments' },
        () => refetch()
      )
      .subscribe();

    // (2) Polling de segurança
    const poll = setInterval(refetch, POLL_MS);

    // (3) AppState — refetch ao voltar a primeiro plano
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch();
    });

    return () => {
      active = false;
      supabase.removeChannel(channel);
      clearInterval(poll);
      appStateSub.remove();
    };
  }, [conversationId]);

  /** Envia uma mensagem de texto. O trigger no servidor trata do estado da conversa. */
  const send = async (body: string, senderId: string) => {
    const trimmed = body.trim();
    if (!trimmed || !conversationId) return;
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: senderId, body: trimmed })
      .select(MESSAGE_SELECT)
      .single();
    if (error) throw error;
    // Eco otimista para o remetente (dedupe por id quando o refetch a trouxer).
    setMessages((prev) =>
      prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message]
    );
  };

  /** Junta/atualiza na lista uma mensagem (ex.: depois de enviar um anexo). */
  const appendMessage = (message: Message) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === message.id);
      if (idx === -1) return [...prev, message];
      const next = [...prev];
      next[idx] = { ...next[idx], ...message };
      return next;
    });
  };

  return { messages, loading, send, appendMessage };
}
