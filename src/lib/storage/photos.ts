import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';

const POST_BUCKET = 'post-photos';
const AVATAR_BUCKET = 'avatars';

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

async function readFileAsArrayBuffer(fileUri: string): Promise<ArrayBuffer> {
  const b64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return decode(b64);
}

function withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(msg)), ms),
    ),
  ]);
}

/**
 * Uploads a local photo (file:// URI from expo-image-picker) to the
 * post-photos bucket and returns its public URL. Path layout matches
 * the storage RLS policy: ${userId}/${timestamp}-${random}.jpg.
 *
 * Reads the file via expo-file-system + base64-arraybuffer because
 * `fetch(fileUri).arrayBuffer()` ships empty/corrupt buffers on
 * Android/iOS for file:// URIs.
 */
export async function uploadPostPhoto(userId: string, fileUri: string): Promise<string> {
  const path = `${userId}/${Date.now()}-${randomId()}.jpg`;
  const arrayBuffer = await readFileAsArrayBuffer(fileUri);

  const { error: uploadError } = await withTimeout(
    supabase.storage
      .from(POST_BUCKET)
      .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false }),
    30_000,
    'La subida de la foto tardó demasiado, intenta de nuevo.',
  );

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(POST_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Uploads a local avatar (file:// URI from expo-image-picker) to the
 * public `avatars` bucket. Same base64 read pattern as uploadPostPhoto.
 */
export async function uploadAvatar(userId: string, fileUri: string): Promise<string> {
  const path = `${userId}/${Date.now()}-${randomId()}.jpg`;
  const arrayBuffer = await readFileAsArrayBuffer(fileUri);

  const { error: uploadError } = await withTimeout(
    supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: false }),
    30_000,
    'La subida de la foto tardó demasiado, intenta de nuevo.',
  );

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
