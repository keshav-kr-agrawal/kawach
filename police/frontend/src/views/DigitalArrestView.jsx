import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api, postFile } from '../api/client.js';
import { ViewFrame, Panel, ErrorNote, Idx } from '../ui/kit.jsx';
import { WaveGlyph } from '../ui/glyphs.jsx';

/**
 * Digital Arrest live-session monitor (/api/digital-arrest).
 * Multi-modal signals fuse into one 0–100 risk score; at ≥70 the backend
 * flips the session to ALERT_DISPATCHED — before the transfer, audit-logged.
 */

const MODALITY_LABEL = { text: 'Script', voice: 'Voice', video: 'Video', transaction: 'Money' };

function RiskDial({ score, status }) {
  const alerted = status === 'ALERT_DISPATCHED';
  return (
    <div className={`rounded-ledger p-6 ${alerted ? 'bg-amber-950 text-amber-50' : 'bg-amber-50 text-ink'}`}>
      <div className="flex items-end justify-between">
        <div>
          <p className={`font-mono text-5xl font-semibold tabular-nums ${alerted ? 'text-amber-300' : 'text-amber-950'}`}>
            {score}
          </p>
          <p className="tag mt-1 opacity-80">Fused risk / 100 · alert at 70</p>
        </div>
        <span className={`chip ${alerted ? 'chip-critical' : 'chip-medium'}`}>
          {alerted && <span className="pulse-dot" />}
          {alerted ? 'Alert dispatched' : 'Monitoring'}
        </span>
      </div>
      <div className={`mt-4 h-2 overflow-hidden rounded-full ${alerted ? 'bg-amber-800' : 'bg-amber-100'}`}>
        <motion.div
          className={`h-full ${alerted ? 'bg-amber-300' : 'bg-amber-700'}`}
          animate={{ width: `${Math.min(100, score)}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      {alerted && (
        <p className="mt-3 text-xs leading-relaxed text-amber-200">
          Session crossed the fusion threshold before any transfer completed. Victim advisory
          issued; suspect line queued for telco escalation. Everything is in the audit log.
        </p>
      )}
    </div>
  );
}

export default function DigitalArrestView() {
  const [sessions, setSessions] = useState([]);
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [victimPhone, setVictimPhone] = useState('');
  const [suspectPhone, setSuspectPhone] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [amount, setAmount] = useState('');

  const refreshList = () => api.get('/digital-arrest/sessions').then(setSessions).catch(() => {});
  useEffect(() => { refreshList(); }, []);

  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      refreshList();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const startSession = () =>
    run(async () => {
      setSession(await api.post('/digital-arrest/session/start', {
        victim_phone: victimPhone || null,
        suspect_phone: suspectPhone || null,
        notes: 'Opened from command console',
      }));
    });

  const signal = (body) =>
    run(async () => {
      setSession(await api.post(`/digital-arrest/session/${session.id}/signal`, body));
    });

  const signalFile = (kind, file) =>
    run(async () => {
      setSession(await postFile(`/digital-arrest/session/${session.id}/signal/${kind}`, file));
    });

  return (
    <ViewFrame
      kicker="Text ·30 / voice ·20 / video ·20 / transaction ·30 + corroboration bonus"
      title="Intercept the scam"
      titleEm="mid-call."
      lede="A live 'digital arrest' call becomes a monitored session. Each signal — scam script, spoofed voice, deepfake video, anomalous transfer — raises one fused score. At seventy, dispatch fires before the money leaves."
    >
      {error && <ErrorNote error={error} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {!session ? (
            <Panel title="Open a live session" tag="pre-checks run on the suspect line">
              <form
                className="grid gap-4 sm:grid-cols-2"
                onSubmit={(e) => { e.preventDefault(); startSession(); }}
              >
                <label className="flex flex-col gap-1.5">
                  <span className="tag">Victim line</span>
                  <input className="field font-mono" placeholder="98450 12345" value={victimPhone} onChange={(e) => setVictimPhone(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="tag">Suspect line (optional)</span>
                  <input className="field font-mono" placeholder="99887 76655" value={suspectPhone} onChange={(e) => setSuspectPhone(e.target.value)} />
                </label>
                <button type="submit" className="btn-ink sm:col-span-2" disabled={busy}>
                  <WaveGlyph className="h-4 w-4" />
                  {busy ? 'Opening…' : 'Start monitoring'}
                </button>
              </form>
              <p className="mt-4 text-xs leading-relaxed text-ink-faint">
                If the suspect line is known, its call-burst history and mule-network shape are
                checked the moment the session opens.
              </p>
            </Panel>
          ) : (
            <>
              <RiskDial score={session.risk_score} status={session.status} />

              <Panel title="Feed signals" tag={`session ${session.id}`}>
                <div className="grid gap-5 md:grid-cols-2">
                  <form
                    className="flex flex-col gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (scriptText.trim()) signal({ modality: 'text', content: scriptText.trim() });
                    }}
                  >
                    <span className="tag">Caller's script (live transcript)</span>
                    <textarea
                      className="field min-h-20 text-xs"
                      placeholder='"This is CBI. Your Aadhaar is linked to money laundering. Stay on video, do not tell anyone…"'
                      value={scriptText}
                      onChange={(e) => setScriptText(e.target.value)}
                    />
                    <button className="btn-line" disabled={busy}>Score script</button>
                  </form>

                  <form
                    className="flex flex-col gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const n = Number(amount);
                      if (n > 0) signal({ modality: 'transaction', amount_inr: n, account_monthly_txn_count: 3 });
                    }}
                  >
                    <span className="tag">Attempted transfer (₹)</span>
                    <input
                      className="field font-mono" type="number" min="1" placeholder="250000"
                      value={amount} onChange={(e) => setAmount(e.target.value)}
                    />
                    <button className="btn-line" disabled={busy}>Flag transfer attempt</button>
                  </form>

                  <label className="flex flex-col gap-2">
                    <span className="tag">Call-frame screenshot (real deepfake check)</span>
                    <input
                      type="file" accept="image/*" disabled={busy}
                      className="field text-xs"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) signalFile('video-frame', f); e.target.value = ''; }}
                    />
                    <p className="text-[0.64rem] text-ink-faint">
                      Uploads a still from the video call to the Classifier's real MTCNN +
                      dual-EfficientNet-B7 deepfake pipeline. No probability is invented client-side.
                    </p>
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="tag">Voice clip · 16-bit PCM WAV (acoustic heuristic)</span>
                    <input
                      type="file" accept="audio/wav,.wav" disabled={busy}
                      className="field text-xs"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) signalFile('voice-clip', f); e.target.value = ''; }}
                    />
                    <p className="text-[0.64rem] text-ink-faint">
                      Runs a classical DSP heuristic (spectral flatness, pitch jitter, envelope
                      regularity) — honestly a proxy, not a trained voice-spoof model.
                    </p>
                  </label>
                </div>
              </Panel>

              <Panel title="Session timeline" tag={`${session.signals?.length || 0} signal(s) fused`}>
                <ol className="max-h-72 space-y-3 overflow-y-auto border-l border-amber-200 pl-4">
                  {[...(session.timeline || [])].reverse().map((t, i) => (
                    <li key={i} className="relative text-xs leading-relaxed text-ink-soft">
                      <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-amber-500" />
                      <span className="mr-2 font-mono text-[0.62rem] text-ink-faint">
                        {new Date(t.at).toLocaleTimeString('en-IN', { hour12: false })}
                      </span>
                      {t.event}
                    </li>
                  ))}
                </ol>
                <button className="btn-line mt-4" onClick={() => setSession(null)}>
                  Close view (session keeps monitoring)
                </button>
              </Panel>
            </>
          )}
        </div>

        <Panel title="Session register" tag="most recent first">
          <ol className="divide-y divide-amber-100">
            {sessions.map((s, i) => (
              <li
                key={s.id}
                className="flex cursor-pointer items-center gap-3 py-3 transition hover:bg-amber-50"
                onClick={() => setSession(s)}
              >
                <Idx n={i + 1} />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs">{s.id}</p>
                  <p className="text-[0.66rem] text-ink-faint">
                    {new Date(s.started_at).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono text-sm font-semibold tabular-nums text-amber-900">{s.risk_score}</span>
                  <span className={`chip ${s.status === 'ALERT_DISPATCHED' ? 'chip-critical' : 'chip-medium'}`}>
                    {s.status === 'ALERT_DISPATCHED' ? 'Alerted' : 'Live'}
                  </span>
                </div>
              </li>
            ))}
            {!sessions.length && (
              <p className="py-6 text-xs text-ink-faint">
                No sessions yet. Sessions are in-memory on the backend — they reset with it.
              </p>
            )}
          </ol>
          {(() => {
            const modalities = session?.signals ? Object.entries(
              session.signals.reduce((acc, s) => ({ ...acc, [s.modality]: s.strength }), {}),
            ) : [];
            return modalities.length > 0 && (
              <div className="mt-5 border-t border-amber-100 pt-4">
                <p className="tag mb-3">Latest strength per modality</p>
                {modalities.map(([m, s]) => (
                  <div key={m} className="mb-2 flex items-center gap-3">
                    <span className="w-14 font-mono text-[0.64rem] uppercase tracking-tag text-ink-soft">
                      {MODALITY_LABEL[m] || m}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-amber-100">
                      <div className="h-full bg-amber-700" style={{ width: `${s * 100}%` }} />
                    </div>
                    <span className="font-mono text-[0.64rem] tabular-nums text-ink-soft">{(s * 100).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </Panel>
      </div>
    </ViewFrame>
  );
}
