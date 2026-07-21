/**
 * Master Console — the concentrated cross-department view: city totals,
 * per-department pressure (total/open/breached/escalated/resolved), and one
 * escalation feed (SLA breaches + escalation_required together, worst
 * first). Reads the same identity-free columns as every desk.
 */

import { DEPARTMENTS, reportBelongsTo } from './config/registry.js';
import { fetchAllReports } from './core/supabase.js';
import { computeSla } from './core/sla.js';
import { SHIELD_MARK, glyphFor } from './ui/glyphs.js';
import { el, esc, startClock, initLinkDot, slaChip, escalationChip } from './ui/common.js';

document.getElementById('brand-mark').innerHTML = SHIELD_MARK;
startClock();
initLinkDot();

function deptStats(reports, dept) {
  const mine = reports.filter((r) => reportBelongsTo(r, dept));
  const active = mine.filter((r) => r.status !== 'RESOLVED');
  return {
    dept,
    total: mine.length,
    active: active.length,
    resolved: mine.length - active.length,
    breached: active.filter((r) => computeSla(r, dept)?.isBreached).length,
    escalated: active.filter((r) => r.escalation_required).length,
  };
}

const PRIO_RANK = { CRITICAL: 3, HIGH: 2, NORMAL: 1, MEDIUM: 1, LOW: 0 };

async function load() {
  const reports = await fetchAllReports();
  el('reports-loading').classList.add('hidden');

  /* city totals */
  const active = reports.filter((r) => r.status !== 'RESOLVED');
  const breachedAll = active.filter((r) => computeSla(r)?.isBreached);
  const escalatedAll = active.filter((r) => r.escalation_required);
  el('t-total').textContent = reports.length;
  el('t-active').textContent = active.length;
  el('t-breached').textContent = breachedAll.length;
  el('t-escalated').textContent = escalatedAll.length;
  el('t-resolved').textContent = reports.length - active.length;

  /* pressure grid, sorted by breaches desc then open load */
  const stats = DEPARTMENTS.map((d) => deptStats(reports, d))
    .sort((a, b) => (b.breached - a.breached) || (b.active - a.active));

  el('pressure-grid').innerHTML = stats.map((s) => `
    <div class="pressure-card ${s.breached > 0 ? 'is-hot' : ''}">
      <div class="pressure-top">
        <span class="pressure-glyph">${glyphFor(s.dept.id)}</span>
        <span class="pressure-name grow">${esc(s.dept.name)}</span>
        <a class="pressure-open" href="dashboard.html?dept=${s.dept.id}">open →</a>
      </div>
      <div class="pressure-nums">
        <span class="pnum"><b>${s.total}</b><span>Total</span></span>
        <span class="pnum"><b>${s.active}</b><span>Open</span></span>
        <span class="pnum p-alarm"><b>${s.breached}</b><span>Breached</span></span>
        <span class="pnum p-alarm"><b>${s.escalated}</b><span>Escalated</span></span>
        <span class="pnum"><b>${s.resolved}</b><span>Resolved</span></span>
      </div>
    </div>
  `).join('');

  /* escalation feed — breaches + escalations, worst first */
  const owner = (r) => DEPARTMENTS.find((d) => reportBelongsTo(r, d)) || null;
  const feed = active
    .map((r) => ({ r, dept: owner(r) }))
    .map((x) => ({ ...x, sla: computeSla(x.r, x.dept) }))
    .filter((x) => x.sla?.isBreached || x.r.escalation_required)
    .sort((a, b) =>
      (Number(b.sla?.isBreached) - Number(a.sla?.isBreached)) ||
      ((PRIO_RANK[b.r.routing_priority] ?? 1) - (PRIO_RANK[a.r.routing_priority] ?? 1)))
    .slice(0, 40);

  el('escalation-feed').innerHTML = feed.length === 0
    ? `<p class="empty-view" style="padding:var(--s-8) 0">
         <span class="display" style="font-size:var(--text-h2)">City queues healthy.</span><br>
         No breaches or escalations anywhere on the grid.
       </p>`
    : feed.map(({ r, dept, sla }, i) => `
      <article class="ledger-row feed-row">
        <div class="stack-2">
          <div class="row-wrap">
            <span class="idx">${String(i + 1).padStart(2, '0')}</span>
            <span class="chip chip-dept">${dept ? esc(dept.name) : esc(r.routed_department || '—')}</span>
            <span class="feed-title">${esc(r.title || 'Untitled report')}</span>
          </div>
          <p class="ledger-desc">${esc(r.description || '')}</p>
        </div>
        <div class="ledger-side" style="flex-direction:row;align-items:center">
          ${escalationChip(r)}
          ${slaChip(sla)}
          ${dept ? `<a class="pressure-open" href="dashboard.html?dept=${dept.id}">view →</a>` : ''}
        </div>
      </article>
    `).join('');
}

load();
setInterval(load, 120000); // refresh the whole picture every 2 minutes
