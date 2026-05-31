import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Attachment } from '@/lib/types';

/** Anexo + quem o enviou (para a vista de Ficheiros da conversa). */
export type FileItem = Attachment & {
  message: { conversation_id: string; sender_id: string } | null;
};

/**
 * Todos os ficheiros trocados numa conversa (de paciente e médico), do mais
 * recente para o mais antigo. Atualiza em tempo real quando chega um novo anexo.
 */
export function useConversationFiles(conversationId: string | null) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!conversationId) return;
    // Junção interna a messages para filtrar pela conversa.
    const { data, error } = await supabase
      .from('attachments')
      .select('*, message:messages!inner(conversation_id, sender_id)')
      .eq('message.conversation_id', conversationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Tesed] Falha a carregar ficheiros:', error.message);
      setLoading(false);
      return;
    }
    setFiles((data ?? []) as FileItem[]);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    load();
    const channel = supabase
      .channel(`files:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attachments' }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, load]);

  return { files, loading, reload: load };
}
