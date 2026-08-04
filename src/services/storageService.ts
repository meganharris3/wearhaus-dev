import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const ITEMS_BUCKET  = 'item-photos';
const AVATAR_BUCKET = 'avatars';

async function compressImage(
  uri: string,
  maxWidth: number,
  quality: number,
): Promise<string> {
  try {
    const ctx = ImageManipulator.manipulate(uri);
    ctx.resize({ width: maxWidth });
    const ref = await ctx.renderAsync();
    const result = await ref.saveAsync({ compress: quality, format: SaveFormat.JPEG });
    return result.uri;
  } catch {
    // Fall back to original URI if compression fails (e.g. unsupported format)
    return uri;
  }
}

function isLocalUri(uri: string): boolean {
  return (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('/var/') ||
    uri.startsWith('blob:')
  );
}

function extAndType(uri: string): { ext: string; contentType: string } {
  const raw = uri.split('.').pop()?.toLowerCase().replace(/[^a-z]/, '') ?? 'jpg';
  const ext = raw === 'jpeg' ? 'jpg' : raw;
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { ext, contentType };
}

async function uploadToStorage(
  bucket: string,
  path: string,
  localUri: string,
  upsert: boolean,
): Promise<string> {
  const { ext, contentType } = extAndType(localUri);

  let body: FormData | Blob;

  if (Platform.OS === 'web') {
    // On web, blob: and file: URIs must be fetched and converted to a Blob.
    // FormData + { uri, name, type } is React Native-only.
    const response = await fetch(localUri);
    body = await response.blob();
  } else {
    const formData = new FormData();
    formData.append('file', {
      uri: localUri,
      name: `upload.${ext}`,
      type: contentType,
    } as unknown as Blob);
    body = formData;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, body, { upsert, contentType });

  if (error) throw new Error(error.message);

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return publicUrl;
}

export async function uploadPhoto(localUri: string, userId: string): Promise<string> {
  if (!isLocalUri(localUri)) return localUri;
  const compressed = await compressImage(localUri, 1200, 0.82);
  const path = `${userId}/${Date.now()}.jpg`;
  return uploadToStorage(ITEMS_BUCKET, path, compressed, false);
}

export async function uploadAvatar(localUri: string, userId: string): Promise<string> {
  if (!isLocalUri(localUri)) return localUri;
  const compressed = await compressImage(localUri, 400, 0.85);
  const path = `${userId}/avatar.jpg`;
  return uploadToStorage(AVATAR_BUCKET, path, compressed, true);
}

export async function uploadPhotos(
  uris: (string | null)[],
  userId: string,
): Promise<(string | undefined)[]> {
  return Promise.all(
    uris.map((uri) => (uri ? uploadPhoto(uri, userId) : Promise.resolve(undefined))),
  );
}
