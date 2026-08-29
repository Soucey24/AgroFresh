import fs from 'fs';
import { supabase } from '../app.js';

const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'agrofresh';

const isStorageConfigured = () =>
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) ||
  Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

const makeSafeFileName = (originalName = 'upload') => {
  const baseName = originalName.replace(/\\/g, '/').split('/').pop() || 'upload';
  return baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
};

export const uploadToSupabaseStorage = async (file, folder = 'uploads') => {
  if (!file || !isStorageConfigured()) {
    return null;
  }

  try {
    const buffer = file.buffer || fs.readFileSync(file.path);
    const fileName = makeSafeFileName(file.originalname || file.filename || 'upload');
    const key = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e9)}-${fileName}`;

    const { data, error } = await supabase.storage.from(storageBucket).upload(key, buffer, {
      contentType: file.mimetype || 'application/octet-stream',
      upsert: false,
    });

    if (error) {
      console.warn('[storage] Supabase upload failed:', error.message);
      return null;
    }

    const storedPath = data?.path || key;
    const publicUrlData = supabase.storage.from(storageBucket).getPublicUrl(storedPath);
    if (publicUrlData?.data?.publicUrl) {
      return {
        url: publicUrlData.data.publicUrl,
        path: storedPath,
        bucket: storageBucket,
      };
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from(storageBucket)
      .createSignedUrl(storedPath, 60 * 60 * 24 * 365);

    if (signedError) {
      console.warn('[storage] Signed URL creation failed:', signedError.message);
      return {
        url: null,
        path: storedPath,
        bucket: storageBucket,
      };
    }

    return {
      url: signed?.signedUrl || null,
      path: storedPath,
      bucket: storageBucket,
    };
  } catch (error) {
    console.warn('[storage] File upload to Supabase failed:', error.message);
    return null;
  }
};

export const getStorageFallbackUrl = (file) => {
  if (!file) return null;
  return `/uploads/${file.filename || file.originalname || 'upload'}`;
};
