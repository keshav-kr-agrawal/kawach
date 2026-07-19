/**
 * SLA & Escalation Engine — SHARED infrastructure (build spec §6.3).
 * Every department dashboard and the admin console use this one module;
 * never re-implement SLA math per department.
 *
 * Tiers: CRITICAL 15 min · HIGH 4 h · NORMAL/MEDIUM 24 h · LOW 72 h.
 */

export const SLA_MINUTES = {
  CRITICAL: 15,
  HIGH: 240,
  NORMAL: 1440,
  MEDIUM: 1440,
  LOW: 4320,
};

const PRIORITY_RANK = { CRITICAL: 3, HIGH: 2, NORMAL: 1, MEDIUM: 1, LOW: 0 };

/**
 * A department config may set `minPriority` (e.g. Fire = CRITICAL: "always
 * routed through the highest SLA priority"). The effective priority is the
 * stronger of the report's own priority and the department floor.
 */
export function effectivePriority(report, dept) {
  const own = (report.routing_priority || 'NORMAL').toUpperCase();
  const floor = (dept?.minPriority || 'LOW').toUpperCase();
  return (PRIORITY_RANK[own] ?? 1) >= (PRIORITY_RANK[floor] ?? 0) ? own : floor;
}

export function computeSla(report, dept = null) {
  if (!report.timestamp || report.status === 'RESOLVED') return null;
  const prio = effectivePriority(report, dept);
  const slaMinutes = SLA_MINUTES[prio] ?? SLA_MINUTES.NORMAL;
  const deadline = new Date(report.timestamp).getTime() + slaMinutes * 60 * 1000;
  const remainingMs = deadline - Date.now();
  return {
    priority: prio,
    isBreached: remainingMs < 0,
    remainingMs,
    label: remainingMs < 0
      ? `SLA BREACHED ${formatDuration(-remainingMs)} ago`
      : `SLA: ${formatDuration(remainingMs)} left`,
  };
}

export function formatDuration(ms) {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}

/** Escalation states for badges/feeds (escalated = flagged for oversight). */
export function escalationState(report, dept = null) {
  const sla = computeSla(report, dept);
  return {
    isEscalated: !!report.escalation_required,
    isBreached: !!sla?.isBreached,
    sla,
  };
}
