/**
 * Nayak Assistant API client.
 * Single place for the police-backend base URL and the persistent anonymous
 * user id header — no more hardcoded localhost:8000 scattered in components.
 */

const API_BASE = import.meta.env.VITE_POLICE_API_URL || 'http://localhost:8000';

/**
 * One persistent anonymous id, shared with the camera-upload flow so a
 * citizen's chat sessions and filed reports belong to the same identity.
 */
export function getAnonUserId() {
  let uid = localStorage.getItem('kawach_uploader_uuid');
  if (!uid) {
    uid = 'anon-' + Math.random().toString(36).substring(2, 15) + '-' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('kawach_uploader_uuid', uid);
  }
  return uid;
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-User-Id': getAnonUserId(),
  };
}

export async function sendChat({ sessionId, message, lat, lng }) {
  const res = await fetch(`${API_BASE}/api/nayak/chat`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ session_id: sessionId, message, lat, lng }),
  });
  if (!res.ok) throw new Error(`chat HTTP ${res.status}`);
  return res.json();
}

export async function getMessages(sessionId) {
  const res = await fetch(`${API_BASE}/api/nayak/sessions/${sessionId}/messages`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`messages HTTP ${res.status}`);
  return res.json();
}

export async function uploadMedia({ mediaUrl, mediaType, sessionId }) {
  const res = await fetch(`${API_BASE}/api/nayak/upload`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ media_url: mediaUrl, media_type: mediaType, session_id: sessionId }),
  });
  if (!res.ok) throw new Error(`upload HTTP ${res.status}`);
  return res.json();
}

/** Link a chat upload to the citizen_reports row it became evidence for. */
export async function linkReport(uploadId, reportId) {
  const res = await fetch(`${API_BASE}/api/nayak/uploads/${uploadId}/link-report`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ report_id: reportId }),
  });
  if (!res.ok) throw new Error(`link-report HTTP ${res.status}`);
  return res.json();
}
