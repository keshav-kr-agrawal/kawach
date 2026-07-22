import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { ViewFrame, Panel, ErrorNote, Idx, LoadingLine } from '../ui/kit.jsx';
import { TraceGlyph } from '../ui/glyphs.jsx';

/**
 * IP / infrastructure tracing (/api/ip-tracing).
 * Multi-source enrichment (geolocation + ASN, Tor exit list, RDAP registry
 * ownership, optional AbuseIPDB/GreyNoise reputation, KAWACH's own repeat-
 * lookup telemetry) fused into one explainable 0–100 risk score — the same
 * fusion pattern as the Digital Arrest monitor, applied to infrastructure
 * instead of a live call.
 */

function RiskGauge({ score, confidence }) {
  const tier = score >= 70 ? 'critical' : score >= 40 ? 'medium' : 'low';
  const bg = tier === 'critical' ? 'bg-amber-950 text-amber-50' : 'bg-amber-50 text-ink';
  const bar = tier === 'critical' ? 'bg-amber-300' : 'bg-amber-700';
  const track = tier === 'critical' ? 'bg-amber-800' : 'bg-amber-100';
  return (
    <div className={`rounded-ledger p-6 ${bg}`}>
      <div className="flex items-end justify-between">
        <div>
          <p className={`font-mono text-5xl font-semibold tabular-nums ${tier === 'critical' ? 'text-amber-300' : 'text-amber-950'}`}>
            {score}
          </p>
          <p className="tag mt-1 opacity-80">Infrastructure risk / 100</p>
        </div>
        <span className={`chip ${tier === 'critical' ? 'chip-critical' : tier === 'medium' ? 'chip-medium' : 'chip-low'}`}>
          {tier === 'critical' ? 'High risk' : tier === 'medium' ? 'Caution' : 'Low risk'}
        </span>
      </div>
      <div className={`mt-4 h-2 overflow-hidden rounded-full ${track}`}>
        <div className={`h-full ${bar}`} style={{ width: `${Math.min(100, score)}%` }} />
      </div>
      <p className="mt-3 text-xs leading-relaxed opacity-80">
        Confidence: <strong className="uppercase">{confidence}</strong> — based on how many
        of the underlying sources actually responded for this IP.
      </p>
    </div>
  );
}

function SourceStatusRow({ name, detail }) {
  const ok = detail.status === 'ok';
  const notConfigured = detail.status === 'not_configured';
  const chip = ok ? 'chip-quiet' : notConfigured ? 'chip-medium' : 'chip-critical';
  const label = ok ? `OK · ${detail.latency_ms}ms` : notConfigured ? 'Not configured' : detail.status;
  return (
    <div className="flex items-center justify-between py-1.5 text-xs">
      <span className="text-ink-soft">{name}</span>
      <span className={`chip ${chip}`}>{label}</span>
    </div>
  );
}

