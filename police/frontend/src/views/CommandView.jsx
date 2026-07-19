import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, LabelList,
} from 'recharts';
import { api } from '../api/client.js';
import {
  ViewFrame, Panel, StatBand, StatTile, LoadingLine, ErrorNote, Idx, SeverityChip,
} from '../ui/kit.jsx';

const INK = '#171307';
const AMBER_700 = '#7C5D09';
const AMBER_400 = '#E9BA26';
const AMBER_100 = '#FCF1C4';

const tooltipStyle = {
  background: '#FFFFFF',
  border: '1px solid #F8E39A',
  borderRadius: 2,
  fontSize: 12,
  color: INK,
  fontFamily: '"Spline Sans Mono", monospace',
};

export default function CommandView({ user }) {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [s, t, c, d, a] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/trend'),
          api.get('/dashboard/categories'),
          api.get('/dashboard/districts'),
          api.get('/alerts'),
        ]);
        if (!live) return;
        setSummary(s);
        setTrend(t.slice(-18));
        setCategories(c.slice(0, 7));
        setDistricts(d);
        setAlerts(a.slice(0, 4));
      } catch (err) {
        if (live) setError(err);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  if (loading) return <LoadingLine text="Assembling the command picture" />;

  return (
    <ViewFrame
      kicker={`${user?.role || 'Officer'} scope · live data lake`}
      title="The state of"
      titleEm="the state."
      lede="FIR volume, category pressure, and district load — computed from the records themselves, scoped to your rank."
    >
      {error && <ErrorNote error={error} note="Start police/backend on :8000 (or set VITE_POLICE_API_URL) to light this deck up." />}

      {summary && (
        <StatBand>
          <StatTile label="FIRs on record" value={summary.total_firs?.toLocaleString('en-IN')} />
          <StatTile label="Active investigations" value={summary.active_cases?.toLocaleString('en-IN')} alarm />
          <StatTile label="Registered offenders" value={summary.total_offenders?.toLocaleString('en-IN')} />
          <StatTile label="Top category" value={summary.top_crime_category} hint={`Conviction rate ${summary.conviction_rate}%`} />
        </StatBand>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel title="Filing trend" tag="FIRs per month" className="lg:col-span-3">
          {trend.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={AMBER_400} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={AMBER_400} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={AMBER_100} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8F8A7A' }} tickLine={false} axisLine={{ stroke: AMBER_100 }} />
                <YAxis tick={{ fontSize: 10, fill: '#8F8A7A' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: AMBER_700, strokeDasharray: '3 3' }} />
                <Area type="monotone" dataKey="count" name="FIRs" stroke={AMBER_700} strokeWidth={2} fill="url(#trendFill)" dot={false} activeDot={{ r: 4, fill: AMBER_700 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-sm text-ink-faint">No trend rows returned.</p>
          )}
        </Panel>

        <Panel title="Category pressure" tag="top 7 crime types" className="lg:col-span-2">
          {categories.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categories} layout="vertical" margin={{ top: 0, right: 42, bottom: 0, left: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category" dataKey="category" width={118}
                  tick={{ fontSize: 10, fill: INK }} tickLine={false} axisLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#FEFAE8' }} />
                <Bar dataKey="count" name="FIRs" fill={AMBER_400} radius={[0, 4, 4, 0]} barSize={14}>
                  <LabelList dataKey="count" position="right" style={{ fontSize: 10, fill: AMBER_700, fontFamily: '"Spline Sans Mono", monospace' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-sm text-ink-faint">No category rows returned.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="District load" tag="per 100k residents">
          <ol className="divide-y divide-amber-100">
            {districts.map((d, i) => (
              <li key={d.district_name} className="flex items-center gap-4 py-3">
                <Idx n={i + 1} />
                <span className="flex-1 text-sm font-medium">{d.district_name}</span>
                <span className="font-mono text-xs tabular-nums text-ink-soft">{d.count} FIRs</span>
                <span className="chip chip-medium">{d.density}</span>
              </li>
            ))}
            {!districts.length && <p className="py-6 text-sm text-ink-faint">No district rows in scope.</p>}
          </ol>
        </Panel>

        <Panel title="Latest anomalies" tag="z-score spikes">
          <ul className="divide-y divide-amber-100">
            {alerts.map((a) => (
              <li key={a.id} className="flex items-start gap-3 py-3">
                <SeverityChip level={a.severity} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.district}</p>
                  <p className="truncate text-xs text-ink-soft">{a.message}</p>
                </div>
                <span className="font-mono text-[0.64rem] tabular-nums text-ink-faint">z={a.z_score}</span>
              </li>
            ))}
            {!alerts.length && <p className="py-6 text-sm text-ink-faint">No anomalies above threshold.</p>}
          </ul>
        </Panel>
      </div>
    </ViewFrame>
  );
}
