import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { ViewFrame, Panel, LoadingLine, ErrorNote, Idx } from '../ui/kit.jsx';

/**
 * District risk board (/api/analytics/predict) — XGBoost regressor trained
 * on real NCRB/Census/Karnataka govt. data when risk_model.pkl is loaded
 * (ships a SHAP explanation + model_r2/model_rmse), falling back to the
 * original deterministic formula (ships a score_breakdown instead) if the
 * model isn't available. Both shapes render — branch on d.score_breakdown.
 */

const TIER_CLS = { High: 'chip-critical', Medium: 'chip-medium', Low: 'chip-low' };
const BREAKDOWN_LABEL = {
  unemployment: 'Unemployment',
  poverty: 'Poverty',
  police_deficit: 'Police deficit',
  recent_crime_volume: 'Recent crime',
};

export default function PredictiveView() {
  const [rows, setRows] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api.get('/analytics/predict').then(setRows).catch(setError);
    api.get('/analytics/patterns').then(setPatterns).catch(() => {});
  }, []);

  const mlActive = Boolean(rows?.[0]?.ml_model);

  return (
    <ViewFrame
      kicker={
        mlActive
          ? `${rows[0].ml_model}, trained on real NCRB/Census/Karnataka govt. data — R² ${rows[0].model_r2}`
          : 'Deterministic statistical scoring — identical inputs, identical scores'
      }
      title="Pressure by"
      titleEm="district."
      lede={
        mlActive
          ? 'Trained on real historical district crime records (NCRB 2001-2012) joined with real Census and state income data. Every score opens into its top SHAP-attributed factors — not a black box.'
          : 'A weighted formula over unemployment, poverty, police density, and 180-day FIR volume. Every score opens into its per-factor breakdown — defensible under scrutiny, no black box.'
      }
    >
      {error && <ErrorNote error={error} />}
      {!rows && !error && <LoadingLine text="Scoring district indicators" />}

      {rows && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel className="lg:col-span-2" title="Risk board" tag="highest first">
            <ol className="divide-y divide-amber-100">
              {rows.map((d, i) => (
                <li key={d.district_id} className="py-4">
                  <div
                    className="grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4"
                    onClick={() => setOpen(open === d.district_id ? null : d.district_id)}
                  >
                    <Idx n={i + 1} />
                    <div className="min-w-0">
                      <p className="font-display text-base font-medium">{d.district_name}</p>
                      <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-amber-100">
                        <div
                          className={d.risk_score >= 70 ? 'h-full bg-amber-950' : d.risk_score >= 40 ? 'h-full bg-amber-500' : 'h-full bg-amber-200'}
                          style={{ width: `${d.risk_score}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-semibold tabular-nums text-amber-950">{d.risk_score}</span>
                      <span className={`chip ${TIER_CLS[d.risk_tier] || 'chip-medium'}`}>{d.risk_tier}</span>
                    </div>
                  </div>

                  {open === d.district_id && (
                    <div className="mt-4 grid gap-2 rounded-ledger bg-amber-50 p-4 sm:grid-cols-2">
                      {d.score_breakdown ? (
                        Object.entries(d.score_breakdown).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-3">
                            <span className="w-28 text-[0.68rem] text-ink-soft">{BREAKDOWN_LABEL[k] || k}</span>
                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-amber-100">
                              <div className="h-full bg-amber-700" style={{ width: `${(v / 30) * 100}%` }} />
                            </div>
                            <span className="font-mono text-[0.66rem] tabular-nums text-amber-800">+{v}</span>
                          </div>
                        ))
                      ) : (
                        <div className="sm:col-span-2">
                          <p className="text-[0.7rem] leading-relaxed text-ink-soft">{d.shap_explanation}</p>
                          <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-tag text-ink-faint">
                            {d.ml_model} · R² {d.model_r2} · RMSE {d.model_rmse}
                          </p>
                        </div>
                      )}
                      <div className="sm:col-span-2 space-y-0.5 border-t border-amber-200 pt-2">
                        {Object.values(d.contributing_factors || {}).map((f, j) => (
                          <p key={j} className="text-[0.66rem] text-ink-faint">— {f}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Pattern intelligence" tag="sample sizes attached">
            <ul className="space-y-5">
              {patterns.map((p) => (
                <li key={p.id} className="border-l-2 border-amber-500 pl-4">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{p.title}</p>
                    <span className="chip chip-quiet">{p.category}</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">{p.description}</p>
                  <p className="mt-1.5 font-mono text-[0.62rem] uppercase tracking-tag text-ink-faint">
                    confidence {p.confidence}% · n={p.sample_size}
                  </p>
                  {p.category === 'Forecast' && p.forecast_90d != null && (
                    <p className="mt-1 font-mono text-[0.62rem] text-amber-800">
                      30d: {p.forecast_30d} · 90d: {p.forecast_90d} (CI {p.confidence_interval?.lower_90d}–{p.confidence_interval?.upper_90d})
                    </p>
                  )}
                  {p.category === 'Anomaly' && p.elevated_crime_types?.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {p.elevated_crime_types.map((ct) => (
                        <span key={ct} className="chip chip-quiet">{ct}</span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
              {!patterns.length && (
                <p className="text-xs text-ink-faint">
                  No patterns cleared the evidence bar — cards are omitted, not faked.
                </p>
              )}
            </ul>
          </Panel>
        </div>
      )}
    </ViewFrame>
  );
}