export default function IpTracingView() {
  const [ip, setIp] = useState('');
  const [profile, setProfile] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const refreshWatchlist = () => api.get('/ip-tracing/watchlist/all').then(setWatchlist).catch(() => {});
  useEffect(() => { refreshWatchlist(); }, []);

  const lookup = async (targetIp) => {
    if (!targetIp?.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setProfile(await api.get(`/ip-tracing/${targetIp.trim()}`));
    } catch (err) {
      setError(err);
      setProfile(null);
    } finally {
      setBusy(false);
    }
  };

  const addToList = async (listType) => {
    if (!profile) return;
    setBusy(true);
    try {
      await api.post(`/ip-tracing/${profile.ip}/list`, { list_type: listType, note: note || null });
      await lookup(profile.ip);
      refreshWatchlist();
      setNote('');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ViewFrame
      kicker="Geo + ASN · Tor exit list · RDAP registry · reputation · KAWACH repeat-lookup telemetry"
      title="Trace the"
      titleEm="infrastructure."
      lede="Every incoming report, scam call, and phishing link carries an IP. Enter it here to fuse geolocation, network ownership, and reputation into one explainable risk score — the same way the offender graph fuses phone/account linkage."
    >
      <Panel title="Look up an IP" tag="free, keyless sources by default">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => { e.preventDefault(); lookup(ip); }}
        >
          <input
            className="field flex-1 font-mono"
            placeholder="103.85.12.44"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
          />
          <button type="submit" className="btn-ink" disabled={busy}>
            <TraceGlyph className="h-4 w-4" />
            {busy ? 'Tracing…' : 'Trace IP'}
          </button>
        </form>
      </Panel>

      {error && <ErrorNote error={error} note="Start police/backend on :8000 (or set VITE_POLICE_API_URL) to light this up." />}
      {busy && !profile && <LoadingLine text="Fusing infrastructure signals" />}

      {profile && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <RiskGauge score={profile.risk_score} confidence={profile.confidence} />

            <Panel title="Score breakdown" tag={`${profile.score_breakdown?.length || 0} contributing signal(s)`}>
              {profile.score_breakdown?.length ? (
                <ul className="divide-y divide-amber-100">
                  {profile.score_breakdown.map((b, i) => (
                    <li key={i} className="flex items-start justify-between gap-4 py-2.5">
                      <span className="text-sm text-ink-soft">{b.indicator}</span>
                      <span className={`font-mono text-xs tabular-nums ${b.points >= 0 ? 'text-amber-800' : 'text-emerald-700'}`}>
                        {b.points >= 0 ? '+' : ''}{b.points}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-sm text-ink-faint">
                  No risk signals fired — this IP looks like an ordinary residential/consumer line.
                </p>
              )}
            </Panel>

            <div className="grid gap-6 sm:grid-cols-2">
              <Panel title="Geolocation" tag={profile.geo?.geo_source || 'unresolved'}>
                {profile.geo ? (
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><dt className="text-ink-faint">City</dt><dd>{profile.geo.city}{profile.geo.district ? ` (${profile.geo.district})` : ''}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-faint">Region</dt><dd>{profile.geo.region || '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-faint">Country</dt><dd>{profile.geo.country}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-faint">Postal code</dt><dd className="font-mono text-xs">{profile.geo.zip || '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-faint">Timezone</dt><dd className="text-xs">{profile.geo.timezone || '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-faint">Coordinates</dt><dd className="font-mono text-xs">{profile.geo.lat}, {profile.geo.lon}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-faint">Accuracy</dt><dd>{profile.geo.accuracy_label} (~{profile.geo.accuracy_km}km)</dd></div>
                  </dl>
                ) : <p className="text-sm text-ink-faint">No geolocation source responded.</p>}
              </Panel>

              <Panel title="Network ownership" tag={profile.asn?.type || 'unknown'}>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><dt className="text-ink-faint">ASN</dt><dd className="font-mono text-xs">{profile.asn?.number ? `AS${profile.asn.number}` : '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-faint">Organisation</dt><dd className="truncate">{profile.asn?.org || '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-faint">Reverse DNS</dt><dd className="truncate font-mono text-xs">{profile.network_ownership?.reverse_dns || '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-faint">CIDR</dt><dd className="font-mono text-xs">{profile.network_ownership?.cidr || '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-faint">Registered in</dt><dd>{profile.network_ownership?.registration_country || '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink-faint">Abuse contact</dt><dd className="truncate text-xs">{profile.network_ownership?.abuse_contact || '—'}</dd></div>
                </dl>
              </Panel>
            </div>

            <Panel title="Network flags" tag="Tor / proxy / hosting / mobile">
              <div className="flex flex-wrap gap-2">
                <span className={`chip ${profile.network_flags?.is_tor ? 'chip-critical' : 'chip-quiet'}`}>
                  {profile.network_flags?.is_tor ? 'Tor exit node' : 'Not a Tor exit node'}
                </span>
                <span className={`chip ${profile.network_flags?.is_proxy ? 'chip-critical' : 'chip-quiet'}`}>
                  {profile.network_flags?.is_proxy ? 'Known VPN / proxy' : 'Not a known proxy'}
                </span>
                <span className={`chip ${profile.network_flags?.is_hosting ? 'chip-medium' : 'chip-quiet'}`}>
                  {profile.network_flags?.is_hosting ? 'Hosting / cloud provider' : 'Residential / ISP line'}
                </span>
                <span className={`chip ${profile.network_flags?.is_mobile ? 'chip-medium' : 'chip-quiet'}`}>
                  {profile.network_flags?.is_mobile ? 'Mobile carrier network' : 'Not a mobile carrier'}
                </span>
              </div>
            </Panel>
          </div>

          <div className="flex flex-col gap-6">
            {profile.case_match?.matched && (
              <Panel title="KAWACH case match" tag="linked offender found">
                <div className="rounded-ledger border border-amber-500 bg-amber-50 p-3">
                  <p className="font-display text-base font-medium text-ink">{profile.case_match.offender_name}</p>
                  <p className="tag mt-0.5">{profile.case_match.offender_id} · risk {profile.case_match.risk_score}%</p>
                  <dl className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between"><dt className="text-ink-faint">Syndicate</dt><dd>{profile.case_match.gangs?.join(', ') || 'None on record'}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-faint">Phone</dt><dd className="font-mono">{profile.case_match.phone_number}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-faint">Device IMEI</dt><dd className="font-mono">{profile.case_match.device_imei || '—'}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-faint">Cell tower</dt><dd className="font-mono">{profile.case_match.cell_tower_id || '—'}</dd></div>
                  </dl>
                </div>
              </Panel>
            )}

            <Panel title="KAWACH telemetry" tag="this department's own history">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-ink-faint">Lookups on record</dt><dd className="font-mono">{profile.internal?.kawach_lookup_count}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-faint">First seen</dt><dd className="text-xs">{new Date(profile.internal?.first_seen).toLocaleString('en-IN')}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-faint">Last seen</dt><dd className="text-xs">{new Date(profile.internal?.last_seen).toLocaleString('en-IN')}</dd></div>
              </dl>
              {!profile.case_match?.matched && (
                <p className="mt-3 text-xs text-ink-faint">
                  No link to a KAWACH case file — this IP hasn't appeared in this department's own records.
                  A real subscriber name would require a legal request to the ISP; no lookup service can provide that.
                </p>
              )}
            </Panel>

            <Panel title="Source status" tag="what actually responded">
              {Object.entries(profile.source_status || {}).map(([name, detail]) => (
                <SourceStatusRow key={name} name={name} detail={detail} />
              ))}
            </Panel>

            <Panel title="Case action" tag={profile.watchlist_entry?.list_type || 'not listed'}>
              {profile.watchlist_entry ? (
                <p className="text-xs text-ink-soft">
                  Already on the <strong>{profile.watchlist_entry.list_type}</strong> by{' '}
                  {profile.watchlist_entry.added_by} — {profile.watchlist_entry.note || 'no note'}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  <input
                    className="field text-xs"
                    placeholder="Note (case ref, reason…)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button className="btn-line flex-1" disabled={busy} onClick={() => addToList('watchlist')}>Watchlist</button>
                    <button className="btn-ink flex-1" disabled={busy} onClick={() => addToList('blocklist')}>Blocklist</button>
                  </div>
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}

      <Panel title="Flagged infrastructure" tag={`${watchlist.length} entr${watchlist.length === 1 ? 'y' : 'ies'}`}>
        <ol className="divide-y divide-amber-100">
          {watchlist.map((w, i) => (
            <li
              key={w.id}
              className="flex cursor-pointer items-center gap-3 py-3 transition hover:bg-amber-50"
              onClick={() => { setIp(w.ip); lookup(w.ip); }}
            >
              <Idx n={i + 1} />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs">{w.ip}</p>
                <p className="truncate text-[0.66rem] text-ink-faint">{w.note || 'no note'} · by {w.added_by}</p>
              </div>
              <span className={`chip ${w.list_type === 'blocklist' ? 'chip-critical' : 'chip-medium'}`}>{w.list_type}</span>
            </li>
          ))}
          {!watchlist.length && <p className="py-6 text-xs text-ink-faint">No IPs flagged yet.</p>}
        </ol>
      </Panel>
    </ViewFrame>
  );
}
