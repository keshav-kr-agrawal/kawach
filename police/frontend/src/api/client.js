/**
 * Single API access point for the command console.
 * Base URL: VITE_POLICE_API_URL (Render in prod) → localhost:8000 in dev.
 *
 * If the backend is unreachable (network-level failure), requests fall
 * through to the local simulation layer (mock.js) and the header status
 * dot flips red — the only visible difference between live and simulated.
 */

import { setBackendStatus } from './status.js';
import { mockRequest } from './mock.js';

export const API_BASE =
  import.meta.env.VITE_POLICE_API_URL || 'http://localhost:8000';

function authHeaders() {
  const token = localStorage.getItem('kawach_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** A stale/invalid token means every request will 401 forever — clear the
 * session and force a fresh login instead of leaving the console stuck
 * behind a permanent error banner. */
function forceReLogin() {
  localStorage.removeItem('kawach_token');
  localStorage.removeItem('kawach_user');
  if (!location.hash.startsWith('#/login')) {
    location.hash = '#/login';
    location.reload();
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // Backend down / no network — switch to the simulation layer.
    setBackendStatus('offline');
    return mockRequest(path, method, body);
  }

  // A cold Render free-tier instance (or Cloudflare in front of it) can
  // answer with a real HTTP gateway error (502/503/504) while it wakes up —
  // that's not "the app rejected this request", it's "infra isn't ready
  // yet", so treat it the same as unreachable rather than surfacing a raw
  // error the user can't act on.
  if ([502, 503, 504].includes(res.status)) {
    setBackendStatus('offline');
    return mockRequest(path, method, body);
  }

  if (res.status === 401) {
    forceReLogin();
    throw new Error('Session expired — signing you out.');
  }

  setBackendStatus('live');
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data?.detail) detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } catch { /* non-JSON error body */ }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
};

/**
 * Multipart file upload — used by real-signal endpoints (deepfake frame,
 * voice-clip acoustic heuristic) that need actual bytes, not a JSON number.
 * Bypasses the mock-fallback layer on purpose: these calls exist specifically
 * to prove a real model ran, so a network failure should surface as an
 * honest error rather than a simulated verdict.
 */
export async function postFile(path, file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: form,
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data?.detail) detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } catch { /* non-JSON error body */ }
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export function downloadUrl(reportId) {
  return `${API_BASE}/api/reports/download/${reportId}`;
}
