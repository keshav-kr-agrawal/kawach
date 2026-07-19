import React, { useEffect, useState } from 'react';

/**
 * KAWACH gateway landing — uimax dual-hue system (white base + one amber
 * hue; severity/emphasis = darkness, never a new color). Wires all three
 * surfaces: the citizen app (in-app), the police command console and the
 * eleven-desk department grid (both shipped statically under /public).
 */

const POLICE_URL = '/police/index.html';
const DEPT_HOME = '/departments/index.html';
const DEPT_ADMIN = '/departments/admin.html';
const deskUrl = (id) => `/departments/dashboard.html?dept=${id}`;

const DESKS = [
  { id: 'pwd-roads', name: 'Public Works — Roads', note: 'Potholes · road damage' },
  { id: 'pwd-buildings', name: 'Public Works — Buildings', note: 'Unsafe structures' },
  { id: 'electricity', name: 'Electricity', note: 'Outages · live-wire hazards' },
  { id: 'water', name: 'Water Supply', note: 'Bursts · contamination · floods' },
  { id: 'sanitation', name: 'Sanitation', note: 'Garbage · blackspots' },
  { id: 'pollution-noise', name: 'Pollution & Noise', note: 'Effluents · noise' },
  { id: 'traffic', name: 'Traffic', note: 'Signals · obstructions' },
  { id: 'fire', name: 'Fire & Emergency', note: '15-minute SLA floor' },
  { id: 'health', name: 'Public Health', note: 'Outbreaks · food safety' },
  { id: 'education', name: 'Education', note: 'School infrastructure' },
  { id: 'police', name: 'Police & Law Enforcement', note: 'Crime · fraud · 4-hour floor' },
];

const PIPELINES = [
  ['Deepfake forensics', 'MTCNN + dual EfficientNet-B7 vote on every frame before evidence is trusted.'],
  ['Routing & urgency', 'Free text becomes the right desk and tier — with an offline keyword fallback.'],
  ['Scene verification', 'YOLO12s + SigLIP confirm the video shows what the report claims.'],
  ['Trust fusion', 'Deterministic 0–100 trust and urgency scores. Same input, same score.'],
  ['Hotspot clustering', 'DBSCAN on real haversine distance turns incidents into patrol targets.'],
  ['Counterfeit currency', '98.67% CNN + RBI telescopic-serial OCR checks on a single photo.'],
  ['Digital-arrest interception', 'Live call signals fuse to one score; dispatch fires before the transfer.'],
];

