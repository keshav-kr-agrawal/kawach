/**
 * Backend link status — one tiny store the whole console reads.
 * 'live'    = last request hit the real backend
 * 'offline' = last request fell back to the local simulation layer
 * 'unknown' = nothing attempted yet
 */

let status = 'unknown';
const subscribers = new Set();

export function setBackendStatus(next) {
  if (next === status) return;
  status = next;
  subscribers.forEach((fn) => fn(status));
}

export function getBackendStatus() {
  return status;
}

export function subscribeBackendStatus(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
