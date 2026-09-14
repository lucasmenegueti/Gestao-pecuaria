import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { supabase } from '@/lib/supabase/client';
import { logWarn } from '@/lib/log';

export const HERD_PHOTO_BUCKET = 'herd-photos';

/** Lê o arquivo como ArrayBuffer. Blob/FormData em RN gera objeto de 0 bytes no Storage. */
async function readBytes(uri: string): Promise<ArrayBuffer | null> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    if (!res.ok) return null;
    return res.arrayBuffer();
  }
  const file = new File(uri);
  if (!file.exists) return null;
  const bytes = await file.bytes();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/**
 * Sobe a foto de um herd_event pro bucket, chaveada pelo UUID estável do row.
 * - string → chave gravada (`herd_events/<uuid>.jpg`)
 * - null   → arquivo local sumiu (cache do ImagePicker é purgável): evento segue sem foto
 * - undefined → upload falhou: chamador trata como falha de push (retry no próximo ciclo)
 */
export async function uploadHerdPhoto(localUri: string, eventUuid: string): Promise<string | null | undefined> {
  const path = `herd_events/${eventUuid}.jpg`;
  let body: ArrayBuffer | null;
  try {
    body = await readBytes(localUri);
  } catch (e: any) {
    logWarn('sync', 'photo_read_failed', { uri: localUri, error: e?.message });
    body = null;
  }
  if (!body || body.byteLength === 0) {
    logWarn('sync', 'photo_missing', { uri: localUri, event: eventUuid });
    return null;
  }
  const { error } = await supabase.storage
    .from(HERD_PHOTO_BUCKET)
    .upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) {
    logWarn('sync', 'photo_upload_failed', { path, error: error.message });
    return undefined;
  }
  return path;
}
