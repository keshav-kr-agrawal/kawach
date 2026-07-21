/**
 * Shared console primitives — every view composes these so the whole
 * command surface reads as one system.
 */

import { motion } from 'framer-motion';
import { CheckGlyph, EscalateGlyph } from './glyphs.jsx';

export function ViewFrame({ kicker, title, titleEm, lede, aside, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
      className="flex flex-col gap-8"
    >
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-amber-200 pb-6">
        <div className="flex flex-col gap-2">
          {kicker && <p className="kicker">{kicker}</p>}
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink md:text-4xl">
            {title}{' '}
            {titleEm && <em className="font-light italic text-amber-700">{titleEm}</em>}
          </h1>
          {lede && <p className="max-w-xl text-sm text-ink-soft">{lede}</p>}
        </div>
        {aside}
      </header>
      {children}
    </motion.div>
  );
}

export function Panel({ title, tag, actions, children, className = '' }) {
  return (
    <section className={`panel flex flex-col ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 border-b border-amber-100 px-5 py-3.5">
          <div className="flex items-baseline gap-3">
            {title && <h3 className="font-display text-base font-medium text-ink">{title}</h3>}
            {tag && <span className="tag">{tag}</span>}
          </div>
          {actions}
        </div>
      )}
      <div className="flex-1 p-5">{children}</div>
    </section>
  );
}

export function StatTile({ label, value, hint, alarm = false }) {
  return (
    <div className={`flex flex-col gap-1 px-6 py-4 ${alarm ? 'bg-amber-50' : ''}`}>
      <span className="font-mono text-2xl font-semibold tabular-nums text-amber-950 md:text-3xl">
        {value}
      </span>
      <span className="tag">{label}</span>
      {hint && <span className="text-[0.7rem] text-ink-faint">{hint}</span>}
    </div>
  );
}

export function StatBand({ children }) {
  return (
    <div className="panel grid grid-cols-2 divide-x divide-amber-100 overflow-hidden md:grid-cols-4 lg:flex lg:[&>*]:flex-1">
      {children}
    </div>
  );
}

/** Severity chip — darkness within the amber hue + text, never color alone. */
export function SeverityChip({ level }) {
  const l = String(level || 'MEDIUM').toUpperCase();
  const cls =
    l === 'CRITICAL' ? 'chip-critical' :
    l === 'HIGH' ? 'chip-high' :
    l === 'LOW' ? 'chip-low' : 'chip-medium';
  return <span className={`chip ${cls}`}>{l}</span>;
}

export function StatusChip({ ok, okText = 'OK', badText = 'BREACHED', warn, warnText = 'WARNING' }) {
  if (ok) return <span className="chip chip-quiet"><CheckGlyph className="h-3 w-3" />{okText}</span>;
  if (warn) return <span className="chip chip-medium"><EscalateGlyph className="h-3 w-3" />{warnText}</span>;
  return <span className="chip chip-critical"><span className="pulse-dot" />{badText}</span>;
}

export function LoadingLine({ text = 'Querying command grid' }) {
  return (
    <div className="flex items-center gap-3 py-14 font-mono text-[0.68rem] uppercase tracking-tag text-amber-600">
      <motion.span
        className="h-px w-8 bg-amber-600"
        animate={{ scaleX: [0.2, 1, 0.2], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      {text}…
    </div>
  );
}

export function EmptyNote({ title = 'Nothing on record', note }) {
  return (
    <div className="flex flex-col items-start gap-1 py-12">
      <p className="font-display text-lg italic text-amber-600">{title}</p>
      {note && <p className="text-sm text-ink-faint">{note}</p>}
    </div>
  );
}

export function ErrorNote({ error, note }) {
  return (
    <div className="rounded-ledger border border-amber-500 bg-amber-50 px-4 py-3">
      <p className="font-mono text-[0.68rem] uppercase tracking-tag text-amber-800">
        Backend unreachable — degraded honestly, nothing fabricated
      </p>
      <p className="mt-1 text-sm text-ink-soft">{note || String(error?.message || error)}</p>
    </div>
  );
}

/** Numbered ledger row label — the console's recurring index motif. */
export function Idx({ n }) {
  return (
    <span className="font-mono text-[0.68rem] tabular-nums tracking-tag text-amber-500">
      {String(n).padStart(2, '0')}
    </span>
  );
}
