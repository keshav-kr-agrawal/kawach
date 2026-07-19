import { useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { api } from '../api/client.js';
import { ViewFrame, Panel, LoadingLine, ErrorNote, Idx } from '../ui/kit.jsx';

/**
 * Fraud-ring graph (backend /api/network/graph — Louvain communities,
 * betweenness centrality, explainable money-mule flags).
 *
 * Two-hue encoding: node darkness = risk (Person) / fixed tone per entity
 * type; suspected mules get a pulsing double-ring; community id is shown as
 * a text badge on hover + in the side register, never as extra colors.
 */

const TYPE_TONE = {
  Person: '#7C5D09',
  Gang: '#3E2F06',
  Phone: '#C9990F',
  Account: '#A37B0B',
  'UPI ID': '#E9BA26',
  'Crypto Wallet': '#E9BA26',
  Vehicle: '#F2CF5B',
  Location: '#F2CF5B',
  'Device IMEI': '#F8E39A',
  'IP Address': '#F8E39A',
};

export default function NetworkView() {
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 600, h: 480 });
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/network/graph').then(setData).catch(setError);
  }, []);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: 480 });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [data]);

  const graphData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };
    return {
      nodes: data.nodes.map((n) => ({ ...n })),
      links: data.links.map((l) => ({ ...l })),
    };
  }, [data]);

  const mules = useMemo(
    () => (data?.nodes || []).filter((n) => n.mule_flag && n.type === 'Person'),
    [data],
  );

  const paintNode = (node, ctx, scale) => {
    const r = node.type === 'Person' ? 5 + (node.risk_score || 0) / 25 : node.type === 'Gang' ? 7 : 3.5;
    const tone = TYPE_TONE[node.type] || '#C9990F';

    if (node.mule_flag) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 3.5, 0, 2 * Math.PI);
      ctx.strokeStyle = '#3E2F06';
      ctx.setLineDash([2, 2]);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = tone;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (scale > 1.4 && (node.type === 'Person' || node.type === 'Gang')) {
      ctx.font = `${10 / scale}px "Spline Sans Mono", monospace`;
      ctx.fillStyle = '#171307';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + r + 10 / scale);
    }
  };

  return (
    <ViewFrame
      kicker={`Louvain communities · ${data?.metadata?.community_count ?? '—'} detected · ${data?.metadata?.suspected_mule_count ?? '—'} suspected mules`}
      title="Follow the"
      titleEm="money's shape."
      lede="Offenders, phones, accounts, UPI handles and devices as one graph. Communities surface fraud rings; low-history nodes wired into high-risk rings are flagged as probable mules — with the reasoning spelled out."
    >
      {error && <ErrorNote error={error} />}
      {!data && !error && <LoadingLine text="Resolving the offender graph" />}

      {data && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel className="lg:col-span-2" title="Entity graph" tag={`${data.nodes.length} nodes · ${data.links.length} ties`}>
            <div ref={wrapRef} className="overflow-hidden rounded-ledger border border-amber-100 bg-paper-warm">
              <ForceGraph2D
                width={size.w}
                height={size.h}
                graphData={graphData}
                nodeCanvasObject={paintNode}
                nodePointerAreaPaint={(node, color, ctx) => {
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, 9, 0, 2 * Math.PI);
                  ctx.fillStyle = color;
                  ctx.fill();
                }}
                linkColor={() => 'rgba(163,123,11,0.25)'}
                linkWidth={1}
                onNodeClick={(n) => setSelected(n)}
                cooldownTicks={90}
                backgroundColor="#FEFCF5"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.66rem] text-ink-faint">
              {Object.entries(TYPE_TONE).slice(0, 6).map(([type, tone]) => (
                <span key={type}>
                  <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: tone }} />
                  {type}
                </span>
              ))}
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full border border-dashed border-amber-900 align-middle" />dashed ring = suspected mule</span>
            </div>
          </Panel>

          <div className="flex flex-col gap-6">
            <Panel title={selected ? selected.label : 'Node inspector'} tag={selected?.type || 'click a node'}>
              {selected ? (
                <dl className="space-y-2 text-sm">
                  {selected.risk_score != null && (
                    <div className="flex justify-between"><dt className="text-ink-faint">Risk score</dt><dd className="font-mono tabular-nums">{selected.risk_score}%</dd></div>
                  )}
                  {selected.priors != null && (
                    <div className="flex justify-between"><dt className="text-ink-faint">Priors</dt><dd className="font-mono tabular-nums">{selected.priors}</dd></div>
                  )}
                  {selected.community_id != null && (
                    <div className="flex justify-between"><dt className="text-ink-faint">Community</dt><dd className="font-mono tabular-nums">#{selected.community_id}</dd></div>
                  )}
                  {selected.betweenness_centrality != null && (
                    <div className="flex justify-between"><dt className="text-ink-faint">Betweenness</dt><dd className="font-mono tabular-nums">{selected.betweenness_centrality}</dd></div>
                  )}
                  {selected.mule_flag && (
                    <p className="rounded-ledger border border-amber-500 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                      {selected.mule_reason || 'Flagged as probable mule.'}
                    </p>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-ink-faint">Select any node to read its risk, centrality, and community membership.</p>
              )}
            </Panel>

            <Panel title="Ring register" tag="by max risk">
              <ol className="max-h-56 divide-y divide-amber-100 overflow-y-auto">
                {[...(data.communities || [])]
                  .sort((a, b) => b.max_risk_score - a.max_risk_score)
                  .slice(0, 8)
                  .map((c, i) => (
                    <li key={c.community_id} className="flex items-center gap-3 py-2.5">
                      <Idx n={i + 1} />
                      <span className="flex-1 text-xs">Community #{c.community_id} · {c.person_count} persons</span>
                      <span className="font-mono text-[0.64rem] tabular-nums text-amber-800">risk {c.max_risk_score}%</span>
                      {c.suspected_mules > 0 && <span className="chip chip-high">{c.suspected_mules} mule</span>}
                    </li>
                  ))}
              </ol>
            </Panel>

            {mules.length > 0 && (
              <Panel title="Mule watchlist" tag="explainable flags">
                <ul className="max-h-48 space-y-3 overflow-y-auto">
                  {mules.map((m) => (
                    <li key={m.id} className="text-xs leading-relaxed">
                      <p className="font-semibold">{m.label}</p>
                      <p className="text-ink-soft">{m.mule_reason}</p>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        </div>
      )}
    </ViewFrame>
  );
}
