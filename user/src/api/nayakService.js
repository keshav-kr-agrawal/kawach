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

export const SUPPORTED_LANGUAGES = [
  'English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Malayalam',
  'Marathi', 'Bengali', 'Gujarati', 'Punjabi', 'Urdu', 'Odia',
];

export async function checkFraudShield(queryStr) {
  const res = await fetch(`${API_BASE}/api/fraud-shield/check`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ query: queryStr }),
  });
  if (!res.ok) throw new Error(`fraud shield HTTP ${res.status}`);
  return res.json();
}

export async function sendChat({ sessionId, message, lat, lng, lang, mode }) {
  const res = await fetch(`${API_BASE}/api/nayak/chat`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ session_id: sessionId, message, lat, lng, lang, mode: mode || null }),
  });
  if (!res.ok) throw new Error(`chat HTTP ${res.status}`);
  return res.json();
}

/** Translates client-formatted content (verdict cards, NCRB packs) that never passes through the chat LLM call. */
export async function translateText(text, targetLanguage) {
  const res = await fetch(`${API_BASE}/api/nayak/translate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ text, target_language: targetLanguage }),
  });
  if (!res.ok) throw new Error(`translate HTTP ${res.status}`);
  return res.json();
}

export async function getMessages(sessionId) {
  const res = await fetch(`${API_BASE}/api/nayak/sessions/${sessionId}/messages`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`messages HTTP ${res.status}`);
  return res.json();
}

export async function uploadMedia({ mediaUrl, mediaType, sessionId, captureMode }) {
  const res = await fetch(`${API_BASE}/api/nayak/upload`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      media_url: mediaUrl,
      media_type: mediaType,
      session_id: sessionId,
      capture_mode: captureMode || 'visible'
    }),
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

/**
 * Builds a structured National Cyber Crime Portal (cybercrime.gov.in / 1930)
 * complaint-prep pack — fields + ready-to-paste narrative + the real portal
 * URL. KAWACH never auto-submits to NCRB; this only prepares the pack.
 */
export async function prepareNcrbReport({ narrative, suspectPhone, suspectUpi, suspectBankAccount, suspectBankName, evidenceMediaUrl }) {
  const res = await fetch(`${API_BASE}/api/nayak/ncrb-report`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      narrative,
      suspect_phone: suspectPhone || null,
      suspect_upi: suspectUpi || null,
      suspect_bank_account: suspectBankAccount || null,
      suspect_bank_name: suspectBankName || null,
      evidence_media_url: evidenceMediaUrl || null,
    }),
  });
  if (!res.ok) throw new Error(`ncrb-report HTTP ${res.status}`);
  return res.json();
}
