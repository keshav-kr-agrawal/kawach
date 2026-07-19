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

export function downloadUrl(reportId) {
  return `${API_BASE}/api/reports/download/${reportId}`;
}
