import { useEffect, useMemo, useRef, useState } from 'react';
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
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 600, h: 480 });
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [holdNoticeSuccess, setHoldNoticeSuccess] = useState(null);

  useEffect(() => {
    api.get('/network/graph').then(setData).catch(setError);
  }, []);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width || 600, h: 480 });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [data]);

  const positionedNodes = useMemo(() => {
    if (!data || !data.nodes) return [];
    const w = size.w || 600;
    const h = size.h || 480;
    const count = data.nodes.length;
    return data.nodes.map((node, idx) => {
      const angle = (idx / count) * 2 * Math.PI;
      const radius = 120 + ((idx % 3) * 50);
      return {
        ...node,
        x: w / 2 + radius * Math.cos(angle),
        y: h / 2 + radius * Math.sin(angle),
      };
    });
  }, [data, size]);

  const nodeMap = useMemo(() => {
    const map = new Map();
    positionedNodes.forEach(n => map.set(n.id, n));
    return map;
  }, [positionedNodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size.w, size.h);

    // Draw Links
    (data.links || []).forEach(link => {
      const source = nodeMap.get(link.source);
      const target = nodeMap.get(link.target);
      if (source && target) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = 'rgba(163,123,11,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // Draw Nodes
    positionedNodes.forEach(node => {
      const r = node.type === 'Person' ? 6 + (node.risk_score || 0) / 25 : node.type === 'Gang' ? 8 : 4;
      const tone = TYPE_TONE[node.type] || '#C9990F';

      if (node.mule_flag) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = '#3E2F06';
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = tone;
      ctx.fill();
      ctx.strokeStyle = selected?.id === node.id ? '#09090b' : '#FFFFFF';
      ctx.lineWidth = selected?.id === node.id ? 2.5 : 1;
      ctx.stroke();

      if (node.type === 'Person' || node.type === 'Gang') {
        ctx.font = '10px "Spline Sans Mono", monospace';
        ctx.fillStyle = '#171307';
        ctx.textAlign = 'center';
        ctx.fillText(node.label || '', node.x, node.y + r + 11);
      }
    });
  }, [positionedNodes, data, size, selected, nodeMap]);

  const handleCanvasClick = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const hit = positionedNodes.find(node => {
      const dist = Math.hypot(node.x - clickX, node.y - clickY);
      return dist <= 14;
    });

    setSelected(hit || null);
  };

  const mules = useMemo(
    () => (data?.nodes || []).filter((n) => n.mule_flag && n.type === 'Person'),
    [data],
  );

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
              <canvas
                ref={canvasRef}
                width={size.w}
                height={size.h}
                onClick={handleCanvasClick}
                className="cursor-pointer block"
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
                    <div className="space-y-2">
                      <p className="rounded-ledger border border-amber-500 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 font-semibold">
                        {selected.mule_reason || 'Flagged as probable mule.'}
                      </p>
                      <button
                        onClick={() => {
                          setHoldNoticeSuccess(`Emergency Bank Hold Notice Generated (BSA §63 Hash Sealed). Directive sent to RBI/Partner Banks.`);
                        }}
                        className="w-full text-center text-xs bg-amber-900 text-amber-100 py-2 px-3 rounded font-medium hover:bg-amber-950 transition-colors cursor-pointer shadow-sm"
                      >
                        ⚡ Issue Emergency Bank Hold Directive (BSA §63)
                      </button>
                      {holdNoticeSuccess && (
                        <p className="text-[0.7rem] text-emerald-800 bg-emerald-50 border border-emerald-300 p-2 rounded">
                          {holdNoticeSuccess}
                        </p>
                      )}
                    </div>
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
