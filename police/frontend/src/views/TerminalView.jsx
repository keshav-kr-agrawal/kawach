import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { ViewFrame, ErrorNote } from '../ui/kit.jsx';
import { TerminalGlyph, ArrowRight } from '../ui/glyphs.jsx';

/**
 * Case Terminal (/api/ai/query) — natural-language lookups over FIRs,
 * offenders, plates and phones, with graph context injected when the
 * question touches known entities. Answers carry citations when the
 * backend can ground them.
 */

const SUGGESTIONS = [
  'Summarize case FIR-2024-001',
  'Who are the associates of Ramesh?',
  'Look up vehicle KA01AB1234',
  'Which district has the most cybercrime?',
];

/** Minimal renderer for the backend's **bold** markdown convention. */
function Rich({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} className="font-semibold text-amber-900">{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>,
      )}
    </>
  );
}

export default function TerminalView() {
  const [log, setLog] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  const ask = async (question) => {
    const q = (question ?? input).trim();
    if (!q || busy) return;
    setInput('');
    setBusy(true);
    setError(null);
    setLog((l) => [...l, { role: 'officer', text: q }]);
    try {
      const res = await api.post('/ai/query', { message: q });
      setLog((l) => [...l, { role: 'console', text: res.response, citations: res.citations || [] }]);
    } catch (err) {
      setError(err);
      setLog((l) => [...l, {
        role: 'console',
        text: 'Query service unreachable. Nothing was fabricated — retry when the backend is up.',
        citations: [],
      }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ViewFrame
      kicker="Grounded case lookups · guilt inference locked"
      title="Ask the"
      titleEm="record."
      lede="Case summaries, offender links, plate and phone lookups — answered from the data lake and the offender graph, with citations. The terminal reports records; it never recommends arrests or infers guilt."
    >
      {error && <ErrorNote error={error} />}

      <div className="panel flex h-[560px] flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {!log.length && (
            <div className="flex h-full flex-col items-start justify-center gap-4">
              <TerminalGlyph className="h-8 w-8 text-amber-400" />
              <p className="max-w-md text-sm text-ink-faint">
                Query the record in plain language. Try one of these:
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="btn-line" onClick={() => ask(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {log.map((entry, i) => (
            <div key={i} className={entry.role === 'officer' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={`max-w-[80%] rounded-ledger px-4 py-3 text-sm leading-relaxed ${
                  entry.role === 'officer'
                    ? 'bg-amber-950 text-amber-50'
                    : 'border border-amber-200 bg-paper-warm text-ink'
                }`}
              >
                <p className="tag mb-1.5 opacity-70">{entry.role === 'officer' ? 'You' : 'Record'}</p>
                <p className="whitespace-pre-wrap"><Rich text={entry.text} /></p>
                {entry.citations?.length > 0 && (
                  <div className="mt-2 border-t border-amber-200 pt-2">
                    {entry.citations.map((c, j) => (
                      <p key={j} className="font-mono text-[0.62rem] text-ink-faint">
                        ⌁ {typeof c === 'string' ? c : c.source || JSON.stringify(c)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <p className="font-mono text-[0.66rem] uppercase tracking-tag text-amber-600">
              Searching the record…
            </p>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="flex gap-3 border-t border-amber-100 p-4"
          onSubmit={(e) => { e.preventDefault(); ask(); }}
        >
          <input
            className="field flex-1"
            placeholder="Ask about a case, offender, plate, or phone…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn-ink" disabled={busy || !input.trim()}>
            Query <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>

      <p className="text-center font-mono text-[0.62rem] uppercase tracking-tag text-ink-faint">
        Investigative lead tool · no guilt inference · every query audit-logged
      </p>
    </ViewFrame>
  );
}
