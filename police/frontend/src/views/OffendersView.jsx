import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { ViewFrame, Panel, LoadingLine, ErrorNote, Idx } from '../ui/kit.jsx';

/**
 * Offender registry — repeat offenders ranked by risk, name/id search,
 * and the full profile with its explainable risk rationale.
 */
export default function OffendersView() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [profile, setProfile] = useState(null);

  const loadRepeat = () => api.get('/offenders/repeat').then(setRows).catch(setError);
  useEffect(() => { loadRepeat(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const search = async (e) => {
    e.preventDefault();
    if (!query.trim()) return loadRepeat();
    setSearching(true);
    try {
      setRows(await api.get(`/offenders/search?query=${encodeURIComponent(query.trim())}`));
    } catch (err) {
      setError(err);
    } finally {
      setSearching(false);
    }
  };

  const openProfile = async (id) => {
    try {
      setProfile(await api.get(`/offenders/${id}`));
    } catch (err) {
      setError(err);
    }
  };

  return (
    <ViewFrame
      kicker="Repeat offenders ranked by risk score"
      title="Known"
      titleEm="recidivists."
      lede="Risk scores come with their reasoning attached — priors, syndicate ties, and asset links, stated in plain language. No verdicts, no guilt inference: leads, not conclusions."
      aside={
        <form onSubmit={search} className="flex gap-2">
          <input
            className="field w-56 py-2 text-xs"
            placeholder="Search name or ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn-ink py-2" disabled={searching}>
            {searching ? '…' : 'Search'}
          </button>
        </form>
      }
    >
      {error && <ErrorNote error={error} />}
      {!rows && !error && <LoadingLine text="Opening the registry" />}

      {rows && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel className="lg:col-span-2" title="Registry" tag={`${rows.length} record(s)`}>
            <ol className="divide-y divide-amber-100">
              {rows.map((o, i) => (
                <li
                  key={o.id}
                  onClick={() => openProfile(o.id)}
                  className={`grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 py-4 transition hover:bg-amber-50 ${profile?.id === o.id ? 'bg-amber-50' : ''}`}
                >
                  <Idx n={i + 1} />
                  <div className="min-w-0">
                    <p className="font-display text-base font-medium">{o.name}</p>
                    <p className="text-xs text-ink-faint">
                      {o.id} · {o.age ? `${o.age}y` : '—'} · {o.num_prior_offenses} prior(s)
                      {o.associates_count != null && ` · ${o.associates_count} associate(s)`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* risk meter — darkness+width encode magnitude, number states it */}
                    <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-amber-100 sm:block">
                      <div
                        className={`h-full ${o.risk_score >= 80 ? 'bg-amber-950' : o.risk_score >= 55 ? 'bg-amber-700' : 'bg-amber-400'}`}
                        style={{ width: `${Math.min(100, o.risk_score)}%` }}
                      />
                    </div>
                    <span className="font-mono text-sm font-semibold tabular-nums text-amber-900">{o.risk_score}%</span>
                  </div>
                </li>
              ))}
              {!rows.length && <p className="py-8 text-sm text-ink-faint">No records match.</p>}
            </ol>
          </Panel>

          <Panel title={profile ? profile.name : 'Profile'} tag={profile ? profile.id : 'select a record'}>
            {profile ? (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-ledger bg-amber-50 p-3">
                    <p className="font-mono text-xl font-semibold tabular-nums text-amber-950">{profile.risk_score}%</p>
                    <p className="tag mt-1">Risk score</p>
                  </div>
                  <div className="rounded-ledger bg-amber-50 p-3">
                    <p className="font-mono text-xl font-semibold tabular-nums text-amber-950">{profile.num_prior_offenses}</p>
                    <p className="tag mt-1">Priors</p>
                  </div>
                </div>
                {profile.xai_rationale && (
                  <div>
                    <p className="tag mb-2">Why this score</p>
                    <p className="text-xs leading-relaxed text-ink-soft">{profile.xai_rationale}</p>
                  </div>
                )}
                {profile.gangs?.length > 0 && (
                  <div>
                    <p className="tag mb-2">Syndicates</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.gangs.map((g) => (
                        <span key={g.name || g} className="chip chip-high">{g.name || g}</span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.associates?.length > 0 && (
                  <div>
                    <p className="tag mb-2">Associates</p>
                    <ul className="space-y-1 text-xs text-ink-soft">
                      {profile.associates.slice(0, 6).map((a) => (
                        <li key={a.id || a.name}>— {a.name}{a.risk_score != null && ` (risk ${a.risk_score}%)`}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="border-t border-amber-100 pt-3 text-[0.66rem] leading-relaxed text-ink-faint">
                  Statistical lead-generation only. This profile carries no inference of guilt and
                  authorizes no action by itself.
                </p>
              </div>
            ) : (
              <p className="text-sm text-ink-faint">Open a registry record to read its risk rationale and network.</p>
            )}
          </Panel>
        </div>
      )}
    </ViewFrame>
  );
}
