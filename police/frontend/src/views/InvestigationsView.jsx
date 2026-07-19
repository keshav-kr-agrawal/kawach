import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { ViewFrame, Panel, LoadingLine, ErrorNote, SeverityChip, StatusChip } from '../ui/kit.jsx';

const FILTERS = ['All', 'Breached', 'Warning', 'OK'];

/** FIR docket with real SLA states computed from stored sla_deadline. */
export default function InvestigationsView() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    api.get('/investigations').then(setRows).catch(setError);
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (filter === 'All') return rows;
    return rows.filter((r) => r.sla_status === filter);
  }, [rows, filter]);

  const counts = useMemo(() => {
    const c = { All: rows?.length || 0, Breached: 0, Warning: 0, OK: 0 };
    (rows || []).forEach((r) => { c[r.sla_status] = (c[r.sla_status] || 0) + 1; });
    return c;
  }, [rows]);

  const openDetail = async (id) => {
    setDetailLoading(true);
    try {
      setDetail(await api.get(`/investigations/${id}`));
    } catch (err) {
      setError(err);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <ViewFrame
      kicker="FIR docket · SLA computed from stored deadlines"
      title="Cases on"
      titleEm="the clock."
      lede="Every FIR carries its statutory deadline. Breaches are computed, surfaced, and impossible to bury in a spreadsheet."
      aside={
        <div className="flex overflow-hidden rounded-ledger border border-amber-500">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 font-mono text-[0.64rem] uppercase tracking-tag transition ${
                filter === f ? 'bg-amber-950 text-amber-50' : 'bg-white text-ink-soft hover:bg-amber-50'
              }`}
            >
              {f} <span className="opacity-60">{counts[f] ?? 0}</span>
            </button>
          ))}
        </div>
      }
    >
      {error && <ErrorNote error={error} />}
      {!rows && !error && <LoadingLine text="Pulling the docket" />}

      {rows && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel className="lg:col-span-2" title="Docket" tag={`${filtered.length} case(s)`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-amber-200">
                    {['Case', 'Crime', 'Filed', 'Priority', 'SLA'].map((h) => (
                      <th key={h} className="tag pb-3 pr-4 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => openDetail(r.id)}
                      className={`cursor-pointer transition hover:bg-amber-50 ${detail?.id === r.id ? 'bg-amber-50' : ''}`}
                    >
                      <td className="py-3 pr-4 font-mono text-xs">{r.id}</td>
                      <td className="py-3 pr-4">
                        <p className="font-medium">{r.crime_type}</p>
                        <p className="text-[0.68rem] text-ink-faint">{r.ipc_section} · {r.status}</p>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-ink-soft">
                        {new Date(r.date_filed).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 pr-4"><SeverityChip level={r.priority} /></td>
                      <td className="py-3">
                        <StatusChip
                          ok={r.sla_status === 'OK'}
                          warn={r.sla_status === 'Warning'}
                          okText={`${r.days_left}d left`}
                          warnText={`${r.days_left}d left`}
                          badText={`${Math.abs(r.days_left)}d over`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && <p className="py-8 text-sm text-ink-faint">No cases match this filter.</p>}
            </div>
          </Panel>

          <Panel title={detail ? detail.id : 'Case file'} tag={detail ? detail.police_station_name : 'select a row'}>
            {detailLoading && <LoadingLine text="Opening case file" />}
            {!detailLoading && detail && (
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <SeverityChip level={detail.priority} />
                  <span className="chip chip-quiet">{detail.status}</span>
                </div>
                <p className="leading-relaxed text-ink-soft">{detail.summary}</p>
                {detail.leads?.length > 0 && (
                  <div>
                    <p className="tag mb-2">Leads</p>
                    <ul className="space-y-1.5 text-xs text-ink-soft">
                      {detail.leads.map((l, i) => <li key={i}>— {typeof l === 'string' ? l : JSON.stringify(l)}</li>)}
                    </ul>
                  </div>
                )}
                {detail.timeline?.length > 0 && (
                  <div>
                    <p className="tag mb-2">Timeline</p>
                    <ol className="space-y-2 border-l border-amber-200 pl-4 text-xs">
                      {detail.timeline.map((t, i) => (
                        <li key={i} className="relative">
                          <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-amber-500" />
                          {typeof t === 'string' ? t : `${t.date || t.at || ''} — ${t.event || t.note || JSON.stringify(t)}`}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
            {!detailLoading && !detail && (
              <p className="text-sm text-ink-faint">Click any docket row to open its summary, leads, and timeline.</p>
            )}
          </Panel>
        </div>
      )}
    </ViewFrame>
  );
}
