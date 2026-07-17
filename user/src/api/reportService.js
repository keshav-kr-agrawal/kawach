/**
 * THE single place a citizen_reports row is created.
 *
 * Report-creation invariant (audited 2026-07-17): exactly three triggers may
 * call this — camera capture (incl. Direct Dispatch), a Nayak-proposed report
 * the citizen explicitly confirmed, and the chat Emergency button. Nothing
 * auto-files. If you are adding a fourth caller, stop and check
 * plan/kawach_build_spec.md §3 first.
 */

import { supabase } from '../supabaseClient';

export const REPORT_SOURCES = {
  CAMERA: 'camera',
  NAYAK_CHAT: 'nayak_chat',
  CHAT_EMERGENCY: 'chat_emergency',
};

/**
 * Insert a report row. `report` uses the app's camelCase field names (same
 * shape SecureCameraView builds); this maps to the snake_case table columns.
 * Returns { ok, error } — the caller already has the full report object.
 */
export async function createReport(report) {
  const row = {
    id: report.id,
    title: report.title,
    description: report.description,
    category: report.category,
    uploader_uuid: report.uploaderUuid,
    status: report.status,
    lat: report.lat,
    lng: report.lng,
    video_url: report.videoUrl,
    emergency_override: report.emergencyOverride || false,
    trim_start: report.trimStart ?? null,
    trim_end: report.trimEnd ?? null,
    views: report.views || 0,
    upvotes: report.upvotes || 0,
    timestamp: new Date().toISOString(),
    routed_department: report.routedDepartment || null,
    routing_priority: report.routingPriority || null,
    routing_reason: report.routingReason || null,
    escalation_required: report.escalationRequired || false,
    ai_verdict: report.aiVerdict || null,
    fake_prob: report.fakeProb ?? null,
    confidence_level: report.confidenceLevel || null,
    faces_detected: report.facesDetected ?? null,
    sub_category: report.subCategory || null,
    estimated_resolution_days: report.estimatedResolutionDays ?? null,
    trust_score: report.trustScore ?? null,
    civic_urgency_score: report.civicUrgencyScore ?? null,
    scene_detected: report.sceneDetected ?? null,
    detected_issues: report.detectedIssues || null,
    temporal_consistency: report.temporalConsistency ?? null,
    dominant_class: report.dominantClass || null,
  };
  // Provenance fields — only sent when present so the insert still works if
  // the Supabase table hasn't had the columns added yet (see master plan
  // manual step: ALTER TABLE citizen_reports ADD COLUMN source text,
  // ADD COLUMN nayak_session_id text).
  if (report.source) row.source = report.source;
  if (report.nayakSessionId) row.nayak_session_id = report.nayakSessionId;

  try {
    let { error } = await supabase.from('citizen_reports').insert([row]);
    if (error && report.source && /column|schema/i.test(error.message || '')) {
      // Table missing the new provenance columns — retry without them rather
      // than losing the report. Log loudly so the schema gets fixed.
      console.warn('[REPORTS] Insert rejected provenance columns (%s) — retrying without. '
        + 'Run the ALTER TABLE from plan/kawach_master_plan.md.', error.message);
      delete row.source;
      delete row.nayak_session_id;
      ({ error } = await supabase.from('citizen_reports').insert([row]));
    }
    if (error) {
      console.error('[REPORTS] Error saving report:', error.message);
      return { ok: false, error };
    }
    console.log('[REPORTS] Report saved:', report.id, '(source:', report.source || 'camera', ')');
    return { ok: true, error: null };
  } catch (err) {
    console.error('[REPORTS] Exception during insert:', err);
    return { ok: false, error: err };
  }
}

/** Generate a report id in the same format the camera flow uses. */
export function newReportId() {
  return 'vid-' + Math.random().toString(36).substring(2, 10);
}
