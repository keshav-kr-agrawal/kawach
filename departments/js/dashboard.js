/**
 * The ONE department desk shell (build spec principle #3).
 * Which desk it shows is decided entirely by ?dept=<id> + its config —
 * queue, SLA chips, escalation flags, and resolve action are identical
 * for all eleven departments. SLA math lives ONLY in core/sla.js.
 */

import { getDepartment, reportBelongsTo, DEPARTMENTS } from './config/registry.js';
import { fetchReportsByCodes, resolveReport } from './core/supabase.js';
import { computeSla } from './core/sla.js';
import { SHIELD_MARK, glyphFor, MARKS } from './ui/glyphs.js';
import {
  el, esc, startClock, initLinkDot, priorityChip, slaChip, escalationChip, statusChip,
} from './ui/common.js';

document.getElementById('brand-mark').innerHTML = SHIELD_MARK;
startClock();
initLinkDot();

const deptId = new URLSearchParams(location.search).get('dept');
const dept = getDepartment(deptId);

const FILTERS = ['All', 'Open', 'Breached', 'Resolved'];
let filter = 'All';
let reports = [];

function bucket(r) {
  if (r.status === 'RESOLVED') return 'Resolved';
  return computeSla(r, dept)?.isBreached ? 'Breached' : 'Open';
}

function renderTabs() {
  const counts = { All: reports.length, Open: 0, Breached: 0, Resolved: 0 };
  reports.forEach((r) => { counts[bucket(r)] += 1; });
  el('filter-tabs').innerHTML = FILTERS.map((f) => `
    <button class="tab ${filter === f ? 'is-active' : ''}" data-filter="${f}">
      ${f}<span class="tab-count">${counts[f]}</span>
    </button>
  `).join('');
  el('filter-tabs').querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => { filter = btn.dataset.filter; render(); });
  });
}

function render() {
  const active = reports.filter((r) => r.status !== 'RESOLVED');
  el('stat-total').textContent = reports.length;
  el('stat-active').textContent = active.length;
  el('stat-breached').textContent = active.filter((r) => computeSla(r, dept)?.isBreached).length;
  el('stat-resolved').textContent = reports.length - active.length;

  renderTabs();

  const visible = filter === 'All' ? reports : reports.filter((r) => bucket(r) === filter);
  el('reports-empty').classList.toggle('hidden', visible.length > 0);

  el('reports-list').innerHTML = visible.map((r, i) => {
    const sla = computeSla(r, dept);
    const prio = sla?.priority || r.routing_priority || 'NORMAL';
    const resolved = r.status === 'RESOLVED';
    return `
      <article class="ledger-row ${resolved ? 'is-resolved' : ''}">
        <div class="stack-2">
          <div class="row-wrap">
            <span class="idx">${String(i + 1).padStart(2, '0')}</span>
            <h3 class="ledger-title">${esc(r.title || 'Civic safety report')}</h3>
          </div>
          <p class="ledger-desc">${esc(r.description || 'No description provided.')}</p>
          <div class="row-wrap">
            ${priorityChip(prio)}
            ${statusChip(r)}
            ${escalationChip(r)}
            ${slaChip(sla)}
          </div>
          <div class="ledger-meta">
            <span>${esc(r.sub_category || r.category || 'General')}</span>
            <span>${r.lat != null ? `${Number(r.lat).toFixed(4)}, ${Number(r.lng).toFixed(4)}` : 'no location'}</span>
            <span>${r.timestamp ? new Date(r.timestamp).toLocaleString('en-IN') : 'just now'}</span>
            ${r.ai_verdict ? `<span>verdict: ${esc(r.ai_verdict)} · trust ${Math.round(r.trust_score ?? 0)}</span>` : ''}
          </div>
        </div>
        <div class="ledger-side">
          ${r.video_url ? `<div class="evidence-box"><video src="${esc(r.video_url)}" controls playsinline muted></video></div>` : ''}
          ${!resolved
            ? `<button class="btn-resolve" data-resolve="${esc(r.id)}">${MARKS.check} Mark resolved</button>`
            : `<span class="label">Completed & closed</span>`}
        </div>
      </article>`;
  }).join('');

  el('reports-list').querySelectorAll('[data-resolve]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        const id = btn.getAttribute('data-resolve');
        await resolveReport(id);
        reports = reports.map((r) => (String(r.id) === id ? { ...r, status: 'RESOLVED' } : r));
        render();
      } catch (err) {
        btn.disabled = false;
        alert('Failed to resolve report: ' + err.message);
      }
    });
  });
}

async function load() {
  if (!dept) {
    el('dept-name').textContent = 'Unknown desk';
    el('reports-loading').classList.add('hidden');
    el('reports-empty').classList.remove('hidden');
    el('dept-kicker').textContent = 'Pick a desk from the register';
    return;
  }
  document.title = `KAWACH — ${dept.name}`;
  const idx = DEPARTMENTS.findIndex((d) => d.id === dept.id) + 1;
  el('dept-glyph').innerHTML = glyphFor(dept.id);
  el('dept-kicker').textContent = `Desk ${String(idx).padStart(2, '0')} of ${DEPARTMENTS.length} · codes: ${dept.matchCodes.join(', ')}`;
  el('dept-name').textContent = dept.name;
  el('dept-floor').textContent =
    dept.minPriority === 'CRITICAL' ? 'SLA floor: every report enters the 15-minute tier'
    : dept.minPriority === 'HIGH' ? 'SLA floor: 4-hour tier or better'
    : 'SLA follows classified priority';

  const rows = await fetchReportsByCodes(dept.matchCodes);
  reports = rows.filter((r) => reportBelongsTo(r, dept));
  el('reports-loading').classList.add('hidden');
  render();
}

load();
// Live SLA countdowns: re-render chips every 60s without refetching.
setInterval(() => { if (reports.length) render(); }, 60000);
