import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api/client.js';
import { ViewFrame, Panel, ErrorNote } from '../ui/kit.jsx';
import { RupeeGlyph, CheckGlyph, EscalateGlyph } from '../ui/glyphs.jsx';

/**
 * Citizen Fraud Shield desk (/api/fraud-shield/check) — checks a phone
 * number, UPI handle, or link against criminal records PLUS two behavioral
 * signals: call-burst-after-dormancy and mule-network shape.
 */

const TYPES = [
  { id: 'phone', label: 'Phone number', placeholder: '98450 12345' },
  { id: 'upi', label: 'UPI handle', placeholder: 'name@okaxis' },
  { id: 'link', label: 'Link / URL', placeholder: 'https://…' },
];

export default function FraudShieldView() {
  const [type, setType] = useState('phone');
  const [value, setValue] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const check = async (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.post('/fraud-shield/check', { type, value: value.trim() }));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const level = result?.risk_level?.toUpperCase();

  return (
    <ViewFrame
      kicker="Records + behavioral signals · rationale always disclosed"
      title="Check before"
      titleEm="the money moves."
      lede="A number, a UPI handle, or a link — checked against criminal records, call-burst anomalies, and mule-network shape. Every verdict states exactly which signal fired."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Verification desk" tag="phone · upi · link">
          <form onSubmit={check} className="space-y-5">
            <div className="flex overflow-hidden rounded-ledger border border-amber-500">
              {TYPES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => { setType(t.id); setResult(null); }}
                  className={`flex-1 px-3 py-2.5 font-mono text-[0.64rem] uppercase tracking-tag transition ${
                    type === t.id ? 'bg-amber-950 text-amber-50' : 'bg-white text-ink-soft hover:bg-amber-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <input
              className="field font-mono"
              placeholder={TYPES.find((t) => t.id === type)?.placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <button type="submit" className="btn-ink w-full" disabled={loading}>
              <RupeeGlyph className="h-4 w-4" />
              {loading ? 'Cross-checking records…' : 'Run the check'}
            </button>
          </form>
          {error && <div className="mt-4"><ErrorNote error={error} /></div>}
        </Panel>

        <Panel title="Verdict" tag={result ? `score ${result.score}` : 'awaiting input'}>
          {!result && !loading && (
            <p className="text-sm text-ink-faint">
              Results appear here with the risk tier, the exact rationale, and — for high-risk
              hits — a pre-drafted NCRP complaint.
            </p>
          )}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <div
                className={`flex items-center gap-4 rounded-ledger p-5 ${
                  level === 'HIGH' ? 'bg-amber-950 text-amber-50'
                  : level === 'MEDIUM' ? 'bg-amber-200 text-amber-950'
                  : 'bg-amber-50 text-ink'
                }`}
              >
                {level === 'LOW'
                  ? <CheckGlyph className="h-7 w-7 flex-none" />
                  : <EscalateGlyph className="h-7 w-7 flex-none" />}
                <div>
                  <p className="font-display text-2xl font-medium">{result.risk_level} risk</p>
                  <p className="font-mono text-[0.66rem] uppercase tracking-tag opacity-80">
                    fused score {result.score}/100
                  </p>
                </div>
              </div>

              <div>
                <p className="tag mb-2">Why</p>
                <p className="text-sm leading-relaxed text-ink-soft">{result.rationale}</p>
              </div>

              {result.actions?.length > 0 && (
                <div>
                  <p className="tag mb-2">Recommended actions</p>
                  <ul className="space-y-1.5 text-sm text-ink-soft">
                    {result.actions.map((a, i) => <li key={i}>— {a}</li>)}
                  </ul>
                </div>
              )}

              {result.ncrp_draft && (
                <div className="rounded-ledger border border-amber-500 bg-amber-50 p-4">
                  <p className="tag mb-3">NCRP complaint draft — ready to file</p>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <dt className="text-ink-faint">Suspect</dt><dd className="font-medium">{result.ncrp_draft.suspect_name}</dd>
                    <dt className="text-ink-faint">Phone</dt><dd className="font-mono">{result.ncrp_draft.suspect_phone}</dd>
                    <dt className="text-ink-faint">Account</dt><dd className="font-mono">{result.ncrp_draft.suspect_account} ({result.ncrp_draft.suspect_bank})</dd>
                    <dt className="text-ink-faint">Crime type</dt><dd>{result.ncrp_draft.crime_type}</dd>
                  </dl>
                  <p className="mt-3 text-xs leading-relaxed text-ink-soft">{result.ncrp_draft.narrative}</p>
                </div>
              )}
            </motion.div>
          )}
        </Panel>
      </div>
    </ViewFrame>
  );
}
