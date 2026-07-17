/**
 * Master Admin console — the concentrated cross-department view:
 * per-department load (total/active/breached/escalated/resolved), city totals,
 * and one live escalation feed (SLA breaches + escalation_required together,
 * worst first). Reads the same identity-free columns as every dashboard.
 */

import { DEPARTMENTS, reportBelongsTo } from './config/registry.js';
import { fetchAllReports } from './core/supabase.js';
import { computeSla } from './core/sla.js';

function el(id) { return document.getElementById(id); }

function deptStats(reports, dept) {
  const mine = reports.filter(r => reportBelongsTo(r, dept));
  const active = mine.filter(r => r.status !== 'RESOLVED');
  return {
    dept,
    total: mine.length,
    active: active.length,
    resolved: mine.length - active.length,
    breached: active.filter(r => computeSla(r, dept)?.isBreached).length,
    escalated: active.filter(r => r.escalation_required).length,
  };
}

async function load() {
  let reports = [];
  try {
    reports = await fetchAllReports();
  } catch (err) {
    console.error('[ADMIN] Fetch failed:', err);
    el('reports-loading').innerHTML = `<span style="color:#ef4444;">Failed to load: ${err.message}</span>`;
    return;
  }
  el('reports-loading').classList.add('hidden');

  // ── City totals ──
  const active = reports.filter(r => r.status !== 'RESOLVED');
  const breachedAll = active.filter(r => computeSla(r)?.isBreached);
  const escalatedAll = active.filter(r => r.escalation_required);
  el('t-total').innerText = reports.length;
  el('t-active').innerText = active.length;
  el('t-breached').innerText = breachedAll.length;
  el('t-escalated').innerText = escalatedAll.length;
  el('t-resolved').innerText = reports.length - active.length;

  // ── Per-department concentration grid (sorted by pressure: breached desc) ──
  const stats = DEPARTMENTS.map(d => deptStats(reports, d))
    .sort((a, b) => (b.breached - a.breached) || (b.active - a.active));

  el('admin-grid').innerHTML = stats.map(s => `
    <div class="admin-dept-card">
      <h4>${s.dept.icon} ${s.dept.name}
        <a class="goto-link" href="dashboard.html?dept=${s.dept.id}">open →</a>
      </h4>
      <div class="admin-dept-nums">
        <span>Total<b>${s.total}</b></span>
        <span>Active<b>${s.active}</b></span>
        <span class="num-breached">Breached<b>${s.breached}</b></span>
        <span class="num-escalated">Escalated<b>${s.escalated}</b></span>
        <span class="num-resolved">Resolved<b>${s.resolved}</b></span>
      </div>
    </div>
  `).join('');

  // ── Live escalation feed: breaches + escalations, unresolved, worst first ──
  const prioRank = { CRITICAL: 3, HIGH: 2, NORMAL: 1, MEDIUM: 1, LOW: 0 };
  const feedItems = active
    .map(r => ({ r, sla: computeSla(r) }))
    .filter(x => x.sla?.isBreached || x.r.escalation_required)
    .sort((a, b) =>
      (Number(b.sla?.isBreached) - Number(a.sla?.isBreached)) ||
      ((prioRank[b.r.routing_priority] ?? 1) - (prioRank[a.r.routing_priority] ?? 1)))
    .slice(0, 40);

  el('escalation-feed').innerHTML = feedItems.length === 0
    ? `<div class="feed-row" style="justify-content:center;opacity:.7;">✓ No breaches or escalations — city queues healthy.</div>`
    : feedItems.map(({ r, sla }) => {
        const owner = DEPARTMENTS.find(d => reportBelongsTo(r, d));
        return `
        <div class="feed-row">
          <span class="dept-tag">${owner ? owner.icon + ' ' + owner.id : r.routed_department || '—'}</span>
          <span class="grow"><strong>${r.title || 'Untitled report'}</strong> — ${r.description || ''}</span>
          ${r.escalation_required ? '<span class="badge sla-breached" style="animation:none;">⬆ ESCALATED</span>' : ''}
          ${sla?.isBreached ? `<span class="badge sla-breached">🚨 ${sla.label}</span>` : `<span class="badge sla-ok">⏳ ${sla?.label || ''}</span>`}
          ${owner ? `<a class="goto-link" href="dashboard.html?dept=${owner.id}">view →</a>` : ''}
        </div>`;
      }).join('');

  lucide.createIcons();
}

load();
setInterval(load, 120000); // refresh the whole picture every 2 minutes