const PILLARS = [
  { num: '01', title: 'Data Ingestion', desc: 'Multi-modal ingestion of complaint diaries, beat patrols, FIR databases, and public feeds.' },
  { num: '02', title: 'Entity Resolution', desc: 'High-speed deduplication matching phone numbers, suspect aliases, and multiple identities.' },
  { num: '03', title: 'Criminal Intelligence Graph', desc: 'Force-directed network analysis linking suspects to bank accounts, IMEIs, and locations.' },
  { num: '04', title: 'Repeat Offender Rank', desc: 'Calculates dynamic recidivism risks for active gang clusters and parolees.' },
  { num: '05', title: 'Hotspot Analytics', desc: 'Spatial DBSCAN clustering overlays mapping high-density crime sectors.' },
  { num: '06', title: 'Predictive Policing', desc: 'Proximity-based risk forecasting without community profiling or demographic bias.' },
  { num: '07', title: 'AI Anomaly Detection', desc: 'Unsupervised neural networks spotting localized burglary and theft spikes.' },
  { num: '08', title: 'Socio-Economic Correlation', desc: 'Overlays streetlight outages, employment rates, and ward income data with incidents.' },
  { num: '09', title: 'GEOINT GIS Layers', desc: 'Dynamic spatial layers showing police station boundaries, patrol zones, and hospitals.' },
  { num: '10', title: 'Real-Time Control Room', desc: 'Centralized dispatches and live emergency interlocks for command operators.' },
  { num: '11', title: 'Emergency Interlock Dispatch', desc: 'Automated routing of critical citizen alerts directly to precinct patrol cars.' },
  { num: '12', title: 'AI Investigation Copilot', desc: 'High-speed Graph-RAG timeline summaries and court-ready Section 65B dossiers.' },
  { num: '13', title: 'Computer Vision Analytics', desc: 'Live 4-grid street video analysis checking for weapons, crowd sizes, and counter-trespass.' },
  { num: '14', title: 'Face Analytics Watchlist', desc: 'Real-time facial recognition comparing camera feeds against missing persons files.' },
  { num: '15', title: 'District Performance Analytics', desc: 'SP-level clearance speed charts, conviction ratios, and patrol response times.' },
  { num: '16', title: 'Mobile Field Patrolling', desc: 'Offline-first SQLite patrolling grids with automatic background cloud synchronization.' },
  { num: '17', title: 'DGP/SP Executive Console', desc: 'Command dashboard for top-level officers tracking statewide metrics.' },
  { num: '18', title: 'Immutable Audit Trails', desc: 'Section 65B SHA-256 compliance hashing securing legal chain of custody.' },
  { num: '19', title: 'Secure Compliance Vault', desc: 'Access control logging that logs all suspect profile updates.' },
  { num: '20', title: 'Ethics & Fairness Guardrails', desc: 'Strict algorithmic boundaries blocking caste, religion, or community profiling.' },
  { num: '21', title: 'Multi-Factor Passcode Gateway', desc: 'Cryptographic MFA protecting command console intranet sessions.' },
  { num: '22', title: 'Station Clearance Metrics', desc: 'Station-by-station response speeds and case resolution statistics.' },
  { num: '23', title: 'WhatsApp Webhook Scanners', desc: 'Automates public scanning of suspect messages and links using text classifiers.' },
  { num: '24', title: 'ANPR Vehicle Spotting', desc: 'Automatic license plate recognition spotting watchlist cars at toll gates.' },
  { num: '25', title: 'Database Case Extender', desc: 'Seamlessly scales databases with missing persons, unidentified bodies, and CDRs.' },
  { num: '26', title: 'Sentinel Ghost Grid', desc: 'Encrypted citizen PWA with on-device EXIF scrubbing for anonymous reporting.' },
  { num: '27', title: 'Multilingual Copilot', desc: 'Speech-to-text voice command inputs supporting English and Kannada.' },
  { num: '28', title: 'Socio-Economic Choropleth', desc: 'Visual choropleth map overlays identifying poverty-crime causal links.' },
  { num: '29', title: 'Deepfake & Spoof Defense', desc: 'Identifies synthesized voice clones and checks CBI video call authenticity.' },
];

function ShieldMark({ className }) {
  return (
    <svg viewBox="0 0 24 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" className={className} aria-hidden="true">
      <path d="M12 2 L22 6 V14 C22 21 17.5 25 12 27 C6.5 25 2 21 2 14 V6 Z" />
      <path d="M7 12 L12 17 L17 12" />
      <path d="M7 8.5 L12 13.5 L17 8.5" opacity="0.45" />
    </svg>
  );
}

function Kicker({ children }) {
  return <p className="font-mono text-[0.68rem] uppercase tracking-wide2 text-amber-600">{children}</p>;
}

function BandHead({ num, children }) {
  return (
    <div className="mb-8 flex items-baseline gap-5">
      <span className="whitespace-nowrap font-mono text-[0.7rem] tracking-tag text-amber-500">{num}</span>
      <h2 className="font-display text-2xl font-medium tracking-tight text-ink md:text-3xl">{children}</h2>
    </div>
  );
}

const CARD =
  'group flex flex-col gap-4 rounded-sm border border-amber-300 bg-white p-8 text-left transition hover:-translate-y-1 hover:shadow-[0_22px_44px_-20px_rgba(62,47,6,0.45)]';
const CARD_CTA =
  'rounded-sm bg-amber-950 px-4 py-3 text-center font-mono text-[0.62rem] uppercase tracking-tag text-amber-50 transition group-hover:bg-amber-700';
const GATE_BTN =
  'rounded-sm bg-amber-950 px-6 py-3.5 font-mono text-[0.66rem] uppercase tracking-tag text-amber-50 transition hover:bg-amber-700';

