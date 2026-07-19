/**
 * Bespoke KAWACH glyph set — hand-drawn geometric line marks derived from the
 * shield/chevron brand motif. No third-party icon pack; every mark shares the
 * same 24×24 grid, 1.6 stroke, and a small chevron flourish.
 */

const S = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square"';

/** The KAWACH shield mark (brand). */
export const SHIELD_MARK = `
<svg viewBox="0 0 24 28" ${S} aria-hidden="true">
  <path d="M12 2 L22 6 V14 C22 21 17.5 25 12 27 C6.5 25 2 21 2 14 V6 Z"/>
  <path d="M7 12 L12 17 L17 12"/>
  <path d="M7 8.5 L12 13.5 L17 8.5" opacity="0.45"/>
</svg>`;

/** Department glyphs keyed by config id. */
export const DEPT_GLYPHS = {
  'pwd-roads': `
    <svg viewBox="0 0 24 24" ${S} aria-hidden="true">
      <path d="M8 21 L11 3 M16 21 L13 3"/>
      <path d="M12 6 V8 M12 11 V13 M12 16 V18" stroke-dasharray="none"/>
      <path d="M3 21 H21"/>
    </svg>`,
  'pwd-buildings': `
    <svg viewBox="0 0 24 24" ${S} aria-hidden="true">
      <path d="M4 21 V8 H11 V21 M14 21 V4 H20 V21 M2 21 H22"/>
      <path d="M6.5 11 H8.5 M6.5 14.5 H8.5 M16 7.5 H18 M16 11 H18 M16 14.5 H18"/>
    </svg>`,
  'electricity': `
    <svg viewBox="0 0 24 24" ${S} aria-hidden="true">
      <path d="M13 2 L6 13 H11 L9.5 22 L18 10 H12.5 Z"/>
    </svg>`,
  'water': `
    <svg viewBox="0 0 24 24" ${S} aria-hidden="true">
      <path d="M12 2 C12 2 5 10.5 5 15 A7 7 0 0 0 19 15 C19 10.5 12 2 12 2 Z"/>
      <path d="M9 15 A3 3 0 0 0 12 18" opacity="0.45"/>
    </svg>`,
  'sanitation': `
    <svg viewBox="0 0 24 24" ${S} aria-hidden="true">
      <path d="M5 7 H19 L17.5 21 H6.5 Z"/>
      <path d="M9 7 V4.5 H15 V7 M3 7 H21"/>
      <path d="M10 11 V17 M14 11 V17"/>
    </svg>`,
  'pollution-noise': `
    <svg viewBox="0 0 24 24" ${S} aria-hidden="true">
      <path d="M4 14 C6 11 8 11 10 14 C12 17 14 17 16 14 C18 11 20 11 22 14" opacity="0.45"/>
      <path d="M2 10 C4 7 6 7 8 10 C10 13 12 13 14 10 C16 7 18 7 20 10"/>
      <path d="M6 19 H18" stroke-dasharray="2 3"/>
    </svg>`,
  'traffic': `
    <svg viewBox="0 0 24 24" ${S} aria-hidden="true">
      <rect x="8" y="2" width="8" height="20" rx="1"/>
      <circle cx="12" cy="6.5" r="1.6"/>
      <circle cx="12" cy="12" r="1.6" opacity="0.45"/>
      <circle cx="12" cy="17.5" r="1.6"/>
    </svg>`,
  'fire': `
    <svg viewBox="0 0 24 24" ${S} aria-hidden="true">
      <path d="M12 2 C14 6 18 8 18 14 A6 6 0 0 1 6 14 C6 10 9 7.5 12 2 Z"/>
      <path d="M12 12 C13 14 14.5 14.5 14.5 16.5 A2.5 2.5 0 0 1 9.5 16.5 C9.5 15 11 14 12 12 Z" opacity="0.45"/>
    </svg>`,
  'health': `
    <svg viewBox="0 0 24 24" ${S} aria-hidden="true">
      <path d="M9.5 3 H14.5 V9.5 H21 V14.5 H14.5 V21 H9.5 V14.5 H3 V9.5 H9.5 Z"/>
    </svg>`,
  'education': `
    <svg viewBox="0 0 24 24" ${S} aria-hidden="true">
      <path d="M12 4 L2 8.5 L12 13 L22 8.5 Z"/>
      <path d="M6 11 V16 C6 16 8.5 18.5 12 18.5 C15.5 18.5 18 16 18 16 V11"/>
      <path d="M22 8.5 V14" opacity="0.45"/>
    </svg>`,
  'police': `
    <svg viewBox="0 0 24 24" ${S} aria-hidden="true">
      <path d="M12 2 L21 5.5 V12 C21 18 17 21.5 12 23 C7 21.5 3 18 3 12 V5.5 Z"/>
      <path d="M12 8 L13.2 10.6 L16 10.9 L14 12.9 L14.5 15.7 L12 14.3 L9.5 15.7 L10 12.9 L8 10.9 L10.8 10.6 Z" opacity="0.55"/>
    </svg>`,
};

/** Small utility marks. */
export const MARKS = {
  arrowRight: `<svg viewBox="0 0 24 24" ${S} style="width:1em;height:1em" aria-hidden="true"><path d="M3 12 H20 M14 6 L20 12 L14 18"/></svg>`,
  arrowLeft: `<svg viewBox="0 0 24 24" ${S} style="width:1em;height:1em" aria-hidden="true"><path d="M21 12 H4 M10 6 L4 12 L10 18"/></svg>`,
  escalate: `<svg viewBox="0 0 24 24" ${S} style="width:1em;height:1em" aria-hidden="true"><path d="M12 20 V5 M6 11 L12 5 L18 11"/></svg>`,
  check: `<svg viewBox="0 0 24 24" ${S} style="width:1em;height:1em" aria-hidden="true"><path d="M4 12.5 L10 18.5 L20 6"/></svg>`,
};

export function glyphFor(deptId) {
  return DEPT_GLYPHS[deptId] || SHIELD_MARK;
}
