/**
 * Video Upload & AI Moderation State Machine
 * 
 * Flow:
 * AI_CHECK_1 -> COHORT_TEST -> PUBLIC_APPROVED
 *                          \-> REPORTED_SUSPICIOUS -> AI_CHECK_2 -> PUBLIC_APPROVED/REJECTED
 */

export const VIDEO_STATUS = {
  AI_CHECK_1: 'AI_CHECK_1',
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
      return '#06b6d4'; // neon cyan
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

// Simulated workflow progression
export const simulateWorkflowProgress = (video, onUpdate) => {
  let currentStatus = video.status;

  const interval = setInterval(() => {
    if (currentStatus === VIDEO_STATUS.AI_CHECK_1) {
      currentStatus = VIDEO_STATUS.COHORT_TEST;
      onUpdate({ ...video, status: currentStatus });
    } else if (currentStatus === VIDEO_STATUS.COHORT_TEST) {
      // 80% chance of approval, 20% flagged
      currentStatus = Math.random() > 0.2 ? VIDEO_STATUS.PUBLIC_APPROVED : VIDEO_STATUS.REPORTED_SUSPICIOUS;
      onUpdate({ ...video, status: currentStatus });
    } else if (currentStatus === VIDEO_STATUS.REPORTED_SUSPICIOUS) {
      currentStatus = VIDEO_STATUS.AI_CHECK_2;
      onUpdate({ ...video, status: currentStatus });
    } else if (currentStatus === VIDEO_STATUS.AI_CHECK_2) {
      // AI check 2 determines final verdict
      currentStatus = Math.random() > 0.3 ? VIDEO_STATUS.PUBLIC_APPROVED : VIDEO_STATUS.REJECTED;
      onUpdate({ ...video, status: currentStatus });
      clearInterval(interval);
    } else {
      clearInterval(interval);
    }
  }, 4000); // Progress states every 4 seconds for immediate visualization in the prototype

  return () => clearInterval(interval);
};
