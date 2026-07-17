/**
 * The ONE department dashboard shell (build spec principle #3).
 * Which department it shows is decided entirely by ?dept=<id> + its config —
 * queue, SLA badges, escalation flags, and resolve action are identical for
 * all 10 departments.
 */

import { getDepartment } from './config/registry.js';
import { reportBelongsTo } from './config/registry.js';
import { fetchReportsByCodes, resolveReport } from './core/supabase.js';
import { computeSla } from './core/sla.js';

const deptId = new URLSearchParams(location.search).get('dept');
const dept = getDepartment(deptId);

let activeReports = [];

function el(id) { return document.getElementById(id); }

async function load() {
  if (!dept) {
    el('active-dept-name').innerText = 'Unknown department';
    el('reports-loading').classList.add('hidden');
    el('reports-empty').classList.remove('hidden');
    return;
  }
  el('active-dept-name').innerText = `${dept.icon} ${dept.name}`;
  document.title = `KAWACH: ${dept.name}`;

  try {
    const rows = await fetchReportsByCodes(dept.matchCodes);
    activeReports = rows.filter(r => reportBelongsTo(r, dept));
    render();
  } catch (err) {
    console.error('[DEPT] Fetch failed:', err);
    alert('Failed to retrieve incident reports: ' + err.message);
  } finally {
    el('reports-loading').classList.add('hidden');
  }
}

function render() {
  const total = activeReports.length;
  const active = activeReports.filter(r => r.status !== 'RESOLVED');
  const breached = active.filter(r => computeSla(r, dept)?.isBreached);

  el('stats-total').innerText = total;
  el('stats-active').innerText = active.length;
  el('stats-breached').innerText = breached.length;
  el('stats-resolved').innerText = total - active.length;

  const listEl = el('reports-list');
  listEl.innerHTML = '';
  el('reports-empty').classList.toggle('hidden', total > 0);

  activeReports.forEach(report => {
    const isResolved = report.status === 'RESOLVED';
    const sla = computeSla(report, dept);
    const prio = sla?.priority || report.routing_priority || 'NORMAL';

    const slaBadge = sla
      ? `<span class="badge ${sla.isBreached ? 'sla-breached' : 'sla-ok'}">${sla.isBreached ? '🚨 ' : '⏳ '}${sla.label}</span>`
      : '';
    const escalationBadge = report.escalation_required
      ? `<span class="badge sla-breached" style="animation:none;">⬆ ESCALATED</span>` : '';

    const card = document.createElement('div');
    card.className = 'report-card';
    card.innerHTML = `
      <div class="report-top">
        <div class="report-info">
          <h4>${report.title || 'Civic Safety Issue'}</h4>
          <p class="report-desc">${report.description || 'No description provided.'}</p>
          <div class="badge-row">
            <span class="badge prio-${prio.toLowerCase()}">Priority: ${prio}</span>
            <span class="badge ${isResolved ? 'status-resolved' : 'status-pending'}">
              ${isResolved ? '✓ Resolved' : '⚡ Active Alert'}
            </span>
            ${escalationBadge}
            ${slaBadge}
          </div>
        </div>
        ${report.video_url ? `
          <div class="video-preview-box">
            <video src="${report.video_url}" controls playsinline muted></video>
          </div>` : ''}
      </div>
      <div class="report-bottom">
        <div class="meta-group">
          <span><strong>Category:</strong> ${report.sub_category || report.category || 'General'}</span>
          <span>•</span>
          <span><strong>📍</strong> ${report.lat?.toFixed(5)}, ${report.lng?.toFixed(5)}</span>
          <span>•</span>
          <span><strong>⏱️</strong> ${report.timestamp ? new Date(report.timestamp).toLocaleString() : 'Just now'}</span>
        </div>
        ${!isResolved ? `
          <button class="btn-resolve-issue" data-resolve="${report.id}">
            <i data-lucide="check"></i> Mark Resolved
          </button>` : `
          <span style="font-size: 11px; font-weight: 800; color: #10b981;">✓ Completed &amp; Closed</span>`}
      </div>`;
    listEl.appendChild(card);
  });

  listEl.querySelectorAll('[data-resolve]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-resolve');
      try {
        await resolveReport(id);
        activeReports = activeReports.map(r => r.id === id ? { ...r, status: 'RESOLVED' } : r);
        render();
      } catch (err) {
        alert('Failed to resolve report: ' + err.message);
      }
    });
  });

  lucide.createIcons();
}

load();
// Live SLA countdowns: refresh badges every 60s without refetching
setInterval(() => { if (activeReports.length) render(); }, 60000);
