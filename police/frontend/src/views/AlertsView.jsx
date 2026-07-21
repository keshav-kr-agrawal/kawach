import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { ViewFrame, Panel, LoadingLine, ErrorNote, SeverityChip, Idx } from '../ui/kit.jsx';

/** Statistical anomaly feed — z-score spikes per district (/api/alerts). */
export default function AlertsView() {
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/alerts').then(setAlerts).catch(setError);
  }, []);

  return (
    <ViewFrame
      kicker="Z-score anomaly detection · 30-day window vs historical baseline"
      title="When a district"
      titleEm="breaks pattern."
      lede="Each alert is a district whose recent crime volume sits significantly above its own history — a statistical claim with the z-score attached, not a hunch."
    >
      {error && <ErrorNote error={error} />}
      {!alerts && !error && <LoadingLine text="Scanning district baselines" />}

      {alerts && (
        <Panel title="Active anomalies" tag={`${alerts.length} district(s) above threshold`}>
          <ol className="divide-y divide-amber-100">
            {alerts.map((a, i) => (
              <li key={a.id} className="grid grid-cols-[auto_1fr_auto] items-start gap-4 py-5">
                <Idx n={i + 1} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-display text-lg font-medium">{a.district}</h3>
                    <span className="tag">{a.type}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{a.message}</p>
                  <p className="mt-2 font-mono text-[0.64rem] uppercase tracking-tag text-ink-faint">
                    {a.timestamp ? new Date(a.timestamp).toLocaleString('en-IN') : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <SeverityChip level={a.severity} />
                  <span className="font-mono text-xs tabular-nums text-amber-800">z = {a.z_score}</span>
                </div>
              </li>
            ))}
            {!alerts.length && (
              <p className="py-8 text-sm text-ink-faint">Every district is inside its statistical baseline.</p>
            )}
          </ol>
        </Panel>
      )}
    </ViewFrame>
  );
}
