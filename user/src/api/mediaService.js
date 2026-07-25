/**
 * Real media upload: Uses our AppSail Zoho backend (/media/upload)
 * Extracted from the working chain in SecureCameraView so the chat (and any
 * future surface) uploads actual bytes instead of fabricating a path.
 * Returns a public URL, or null if the backend failed.
 */
export async function uploadMediaBlob(blob, { filename = null } = {}) {
  const ext = (blob.type.split('/')[1] || 'bin').split(';')[0];
  const name = filename || `media.${ext}`;

  // 1) Zoho Catalyst AppSail Backend Upload
  try {
    const backendUrl = import.meta.env.VITE_POLICE_API_URL || "http://localhost:8000/api/v1";
    const fd = new FormData();
    fd.append('file', blob, name);
    
    const res = await fetch(`${backendUrl}/media/upload`, {
      method: 'POST',
      body: fd,
    });
    
    if (res.ok) {
      const d = await res.json();
      console.log('[MEDIA] Backend AppSail upload OK:', d.url);
      
      // Ensure the URL is fully qualified if the backend returned a relative path
      if (d.url.startsWith('/')) {
         return backendUrl.replace('/api/v1', '') + d.url;
      }
      return d.url;
    }
    console.warn('[MEDIA] Backend AppSail failed with status', res.status);
  } catch (e) {
    console.warn('[MEDIA] Backend AppSail exception:', e);
  }

  // 2) Local Data URL fallback if remote storage is unreachable
  try {
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('[MEDIA] Data URL fallback exception:', e);
  }

  return null;
}
