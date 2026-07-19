/**
 * Portal page — hero line reveal, live city ticker, and the numbered desk
 * register rendered from the department registry (build-spec principle #3:
 * one shell, config-driven).
 */

import { DEPARTMENTS, reportBelongsTo } from './config/registry.js';
import { fetchAllReports } from './core/supabase.js';
import { computeSla } from './core/sla.js';
import { SHIELD_MARK, glyphFor } from './ui/glyphs.js';
import { el, esc, startClock, initReveals, initLinkDot } from './ui/common.js';

document.getElementById('brand-mark').innerHTML = SHIELD_MARK;
startClock();
initLinkDot();
initReveals();

/* hero line reveal (CSS-transition based; respects reduced motion) */
const lines = document.querySelectorAll('.hero-title .line > span');
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  lines.forEach((l) => { l.style.transform = 'none'; });
} else {
  lines.forEach((l, i) => {
    l.style.transform = 'translateY(110%)';
    l.style.transition = `transform .8s cubic-bezier(.22,.61,.36,1) ${0.15 + i * 0.13}s`;
    requestAnimationFrame(() => requestAnimationFrame(() => { l.style.transform = 'translateY(0)'; }));
  });
}

/* desk register */
const floorNote = (d) =>
  d.minPriority === 'CRITICAL' ? 'SLA floor: 15-minute tier'
  : d.minPriority === 'HIGH' ? 'SLA floor: 4-hour tier'
  : 'SLA by classified priority';

el('desk-list').innerHTML = DEPARTMENTS.map((d, i) => `
  <a class="desk-row reveal" href="dashboard.html?dept=${d.id}">
    <span class="idx">${String(i + 1).padStart(2, '0')}</span>
    <span class="desk-glyph">${glyphFor(d.id)}</span>
    <span class="grow">
      <span class="desk-name">${esc(d.name)}</span>
      <span class="desk-handles" style="display:block">${esc(d.handles.slice(0, 2).join(' · '))} — ${floorNote(d)}</span>
    </span>
    <span class="desk-open">Open desk →</span>
  </a>
`).join('');
initReveals();

/* live city ticker */
(async () => {
  const reports = await fetchAllReports();
  const owner = (r) => DEPARTMENTS.find((d) => reportBelongsTo(r, d)) || null;
  const active = reports.filter((r) => r.status !== 'RESOLVED');
  const breached = active.filter((r) => computeSla(r, owner(r))?.isBreached);
  const setNum = (id, n) => { el(id).textContent = n.toLocaleString('en-IN'); };
  setNum('tick-total', reports.length);
  setNum('tick-open', active.length);
  setNum('tick-breached', breached.length);
  setNum('tick-resolved', reports.length - active.length);
})();
