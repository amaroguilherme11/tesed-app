import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Attachment } from '@/lib/types';
import { getAttachmentUrl, openAttachment } from '@/lib/attachments';
import { useI18n } from '@/i18n';
import { colors, fontSize, radius, spacing } from '@/theme';

type Props = {
  body: string;
  createdAt: string;
  mine: boolean;
  attachments?: Attachment[];
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatSize(bytes: number | null): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Decide se um anexo é uma imagem (pelo mime ou pela extensão do nome). */
function isImage(a: Attachment): boolean {
  if (a.mime_type?.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/i.test(a.file_name);
}

/** Linha clicável de um anexo (ficheiro não-imagem): abre URL assinado ao tocar. */
function AttachmentRow({ attachment, mine }: { attachment: Attachment; mine: boolean }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);

  const open = async () => {
    setLoading(true);
    try {
      await openAttachment(attachment.file_path);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable onPress={open} style={[styles.attach, mine ? styles.attachMine : styles.attachOther]}>
      <View style={styles.attachInfo}>
        <Text style={[styles.attachName, mine && styles.bodyMine]} numberOfLines={1}>
          {attachment.file_name}
        </Text>
        <Text style={[styles.attachMeta, mine && styles.timeMine]}>
          {formatSize(attachment.size_bytes)} · {t.chat.tapToOpen}
        </Text>
      </View>
      {loading && <ActivityIndicator size="small" color={mine ? colors.white : colors.primary} />}
    </Pressable>
  );
}

/**
 * Miniatura de uma imagem anexada. Gera o URL assinado (temporário) ao montar e
 * mostra a foto; tocar abre em tamanho real. Se o URL falhar, cai na linha de
 * ficheiro normal para não deixar o anexo inacessível.
 */
function ImageAttachment({ attachment, mine }: { attachment: Attachment; mine: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getAttachmentUrl(attachment.file_path).then((u) => {
      if (!active) return;
      if (u) setUrl(u);
      else setFailed(true);
    });
    return () => {
      active = false;
    };
  }, [attachment.file_path]);

  if (failed) return <AttachmentRow attachment={attachment} mine={mine} />;

  return (
    <Pressable onPress={() => openAttachment(attachment.file_path)} style={styles.imageWrap}>
      {url ? (
        <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imageLoading]}>
          <ActivityIndicator color={mine ? colors.white : colors.primary} />
        </View>
      )}
    </Pressable>
  );
}

export function MessageBubble({ body, createdAt, mine, attachments }: Props) {
  const hasAttachments = !!attachments && attachments.length > 0;
  // Se o corpo for igual ao nome do anexo (anexo sem legenda), não repetir o texto.
  const showBody =
    !!body && !(hasAttachments && attachments!.some((a) => a.file_name === body));

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.other]}>
        {showBody && <Text style={[styles.body, mine && styles.bodyMine]}>{body}</Text>}
        {hasAttachments &&
          attachments!.map((a) =>
            isImage(a) ? (
              <ImageAttachment key={a.id} attachment={a} mine={mine} />
            ) : (
              <AttachmentRow key={a.id} attachment={a} mine={mine} />
            )
          )}
        <Text style={[styles.time, mine && styles.timeMine]}>{formatTime(createdAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginVertical: spacing.xs / 2, paddingHorizontal: spacing.md },
  rowMine: { alignItems: 'flex-end' },
  rowOther: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.base,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: radius.sm },
  other: { backgroundColor: colors.surface, borderBottomLeftRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  body: { fontSize: fontSize.base, color: colors.text, lineHeight: 22 },
  bodyMine: { color: colors.white },
  time: { fontSize: 11, color: colors.textMuted, marginTop: 2, alignSelf: 'flex-end' },
  timeMine: { color: 'rgba(255,255,255,0.8)' },
  attach: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
    minWidth: 200,
  },
  attachMine: { backgroundColor: 'rgba(255,255,255,0.18)' },
  attachOther: { backgroundColor: colors.bg },
  attachInfo: { flex: 1 },
  attachName: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  attachMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  imageWrap: { marginTop: spacing.xs },
  image: { width: 200, height: 200, borderRadius: radius.sm, backgroundColor: colors.bg },
  imageLoading: { alignItems: 'center', justifyContent: 'center' },
});
