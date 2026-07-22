/**
 * Shared Supabase access for all department dashboards + admin.
 * Anonymity boundary: department-facing queries NEVER select uploader_uuid
 * or any identity field — only report content, location, and AI output.
 *
 * If Supabase is unreachable, queries fall through to the local simulation
 * ledger (simdata.js) and the topbar link dot turns red — that dot is the
 * only visible difference between live and simulated data.
 */

import { buildSimReports } from './simdata.js';

const supabaseUrl = localStorage.getItem('VITE_SUPABASE_URL') || 'https://jlqelkrfeksixxfkulwf.supabase.co';
const supabaseAnonKey = localStorage.getItem('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_tG7DDMyStV7t-zrEbRKtrA_hFnPJQIb';

// global `supabase` comes from the CDN script tag in each html page
export const client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

export const DEPT_SAFE_COLUMNS =
  'id, title, description, category, status, lat, lng, video_url, timestamp, ' +
  'routed_department, routing_priority, routing_reason, escalation_required, ' +
  'ai_verdict, confidence_level, trust_score, civic_urgency_score, sub_category, upvotes';

/* ── link status (green = live Supabase, red = simulation) ── */
let linkStatus = 'unknown';
const linkSubs = new Set();
function setLink(next) {
  if (next === linkStatus) return;
  linkStatus = next;
  linkSubs.forEach((fn) => fn(linkStatus));
}
export function getLinkStatus() { return linkStatus; }
export function onLinkStatus(fn) { linkSubs.add(fn); fn(linkStatus); return () => linkSubs.delete(fn); }

/* ── simulation ledger (built lazily, mutated by resolve when offline) ── */
let simReports = null;
function sim() {
  if (!simReports) simReports = buildSimReports();
  return simReports;
}

/** All reports routed to any of the given department codes, newest first. */
export async function fetchReportsByCodes(codes) {
  try {
    const { data, error } = await client
      .from('citizen_reports')
      .select(DEPT_SAFE_COLUMNS)
      .in('routed_department', codes)
      .order('timestamp', { ascending: false });
    if (error) throw error;
    setLink('live');
    if (!data || data.length === 0) {
      console.warn(`[CIVIC DASHBOARD] Live database returned 0 reports for ${codes.join(',')} — returning dense sim dataset`);
      return sim()
        .filter((r) => codes.includes(r.routed_department))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }
    return data;
  } catch {
    setLink('offline');
    return sim()
      .filter((r) => codes.includes(r.routed_department))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
}

/** Every report (admin console) — still identity-free columns only. */
export async function fetchAllReports() {
  try {
    const { data, error } = await client
      .from('citizen_reports')
      .select(DEPT_SAFE_COLUMNS)
      .order('timestamp', { ascending: false });
    if (error) throw error;
    setLink('live');
    if (!data || data.length === 0) {
      return sim().slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }
    return data;
  } catch {
    setLink('offline');
    return sim().slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
}

export async function resolveReport(id) {
  if (linkStatus === 'offline') {
    const row = sim().find((r) => r.id === id);
    if (row) row.status = 'RESOLVED';
    return;
  }
  const { error } = await client
    .from('citizen_reports')
    .update({ status: 'RESOLVED' })
    .eq('id', id);
  if (error) throw error;
}
