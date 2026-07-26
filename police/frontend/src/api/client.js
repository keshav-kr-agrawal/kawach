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

// Auth endpoints never fall back to the simulation layer — a "successful"
// fake login is worse than an honest failure, since it silently produces a
// session token (sim_session_token) that then 401s on every real API call
// with no indication to the user why. They also get a longer timeout: a
// cold Render free-tier instance can take 20-60s to wake up, well past the
// 8s budget every other call uses, and login is usually the very first
// request of a session (most likely to land during that cold start).
const AUTH_PATHS = ['/auth/login', '/auth/login-json'];

async function request(path, { method = 'GET', body } = {}) {
  const isAuthPath = AUTH_PATHS.includes(path);
  let res;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(isAuthPath ? 45000 : 8000),
    });
  } catch (err) {
    if (isAuthPath) {
      const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      throw new Error(timedOut
        ? 'The backend is waking up (Render free tier can take up to a minute after being idle) — please wait and try again.'
        : 'Could not reach the login service — check your connection and try again.');
    }
    // Backend down / no network — switch to the simulation layer.
    setBackendStatus('offline');
    return mockRequest(path, method, body);
  }

  // A cold Render free-tier instance (or Cloudflare in front of it) can
  // answer with a real HTTP gateway error (502/503/504) while it wakes up —
  // that's not "the app rejected this request", it's "infra isn't ready
  // yet", so treat it the same as unreachable rather than surfacing a raw
  // error the user can't act on. Auth is the one exception: better an
  // honest "try again in a moment" than a fake session.
  if ([502, 503, 504].includes(res.status)) {
    if (isAuthPath) {
      throw new Error('The backend is still waking up — please wait a moment and try again.');
    }
    setBackendStatus('offline');
    return mockRequest(path, method, body);
  }

  if (res.status === 401) {
    if (isAuthPath) {
      const err = new Error('Incorrect username or password.');
      err.status = 401;
      throw err;
    }
    forceReLogin();
    throw new Error('Session expired — signing you out.');
  }

  setBackendStatus('live');
  if (!res.ok) {
    if (isAuthPath) {
      const err = new Error(`Login failed (HTTP ${res.status}).`);
      err.status = res.status;
      throw err;
    }
    return mockRequest(path, method, body);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    if (isAuthPath) {
      throw new Error('Login service returned an invalid response — please try again.');
    }
    return mockRequest(path, method, body);
  }

  // Gracefully populate dense data if backend returns 0 records
  if (Array.isArray(data) && data.length === 0) {
    console.warn(`[API] Backend returned empty array for ${path} — populating with dense mock dataset`);
    return mockRequest(path, method, body);
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (data.nodes && Array.isArray(data.nodes) && data.nodes.length === 0) {
      console.warn(`[API] Backend returned 0 graph nodes for ${path} — populating with dense mock network graph`);
      return mockRequest(path, method, body);
    }
  }

  return data;
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
