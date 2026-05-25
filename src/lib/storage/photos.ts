import { supabase } from '@/lib/supabase';

const BUCKET = 'post-photos';
const SIGNED_URL_TTL_SEC = 3600;

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Uploads a local photo (file:// URI from expo-image-picker) to the
 * post-photos bucket and returns a signed URL (1h). Path layout matches
 * the storage RLS policy: ${userId}/${timestamp}-${random}.jpg.
 */
export async function uploadPostPhoto(userId: string, fileUri: string): Promise<string> {
  const path = `${userId}/${Date.now()}-${randomId()}.jpg`;

  const res = await fetch(fileUri);
  const arrayBuffer = await res.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);

  if (signError) throw signError;
  return data.signedUrl;
}

/**
 * Returns a signed URL (1h TTL) for an existing path inside the
 * post-photos bucket. Bucket is private; callers should refresh the URL
 * when it expires.
 */
export async function getPostPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);

  if (error) throw error;
  return data.signedUrl;
}
