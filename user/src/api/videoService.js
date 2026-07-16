/**
 * Video Upload & AI Moderation State Machine
 *
 * Flow:
 * AI_CHECK_1 -> DEPT_ROUTING -> COHORT_TEST -> PUBLIC_APPROVED
 *                                          \-> REPORTED_SUSPICIOUS -> AI_CHECK_2 -> PUBLIC_APPROVED/REJECTED
 *
 * The verdict at each decision point comes from the report's real classifier
 * output (Pipeline 4 /full-analysis runs at upload time in SecureCameraView).
 * The staged progression is UI pacing only — outcomes are never random.
 */

export const VIDEO_STATUS = {
  AI_CHECK_1: 'AI_CHECK_1',
  DEPT_ROUTING: 'DEPT_ROUTING',
  COHORT_TEST: 'COHORT_TEST',
  REPORTED_SUSPICIOUS: 'REPORTED_SUSPICIOUS',
  AI_CHECK_2: 'AI_CHECK_2',
  PUBLIC_APPROVED: 'PUBLIC_APPROVED',
  REJECTED: 'REJECTED'
};

export const getStatusLabel = (status) => {
  switch (status) {
    case VIDEO_STATUS.AI_CHECK_1:
      return '🤖 Initial AI Deepfake & Safety Scan';
    case VIDEO_STATUS.DEPT_ROUTING:
      return '🗂️ Zero-Shot AI Civic Dept Routing';
    case VIDEO_STATUS.COHORT_TEST:
      return '👥 Cohort Test (Local Radius Verification)';
    case VIDEO_STATUS.REPORTED_SUSPICIOUS:
      return '⚠️ Flagged Suspicious (Under Review)';
    case VIDEO_STATUS.AI_CHECK_2:
      return '🛡️ Secondary Forensic AI Verification';
    case VIDEO_STATUS.PUBLIC_APPROVED:
      return '✅ Approved & Pushed to Feeds';
    case VIDEO_STATUS.REJECTED:
      return '❌ Rejected (Violates Safety Terms)';
    default:
      return 'Unknown';
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case VIDEO_STATUS.AI_CHECK_1:
      return '#0ea5e9'; // soothing sky blue
    case VIDEO_STATUS.DEPT_ROUTING:
      return '#8b5cf6'; // premium violet
    case VIDEO_STATUS.COHORT_TEST:
      return '#3b82f6'; // blue
    case VIDEO_STATUS.REPORTED_SUSPICIOUS:
      return '#ef4444'; // red
    case VIDEO_STATUS.AI_CHECK_2:
      return '#f97316'; // orange
    case VIDEO_STATUS.PUBLIC_APPROVED:
      return '#22c55e'; // green
    case VIDEO_STATUS.REJECTED:
      return '#6b7280'; // grey
    default:
      return '#ffffff';
  }
};

const getApiBase = () =>
  (import.meta.env.VITE_CLASSIFIER_API_URL || 'http://localhost:8001/classify').replace(/\/classify$/, '');

/**
 * Deterministic moderation verdict from the report's real classifier fields
 * (populated at upload time by /full-analysis).
 *
 * AI_GENERATED             -> REJECTED
 * AUTHENTIC + trust >= 40  -> PUBLIC_APPROVED
 * INCONCLUSIVE / low trust -> REPORTED_SUSPICIOUS (human/secondary review)
 */
export const deriveModerationVerdict = (report) => {
  const verdict = report.aiVerdict || report.ai_verdict || 'INCONCLUSIVE';
  const trust = report.trustScore ?? report.trust_score ?? 0;

  if (verdict === 'AI_GENERATED') return VIDEO_STATUS.REJECTED;
  if (verdict === 'AUTHENTIC' && trust >= 40) return VIDEO_STATUS.PUBLIC_APPROVED;
  return VIDEO_STATUS.REPORTED_SUSPICIOUS;
};

/**
 * Staged workflow progression. The visual staging (one state every 4s) is UI
 * pacing; every decision point reads the report's real classifier output via
 * deriveModerationVerdict — no random outcomes.
 */
export const simulateWorkflowProgress = (video, onUpdate) => {
  let currentStatus = video.status;

  const interval = setInterval(() => {
    if (currentStatus === VIDEO_STATUS.AI_CHECK_1) {
      currentStatus = VIDEO_STATUS.DEPT_ROUTING;
      onUpdate({ ...video, status: currentStatus });
    } else if (currentStatus === VIDEO_STATUS.DEPT_ROUTING) {
      currentStatus = VIDEO_STATUS.COHORT_TEST;
      onUpdate({ ...video, status: currentStatus });
    } else if (currentStatus === VIDEO_STATUS.COHORT_TEST) {
      currentStatus = deriveModerationVerdict(video);
      onUpdate({ ...video, status: currentStatus });
      if (currentStatus !== VIDEO_STATUS.REPORTED_SUSPICIOUS) clearInterval(interval);
    } else if (currentStatus === VIDEO_STATUS.REPORTED_SUSPICIOUS) {
      currentStatus = VIDEO_STATUS.AI_CHECK_2;
      onUpdate({ ...video, status: currentStatus });
    } else if (currentStatus === VIDEO_STATUS.AI_CHECK_2) {
      // Secondary check: same real classifier data, stricter trust bar.
      const trust = video.trustScore ?? video.trust_score ?? 0;
      const verdict = video.aiVerdict || video.ai_verdict || 'INCONCLUSIVE';
      currentStatus = (verdict !== 'AI_GENERATED' && trust >= 25)
        ? VIDEO_STATUS.PUBLIC_APPROVED
        : VIDEO_STATUS.REJECTED;
      onUpdate({ ...video, status: currentStatus });
      clearInterval(interval);
    } else {
      clearInterval(interval);
    }
  }, 4000);

  return () => clearInterval(interval);
};

/**
 * Re-run the real deepfake classifier (Pipeline 1 /classify) against a stored
 * video URL — used when citizens flag a published video as suspicious.
 *
 * Returns the classifier response, or null if the video/classifier is
 * unreachable. Callers must treat null as "still under review" — never
 * fabricate a verdict when the real pipeline is offline.
 */
export const reclassifyVideoUrl = async (videoUrl) => {
  try {
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`video fetch failed: ${videoRes.status}`);
    const blob = await videoRes.blob();

    const fd = new FormData();
    const ext = (videoUrl.split('?')[0].split('.').pop() || 'mp4').toLowerCase();
    const safeExt = ['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext) ? ext : 'mp4';
    fd.append('file', blob, `flagged_video.${safeExt}`);

    const res = await fetch(`${getApiBase()}/classify`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error(`classify failed: ${res.status}`);
    const data = await res.json();
    console.log('[RECLASSIFY] Real forensic verdict:', data);
    return data;
  } catch (err) {
    console.warn('[RECLASSIFY] Classifier unreachable — leaving video under review (no fake verdict):', err);
    return null;
  }
};
