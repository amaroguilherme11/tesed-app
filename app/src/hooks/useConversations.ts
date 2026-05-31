import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { InboxGroup, InboxRow } from '@/lib/types';

// Contador para garantir nomes de canal únicos (evita conflito quando o hook é
// usado em dois ecrãs montados ao mesmo tempo: inbox + chats da família).
let channelSeq = 0;

/**
 * Caixa de entrada do médico: conversas agrupadas por titular.
 * - Paciente individual → grupo com 1 chat (a sua conversa pessoal).
 * - Família → grupo "Família: nome" com vários chats (titular + dependentes).
 * Atualiza em tempo real quando o estado das conversas muda.
 */
export function useConversations() {
  const [groups, setGroups] = useState<InboxGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('doctor_inbox');
    if (error) {
      console.warn('[Tesed] Falha a carregar conversas:', error.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as InboxRow[];

    // Agrupa por titular (patient_id).
    const byOwner = new Map<string, InboxGroup>();
    for (const r of rows) {
      let g = byOwner.get(r.patient_id);
      if (!g) {
        g = {
          ownerId: r.patient_id,
          ownerName: r.owner_name ?? 'Paciente',
          ownerDob: r.owner_dob,
          isFamily: r.is_family,
          chats: [],
          unansweredCount: 0,
          lastMessageAt: null,
        };
        byOwner.set(r.patient_id, g);
      }
      const isPersonal = r.member_id == null;
      g.chats.push({
        conversationId: r.id,
        label: isPersonal ? g.ownerName : r.member_name ?? 'Membro',
        dob: isPersonal ? r.owner_dob : r.member_dob,
        isPersonal,
        status: r.status,
        last_message_at: r.last_message_at,
      });
      if (r.status === 'unanswered') g.unansweredCount += 1;
      if ((r.last_message_at ?? '') > (g.lastMessageAt ?? '')) {
        g.lastMessageAt = r.last_message_at;
      }
    }

    // Dentro de cada família, chat pessoal primeiro, depois por nome.
    const list = Array.from(byOwner.values());
    for (const g of list) {
      // Mostrar como família se tem plano família OU há mais do que um chat
      // (ex.: plano expirou mas os perfis dos membros ainda existem).
      g.isFamily = g.isFamily || g.chats.length > 1;
      g.chats.sort((a, b) => {
        if (a.isPersonal !== b.isPersonal) return a.isPersonal ? -1 : 1;
        return a.label.localeCompare(b.label);
      });
    }
    // Grupos: os que têm não respondidas primeiro, depois por última mensagem.
    list.sort((a, b) => {
      const au = a.unansweredCount > 0 ? 0 : 1;
      const bu = b.unansweredCount > 0 ? 0 : 1;
      if (au !== bu) return au - bu;
      return (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '');
    });

    setGroups(list);
    setLoading(false);
  }, []);

  const channelName = useRef(`doctor-inbox-${++channelSeq}`).current;

  useEffect(() => {
    load();
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, channelName]);

  const unansweredCount = groups.reduce((sum, g) => sum + g.unansweredCount, 0);

  return { groups, loading, unansweredCount, reload: load };
}
