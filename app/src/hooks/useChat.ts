import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Attachment, Message } from '@/lib/types';

// Mensagens trazem sempre os seus anexos (Fase 3).
const MESSAGE_SELECT = '*, attachments(*)';

/**
 * Carrega as mensagens de uma conversa (com anexos) e subscreve em tempo real:
 *  - novas mensagens (INSERT em messages);
 *  - novos anexos (INSERT em attachments) — porque o anexo é gravado DEPOIS da
 *    mensagem, o evento da mensagem pode chegar antes de o ficheiro existir.
 *    Ao ouvir também os anexos, juntamo-los à mensagem assim que aparecem.
 * O Realtime respeita a RLS, por isso cada utilizador só recebe o que pode ler.
 */
export function useChat(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) return;
    let active = true;
    setLoading(true);

    const fetchFullMessage = async (id: string): Promise<Message | null> => {
      const { data } = await supabase
        .from('messages')
        .select(MESSAGE_SELECT)
        .eq('id', id)
        .single();
      return (data as Message) ?? null;
    };

    const upsertMessage = (msg: Message) => {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === msg.id);
        if (idx === -1) return [...prev, msg];
        const next = [...prev];
        next[idx] = { ...next[idx], ...msg };
        return next;
      });
    };

    supabase
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.warn('[Tesed] Falha a carregar mensagens:', error.message);
        if (data) setMessages(data as Message[]);
        setLoading(false);
      });

    const channel = supabase
      .channel(`chat:${conversationId}`)
      // Novas mensagens desta conversa.
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const incoming = payload.new as Message;
          const full = (await fetchFullMessage(incoming.id)) ?? incoming;
          if (active) upsertMessage(full);
        }
      )
      // Novos anexos (sem filtro por conversa — a tabela attachments não tem
      // conversation_id; a RLS garante que só recebemos os que podemos ver).
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attachments' },
        async (payload) => {
          const att = payload.new as Attachment;
          // Só nos interessa se a mensagem pertencer a esta conversa.
          const full = await fetchFullMessage(att.message_id);
          if (active && full && full.conversation_id === conversationId) {
            upsertMessage(full);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
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
    // Eco otimista para o remetente (o Realtime faz dedupe por id).
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