export default function LandingPageView({ onEnterCitizen }) {
  const [now, setNow] = useState(new Date());
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    const raf = requestAnimationFrame(() => setRevealed(true));
    return () => { clearInterval(t); cancelAnimationFrame(raf); };
  }, []);

  const line = (i) => ({
    display: 'block',
    transform: revealed ? 'translateY(0)' : 'translateY(110%)',
    transition: `transform .8s cubic-bezier(.22,.61,.36,1) ${0.15 + i * 0.13}s`,
  });

  return (
    <div className="min-h-screen bg-paper-warm font-ui text-ink">
      {/* topbar */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-200 bg-paper-warm/90 px-5 py-4 backdrop-blur md:px-12">
        <div className="flex items-center gap-3">
          <ShieldMark className="h-8 w-7 text-amber-700" />
          <div>
            <p className="font-display text-lg font-semibold tracking-wide">KAWACH</p>
            <p className="hidden font-mono text-[0.6rem] uppercase tracking-wide2 text-ink-faint sm:block">Public Safety Grid</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <span className="hidden font-mono text-[0.68rem] tabular-nums tracking-tag text-amber-700 md:block">
            {now.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).toUpperCase()}
          </span>
          <a href="#access" className="rounded-sm border border-amber-500 px-4 py-2 font-mono text-[0.64rem] uppercase tracking-tag text-amber-800 transition hover:bg-amber-950 hover:text-amber-50">
            Access Gate
          </a>
        </div>
      </header>

      {/* S·01 hero */}
      <section className="flex min-h-[88vh] flex-col justify-center px-5 py-20 md:px-12">
        <Kicker>Crime analytics × digital public safety · Bengaluru command</Kicker>
        <h1 className="mt-4 max-w-4xl font-display text-5xl font-medium leading-[1.02] tracking-tight md:text-7xl">
          <span className="block overflow-hidden"><span style={line(0)}>One shield.</span></span>
          <span className="block overflow-hidden">
            <span style={line(1)}><em className="font-light italic text-amber-700">Two</em> frontlines.</span>
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-ink-soft md:text-base">
          On the street: potholes, fires, broken mains, crime clusters. On the phone:
          digital-arrest calls, deepfakes, counterfeit notes, mule networks. KAWACH watches
          both — and keeps the citizen anonymous while the state acts.
        </p>
        <div className="mt-12 flex flex-wrap gap-8 border-t border-amber-300 pt-5">
          {[['7', 'AI pipelines'], ['11', 'Civic departments'], ['3,974', 'Law sections'], ['98.67%', 'Currency CNN accuracy']].map(([n, l]) => (
            <div key={l}>
              <p className="font-mono text-2xl font-semibold tabular-nums text-amber-950">{n}</p>
              <p className="font-mono text-[0.6rem] uppercase tracking-tag text-ink-faint">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* S·02 access gate — the three surfaces */}
      <section id="access" className="border-t border-amber-300 px-5 py-20 md:px-12">
        <BandHead num="S·02">Three surfaces. <em className="font-light italic text-amber-700">Pick your side of the shield.</em></BandHead>
        <div className="grid gap-6 md:grid-cols-3">
          <button onClick={onEnterCitizen} className={CARD}>
            <ShieldMark className="h-11 w-10 text-amber-700" />
            <h3 className="font-display text-xl font-medium">Citizen App</h3>
            <p className="flex-1 text-sm text-ink-soft">
              Report hazards, verify suspect notes and calls, talk to Nayak — the
              law-backed counsel. De-identified before anything leaves your phone.
            </p>
            <span className={CARD_CTA}>Enter as citizen →</span>
          </button>

          <a href={DEPT_HOME} className={CARD}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" className="h-11 w-10 text-amber-700" aria-hidden="true">
              <path d="M4 21 V8 H11 V21 M14 21 V4 H20 V21 M2 21 H22" />
              <path d="M6.5 11 H8.5 M6.5 14.5 H8.5 M16 7.5 H18 M16 11 H18 M16 14.5 H18" />
            </svg>
            <h3 className="font-display text-xl font-medium">Department Grid</h3>
            <p className="flex-1 text-sm text-ink-soft">
              Eleven municipal desks, one dashboard shell, one SLA engine. Fire answers in
              fifteen minutes; nothing expires quietly.
            </p>
            <span className={CARD_CTA}>Enter the grid →</span>
          </a>

          <a href={POLICE_URL} className={CARD}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" className="h-11 w-10 text-amber-700" aria-hidden="true">
              <path d="M12 2 L21 5.5 V12 C21 18 17 21.5 12 23 C7 21.5 3 18 3 12 V5.5 Z" />
              <path d="M12 8 L13.2 10.6 L16 10.9 L14 12.9 L14.5 15.7 L12 14.3 L9.5 15.7 L10 12.9 L8 10.9 L10.8 10.6 Z" opacity="0.55" />
            </svg>
            <h3 className="font-display text-xl font-medium">Police Command Console</h3>
            <p className="flex-1 text-sm text-ink-soft">
              Hotspot clustering, fraud-ring graphs, live digital-arrest interception, and
              hash-sealed dossiers — scoped by rank, audit-logged.
            </p>
            <span className={CARD_CTA}>Open the console →</span>
          </a>
        </div>
      </section>

      {/* S·03 all eleven desks, individually wired */}
      <section className="border-t border-amber-300 px-5 py-20 md:px-12">
        <BandHead num="S·03">Every desk, <em className="font-light italic text-amber-700">one click deep.</em></BandHead>
        <div className="border-t border-amber-300">
          {DESKS.map((d, i) => (
            <a
              key={d.id}
              href={deskUrl(d.id)}
              className="group grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-4 border-b border-amber-200 px-2 py-4 transition hover:bg-amber-50 md:grid-cols-[64px_minmax(0,1fr)_auto]"
            >
              <span className="font-mono text-[0.7rem] tracking-tag text-amber-500">{String(i + 1).padStart(2, '0')}</span>
              <span>
                <span className="font-display text-base font-medium md:text-lg">{d.name}</span>
                <span className="block text-xs text-ink-faint">{d.note}</span>
              </span>
              <span className="hidden font-mono text-[0.6rem] uppercase tracking-tag text-amber-700 transition-all group-hover:tracking-[0.28em] md:block">
                Open desk →
              </span>
            </a>
          ))}
        </div>
        <a href={DEPT_ADMIN} className="mt-6 inline-block rounded-sm border border-amber-500 px-5 py-3 font-mono text-[0.64rem] uppercase tracking-tag text-amber-800 transition hover:bg-amber-950 hover:text-amber-50">
          Master console — all queues, worst first →
        </a>
      </section>

      {/* S·04 pipelines */}
      <section className="border-t border-amber-300 px-5 py-20 md:px-12">
        <BandHead num="S·04">Seven pipelines <em className="font-light italic text-amber-700">under the hood.</em></BandHead>
        <div className="grid gap-px overflow-hidden rounded-sm border border-amber-300 bg-amber-300 sm:grid-cols-2 lg:grid-cols-4">
          {PIPELINES.map(([title, desc], i) => (
            <div key={title} className="bg-white p-6">
              <p className="mb-2 font-mono text-[0.66rem] tracking-tag text-amber-500">{String(i + 1).padStart(2, '0')}</p>
              <h4 className="text-sm font-semibold">{title}</h4>
              <p className="mt-1 text-xs leading-relaxed text-ink-faint">{desc}</p>
            </div>
          ))}
          <div className="flex items-center justify-center bg-amber-950 p-6">
            <p className="text-center font-display text-sm italic text-amber-200">One classifier serves all three surfaces.</p>
          </div>
        </div>
      </section>

      {/* S·05 the 29 strategic pillars */}
      <section className="border-t border-amber-300 px-5 py-20 md:px-12">
        <BandHead num="S·05">Twenty-nine pillars, <em className="font-light italic text-amber-700">one doctrine.</em></BandHead>
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.num} className="border-l-2 border-amber-300 pl-4">
              <p className="font-mono text-[0.62rem] tracking-tag text-amber-500">P·{p.num}</p>
              <h4 className="mt-0.5 text-sm font-semibold">{p.title}</h4>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-faint">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* S·06 anonymity — dark beat */}
      <section className="border-t border-amber-300 bg-amber-950 px-5 py-24 text-amber-50 md:px-12">
        <p className="font-mono text-[0.68rem] uppercase tracking-wide2 text-amber-300">S·06 · The boundary</p>
        <h2 className="mt-4 max-w-3xl font-display text-3xl font-medium leading-tight tracking-tight md:text-5xl">
          A report crosses the wall carrying evidence, location, and urgency —{' '}
          <em className="font-light italic text-amber-200">never a name.</em>
        </h2>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-amber-200">
          Department and police queries read a fixed, identity-free column list. Who filed
          stays on the citizen side, permanently, by construction.
        </p>
      </section>

      {/* S·07 closing gate */}
      <section className="px-5 py-20 md:px-12">
        <BandHead num="S·07">The city is already reporting. <em className="font-light italic text-amber-700">Take your seat.</em></BandHead>
        <div className="flex flex-wrap gap-4">
          <button onClick={onEnterCitizen} className={GATE_BTN}>Citizen App</button>
          <a href={DEPT_HOME} className={GATE_BTN}>Department Grid</a>
          <a href={POLICE_URL} className={GATE_BTN}>Police Console</a>
        </div>
      </section>

      <footer className="flex flex-wrap justify-between gap-4 border-t border-amber-800 bg-amber-950 px-5 py-5 font-mono text-[0.6rem] uppercase tracking-tag text-amber-300 md:px-12">
        <span>KAWACH · One shield, two frontlines</span>
        <span>Identity-free by construction · CodeKrafters</span>
      </footer>
    </div>
  );
}
