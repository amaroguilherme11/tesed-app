import { Linking, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';
import { Attachment, Message } from '@/lib/types';

const BUCKET = 'attachments';

/** Ficheiro escolhido pelo utilizador, normalizado para o que precisamos. */
export type PickedFile = {
  uri: string;
  name: string;
  mimeType: string | null;
  size: number | null;
};

/** Abre o seletor de ficheiros do sistema. Devolve null se o utilizador cancelar. */
export async function pickFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return {
    uri: a.uri,
    name: a.name ?? 'ficheiro',
    mimeType: a.mimeType ?? null,
    size: a.size ?? null,
  };
}

/** Seletor de VÁRIOS ficheiros. Devolve [] se cancelar. */
export async function pickFiles(): Promise<PickedFile[]> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: true,
  });
  if (result.canceled || !result.assets?.length) return [];
  return result.assets.map((a) => ({
    uri: a.uri,
    name: a.name ?? 'ficheiro',
    mimeType: a.mimeType ?? null,
    size: a.size ?? null,
  }));
}

/** Deriva um nome de ficheiro quando o sistema não o dá (fotos da câmara não trazem nome). */
function nameForPhoto(uri: string, mimeType?: string, index = 0): string {
  const fromUri = uri.split('?')[0].split('/').pop();
  if (fromUri && /\.[a-z0-9]+$/i.test(fromUri)) return fromUri;
  const ext = mimeType?.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  return `foto-${index + 1}.${ext}`;
}

/** Normaliza um asset do ImagePicker para o nosso PickedFile. */
function assetToPicked(a: ImagePicker.ImagePickerAsset, index: number): PickedFile {
  return {
    uri: a.uri,
    name: a.fileName ?? nameForPhoto(a.uri, a.mimeType, index),
    mimeType: a.mimeType ?? 'image/jpeg',
    size: a.fileSize ?? null,
  };
}

/**
 * Abre a CÂMARA e devolve a foto tirada (ou [] se o utilizador cancelar).
 * A câmara tira uma foto de cada vez; para enviar várias de uma vez, usar pickImages().
 * Lança erro (com mensagem amigável) se a permissão for recusada.
 */
export async function takePhoto(): Promise<PickedFile[]> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Sem acesso à câmara. Ativa a permissão nas definições do telemóvel.');
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.length) return [];
  return result.assets.map(assetToPicked);
}

/**
 * Abre a GALERIA de fotos com seleção MÚLTIPLA (uma ou várias de uma vez).
 * Devolve [] se o utilizador cancelar. Lança erro se a permissão for recusada.
 */
export async function pickImages(): Promise<PickedFile[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Sem acesso às fotos. Ativa a permissão nas definições do telemóvel.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.length) return [];
  return result.assets.map(assetToPicked);
}

/**
 * Lê o ficheiro escolhido e devolve os bytes prontos para upload.
 * Cross-platform: na web usa fetch->blob; no telemóvel lê base64 e converte.
 */
async function readFileData(file: PickedFile): Promise<ArrayBuffer | Blob> {
  if (Platform.OS === 'web') {
    const res = await fetch(file.uri);
    return await res.blob();
  }
  const base64 = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return decode(base64);
}

/** Remove caracteres problemáticos do nome para o caminho de storage. */
function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_');
}

/**
 * Envia um anexo numa conversa, nos dois sentidos (paciente ou médico):
 *   1) cria a mensagem (o corpo é o nome do ficheiro, ou a legenda dada);
 *   2) faz upload do ficheiro para storage em <conversation_id>/<message_id>-<nome>;
 *   3) regista a linha em `attachments`.
 * O trigger de BD trata do estado "respondida/não respondida" como em qualquer mensagem.
 */
export async function sendAttachment(params: {
  conversationId: string;
  senderId: string;
  file: PickedFile;
  caption?: string;
}): Promise<Message> {
  const { conversationId, senderId, file, caption } = params;

  // 1) Mensagem (body é NOT NULL — usamos legenda ou o nome do ficheiro).
  const body = caption?.trim() || file.name;
  const msgRes = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select('*')
    .single();
  if (msgRes.error) throw msgRes.error;
  const message = msgRes.data as Message;

  // 2) Upload para o bucket privado. O caminho começa pelo conversation_id,
  //    que é o que as políticas de storage usam para autorizar o acesso.
  const path = `${conversationId}/${message.id}-${safeName(file.name)}`;
  const data = await readFileData(file);
  const upload = await supabase.storage.from(BUCKET).upload(path, data, {
    contentType: file.mimeType ?? 'application/octet-stream',
    upsert: false,
  });
  if (upload.error) {
    // Rollback simples: remove a mensagem órfã se o upload falhar.
    await supabase.from('messages').delete().eq('id', message.id);
    throw upload.error;
  }

  // 3) Linha de attachment.
  const attRes = await supabase
    .from('attachments')
    .insert({
      message_id: message.id,
      file_path: path,
      file_name: file.name,
      mime_type: file.mimeType,
      size_bytes: file.size,
    })
    .select('*')
    .single();
  if (attRes.error) throw attRes.error;

  return { ...message, attachments: [attRes.data as Attachment] };
}

/**
 * Gera um URL assinado (temporário) para descarregar/ver um anexo privado.
 * Válido por 1 hora. Como o bucket é privado, não há URLs públicos.
 */
export async function getAttachmentUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60 * 60);
  if (error) {
    console.warn('[Tesed] Falha a gerar URL do anexo:', error.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Abre um anexo: gera o URL assinado e abre-o. Cross-platform —
 * na web abre num separador novo; no telemóvel usa o visualizador do sistema.
 * Devolve false se não conseguir (ex.: sem permissão).
 */
export async function openAttachment(filePath: string): Promise<boolean> {
  const url = await getAttachmentUrl(filePath);
  if (!url) return false;
  if (Platform.OS === 'web') {
    // window existe na web; abrir noutro separador.
    (globalThis as any).window?.open(url, '_blank');
    return true;
  }
  await Linking.openURL(url);
  return true;
}
