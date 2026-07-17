/**
 * Shared Supabase access for all department dashboards + admin.
 * Anonymity boundary: department-facing queries NEVER select uploader_uuid
 * or any identity field — only report content, location, and AI output.
 */

const supabaseUrl = localStorage.getItem('VITE_SUPABASE_URL') || 'https://jlqelkrfeksixxfkulwf.supabase.co';
const supabaseAnonKey = localStorage.getItem('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_tG7DDMyStV7t-zrEbRKtrA_hFnPJQIb';

// global `supabase` comes from the CDN script tag in each html page
export const client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

export const DEPT_SAFE_COLUMNS =
  'id, title, description, category, status, lat, lng, video_url, timestamp, ' +
  'routed_department, routing_priority, routing_reason, escalation_required, ' +
  'ai_verdict, confidence_level, trust_score, civic_urgency_score, sub_category, upvotes';

/** All reports routed to any of the given department codes, newest first. */
export async function fetchReportsByCodes(codes) {
  const { data, error } = await client
    .from('citizen_reports')
    .select(DEPT_SAFE_COLUMNS)
    .in('routed_department', codes)
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Every report (admin console) — still identity-free columns only. */
export async function fetchAllReports() {
  const { data, error } = await client
    .from('citizen_reports')
    .select(DEPT_SAFE_COLUMNS)
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function resolveReport(id) {
  const { error } = await client
    .from('citizen_reports')
    .update({ status: 'RESOLVED' })
    .eq('id', id);
  if (error) throw error;
}
