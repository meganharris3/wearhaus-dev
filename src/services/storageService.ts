import { supabase } from '../lib/supabase';

const BUCKET = 'item-photos';

/** Returns true for local or temporary URIs that need uploading */
function isLocalUri(uri: string): boolean {
  return (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('/var/') ||
    uri.startsWith('blob:')
  );
}

async function readAsBytes(localUri: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const response = await fetch(localUri);
  const buffer   = await response.arrayBuffer();
  const bytes    = new Uint8Array(buffer);

  const ext         = localUri.split('.').pop()?.toLowerCase().replace(/[^a-z]/, '') ?? 'jpg';
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { bytes, contentType };
}

/**
 * Uploads a local photo to Supabase Storage and returns the public URL.
 * If the URI is already remote, returns it unchanged.
 */
export async function uploadPhoto(localUri: string, userId: string): Promise<string> {
  if (!isLocalUri(localUri)) return localUri;

  const { bytes, contentType } = await readAsBytes(localUri);
  const ext  = localUri.split('.').pop()?.toLowerCase().replace(/[^a-z]/, '') ?? 'jpg';
  const path = `${userId}/${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return publicUrl;
}

/** Uploads an avatar image and returns the public URL. Upserts so old avatar is replaced. */
export async function uploadAvatar(localUri: string, userId: string): Promise<string> {
  if (!isLocalUri(localUri)) return localUri;

  const { bytes, contentType } = await readAsBytes(localUri);
  const ext  = localUri.split('.').pop()?.toLowerCase().replace(/[^a-z]/, '') ?? 'jpg';
  const path = `${userId}/avatar.${ext === 'jpeg' ? 'jpg' : ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType, upsert: true });

  if (error) throw new Error(`Avatar upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return publicUrl;
}

/** Upload multiple photos and return public URLs. Null slots → undefined. */
export async function uploadPhotos(
  uris: (string | null)[],
  userId: string,
): Promise<(string | undefined)[]> {
  return Promise.all(
    uris.map((uri) => (uri ? uploadPhoto(uri, userId) : Promise.resolve(undefined))),
  );
}
