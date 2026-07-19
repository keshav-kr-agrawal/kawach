/**
 * Shared UI helpers for the department-side pages.
 * Citizen-authored text (title/description) is UNTRUSTED — always pipe it
 * through esc() before it touches innerHTML.
 */

import { computeSla } from '../core/sla.js';
import { onLinkStatus } from '../core/supabase.js';
import { MARKS } from './glyphs.js';

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function el(id) { return document.getElementById(id); }

/** Severity chip — darkness within the single accent hue encodes priority. */
export function priorityChip(prio) {
  const p = (prio || 'NORMAL').toUpperCase();
  const cls = { CRITICAL: 'chip-critical', HIGH: 'chip-high', LOW: 'chip-low' }[p] || 'chip-normal';
  return `<span class="chip ${cls}">${esc(p)}</span>`;
}

export function slaChip(sla) {
  if (!sla) return '';
  return sla.isBreached
    ? `<span class="chip chip-breach"><span class="pulse-dot"></span>${esc(sla.label)}</span>`
    : `<span class="chip chip-ok">${esc(sla.label)}</span>`;
}

export function escalationChip(report) {
  return report.escalation_required
    ? `<span class="chip chip-escalated">${MARKS.escalate} Escalated</span>`
    : '';
}

export function statusChip(report) {
  return report.status === 'RESOLVED'
    ? `<span class="chip chip-resolved">${MARKS.check} Resolved</span>`
    : `<span class="chip chip-active">Open</span>`;
}

export function slaFor(report, dept = null) { return computeSla(report, dept); }

/** IST-flavoured console clock, ticking each second into #topbar-clock. */
export function startClock() {
  const node = document.getElementById('topbar-clock');
  if (!node) return;
  const tick = () => {
    const now = new Date();
    node.textContent = now.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).toUpperCase();
  };
  tick();
  setInterval(tick, 1000);
}

/**
 * Data-link dot (#link-dot): green = live Supabase, red = local simulation.
 * The dot is the single honest tell when the page is running simulated data.
 */
export function initLinkDot() {
  const node = document.getElementById('link-dot');
  if (!node) return;
  onLinkStatus((status) => {
    node.className = `link-dot ${status === 'live' ? 'is-live' : status === 'offline' ? 'is-offline' : ''}`;
    node.title =
      status === 'live' ? 'Data link: live Supabase'
      : status === 'offline' ? 'Data link: down — running local simulation'
      : 'Data link: connecting…';
  });
}

/** Lightweight scroll-reveal for .reveal nodes (respects reduced motion). */
export function initReveals() {
  const nodes = document.querySelectorAll('.reveal');
  if (!nodes.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    nodes.forEach(n => n.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  nodes.forEach(n => io.observe(n));
}
