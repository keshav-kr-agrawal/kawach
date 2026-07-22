import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldMark, LockGlyph, ArrowRight } from '../ui/glyphs.jsx';
import { api } from '../api/client.js';

const ACCOUNTS = {
  dgp: { password: 'dgp123', role: 'DGP', scope: 'State-wide command' },
  sp: { password: 'sp123', role: 'SP', scope: 'District command' },
  sho: { password: 'sho123', role: 'SHO', scope: 'Station house' },
  constable: { password: 'constable123', role: 'Constable', scope: 'Assigned cases' },
};

const lineReveal = {
  hidden: { y: '110%' },
  show: (i) => ({
    y: 0,
    transition: { delay: 0.15 + i * 0.12, duration: 0.7, ease: [0.22, 0.61, 0.36, 1] },
  }),
};

export default function LoginView({ onLogin }) {
  const [username, setUsername] = useState('dgp');
  const [password, setPassword] = useState('dgp123');
  const [step, setStep] = useState('credentials'); // credentials | mfa
  const [pending, setPending] = useState(null);
  const [mfa, setMfa] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const account = ACCOUNTS[username] || ACCOUNTS.dgp;

  const submitCredentials = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotice('');
    try {
      // A real network-down backend already resolves through client.js's
      // own mock fallback (it returns a working simulated session), so
      // reaching this catch means the LIVE backend actively rejected the
      // credentials (wrong password / unseeded account) — that's a real
      // error the officer needs to see and fix, not something to paper
      // over with a fake session that will 401 on every later request.
      const data = await api.post('/auth/login-json', {
        username,
        password,
        role: account.role,
        district_id: null,
      });
      setPending(data);
      setLoading(false);
      setStep('mfa');
    } catch (err) {
      setLoading(false);
      setNotice(err?.status === 401
        ? 'Incorrect username or password for this account.'
        : `Login failed: ${err?.message || 'unknown error'}`);
    }
  };

  const submitMfa = (e) => {
    e.preventDefault();
    onLogin(pending);
  };

  return (
    <div className="grid min-h-screen bg-paper-warm lg:grid-cols-[7fr_5fr]">
      {/* Narrative panel — the award beat */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-amber-950 p-12 text-amber-50 lg:flex">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-amber-700/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="flex items-center gap-3">
          <ShieldMark className="h-9 w-8 text-amber-300" />
          <div>
            <p className="font-display text-xl font-semibold tracking-wide">KAWACH</p>
            <p className="font-mono text-[0.62rem] uppercase tracking-wide2 text-amber-300">
              Police Command Console
            </p>
          </div>
        </div>

        <div>
          <h1 className="font-display text-5xl font-medium leading-[1.05] tracking-tight xl:text-6xl">
            {['The state watches', 'the pattern,', 'not the person.'].map((line, i) => (
              <span key={line} className="block overflow-hidden">
                <motion.span
                  className={`block ${i === 1 ? 'italic font-light text-amber-300' : ''}`}
                  variants={lineReveal}
                  initial="hidden"
                  animate="show"
                  custom={i}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-6 max-w-md text-sm leading-relaxed text-amber-200"
          >
            Hotspot clustering, fraud-ring graphs, live digital-arrest interception, and
            hash-sealed evidence dossiers — one console, scoped to your rank, with every
            query written to an immutable audit log.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="flex items-center justify-between border-t border-amber-800 pt-5 font-mono text-[0.62rem] uppercase tracking-wide2 text-amber-400"
        >
          <span>Audit-logged access</span>
          <span>BSA §63 chain of custody</span>
        </motion.div>
      </section>

      {/* Credential panel */}
      <section className="flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <ShieldMark className="h-8 w-7 text-amber-700" />
            <p className="font-display text-lg font-semibold">KAWACH Command</p>
          </div>

          <p className="kicker">Restricted access</p>
          <h2 className="mt-2 font-display text-3xl font-medium tracking-tight">
            {step === 'credentials' ? 'Identify yourself.' : 'Second factor.'}
          </h2>

          {notice && (
            <p className="mt-4 rounded-ledger border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {notice}
            </p>
          )}

          {step === 'credentials' ? (
            <form onSubmit={submitCredentials} className="mt-8 space-y-5">
              <div>
                <label className="tag mb-2 block" htmlFor="rank">Rank profile</label>
                <select
                  id="rank"
                  className="field cursor-pointer"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setPassword(ACCOUNTS[e.target.value].password);
                  }}
                >
                  <option value="dgp">DGP — state-wide command</option>
                  <option value="sp">SP — district command</option>
                  <option value="sho">SHO — station house</option>
                  <option value="constable">Constable — assigned cases</option>
                </select>
              </div>
              <div>
                <label className="tag mb-2 block" htmlFor="pw">Passphrase</label>
                <input
                  id="pw"
                  type="password"
                  className="field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-ink w-full" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify credentials'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <p className="text-center text-[0.7rem] text-ink-faint">{account.scope}</p>
            </form>
          ) : (
            <form onSubmit={submitMfa} className="mt-8 space-y-5">
              <div className="flex items-start gap-3 rounded-ledger border border-amber-200 bg-amber-50 p-3.5">
                <LockGlyph className="mt-0.5 h-4 w-4 flex-none text-amber-700" />
                <p className="text-xs leading-relaxed text-ink-soft">
                  Demo token challenge — any six digits authorize this session.
                </p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="field text-center font-mono text-lg tracking-[0.5em]"
                placeholder="······"
                value={mfa}
                onChange={(e) => setMfa(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
              <button type="submit" className="btn-ink w-full">
                Authorize session
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setStep('credentials')}
                className="w-full text-center font-mono text-[0.64rem] uppercase tracking-tag text-ink-faint hover:text-ink"
              >
                Back to credentials
              </button>
            </form>
          )}
        </motion.div>
      </section>
    </div>
  );
}
