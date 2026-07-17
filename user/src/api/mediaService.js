/**
 * Real media upload: Cloudinary first, Supabase Storage fallback.
 * Extracted from the working chain in SecureCameraView so the chat (and any
 * future surface) uploads actual bytes instead of fabricating a path.
 * Returns a public URL, or null if every backend failed — callers must treat
 * null honestly (pending/unavailable), never fake a URL.
 */

import { supabase } from '../supabaseClient';
import { getAnonUserId } from './nayakService';

export async function uploadMediaBlob(blob, { folder = 'nayak-chat', filename = null } = {}) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const isVideo = blob.type.startsWith('video/');
  const ext = (blob.type.split('/')[1] || 'bin').split(';')[0];
  const name = filename || `media.${ext}`;

  // 1) Cloudinary (image/ video/ raw auto-routing via resource_type)
  if (cloudName && uploadPreset) {
    try {
      const fd = new FormData();
      fd.append('file', blob, name);
      fd.append('upload_preset', uploadPreset);
      const resource = isVideo ? 'video' : blob.type.startsWith('image/') ? 'image' : 'auto';
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resource}/upload`, {
        method: 'POST',
        body: fd,
      });
      if (res.ok) {
        const d = await res.json();
        console.log('[MEDIA] Cloudinary upload OK:', d.secure_url);
        return d.secure_url;
      }
      console.warn('[MEDIA] Cloudinary failed with status', res.status);
    } catch (e) {
      console.warn('[MEDIA] Cloudinary exception:', e);
    }
  }

  // 2) Supabase Storage fallback (same bucket the camera flow uses)
  try {
    const path = `${getAnonUserId()}/${folder}/${Date.now()}_${name}`;
    const { data, error } = await supabase.storage
      .from('incident-videos')
      .upload(path, blob, { cacheControl: '3600', upsert: false, contentType: blob.type });
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('incident-videos').getPublicUrl(path);
      console.log('[MEDIA] Supabase storage upload OK:', urlData.publicUrl);
      return urlData.publicUrl;
    }
    console.warn('[MEDIA] Supabase storage failed:', error?.message);
  } catch (e) {
    console.warn('[MEDIA] Supabase storage exception:', e);
  }

  return null; // caller must handle honestly — no fabricated URLs
}
