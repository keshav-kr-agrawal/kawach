import React, { useEffect, useState } from 'react';

/**
 * KAWACH gateway landing — uimax dual-hue system (white base + one amber
 * hue; severity/emphasis = darkness, never a new color). Wires all three
 * surfaces: the citizen app (in-app), the police command console and the
 * eleven-desk department grid (both shipped statically under /public).
 */

const POLICE_URL = '/police/index.html';

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
    <div className="min-h-screen w-full bg-paper-warm font-ui text-ink overflow-y-auto">
      {/* topbar */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-200 bg-paper-warm/90 px-5 py-4 backdrop-blur md:px-12">
        <div className="flex items-center gap-3">
          <img src="/kawach.png" alt="KAWACH Logo" className="h-9 w-9 object-contain" />
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

      {/* S·02 access gate — the two portal surfaces */}
      <section id="access" className="border-t border-amber-300 px-5 py-20 md:px-12">
        <BandHead num="S·02">Two surfaces. <em className="font-light italic text-amber-700">Pick your side of the shield.</em></BandHead>
        <div className="grid gap-6 md:grid-cols-2 max-w-5xl">
          <button onClick={onEnterCitizen} className={CARD}>
            <img src="/kawach.png" alt="KAWACH Logo" className="h-11 w-11 object-contain" />
            <h3 className="font-display text-2xl font-semibold">Citizen App</h3>
            <p className="flex-1 text-sm text-ink-soft leading-relaxed">
              Report hazards, verify suspect currency notes &amp; digital-arrest calls with Nayak — the
              law-backed AI counsel. De-identified before anything leaves your phone.
            </p>
            <span className={CARD_CTA}>Enter as citizen →</span>
          </button>

          <a href={POLICE_URL} className={CARD}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" className="h-11 w-10 text-amber-700" aria-hidden="true">
              <path d="M12 2 L21 5.5 V12 C21 18 17 21.5 12 23 C7 21.5 3 18 3 12 V5.5 Z" />
              <path d="M12 8 L13.2 10.6 L16 10.9 L14 12.9 L14.5 15.7 L12 14.3 L9.5 15.7 L10 12.9 L8 10.9 L10.8 10.6 Z" opacity="0.55" />
            </svg>
            <h3 className="font-display text-2xl font-semibold">Police Command Console</h3>
            <p className="flex-1 text-sm text-ink-soft leading-relaxed">
              Hotspot DBSCAN spatial clustering, Louvain fraud-ring graphs, live digital-arrest interception, and
              SHA-256 court-admissible evidence dossiers.
            </p>
            <span className={CARD_CTA}>Open command console →</span>
          </a>
        </div>
      </section>

      {/* S·03 the dual-frontline paradox */}
      <section className="border-t border-amber-300 px-5 py-20 md:px-12">
        <BandHead num="S·03">The dual-frontline <em className="font-light italic text-amber-700">paradox.</em></BandHead>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4 text-sm leading-relaxed text-ink-soft">
            <p>Modern cities suffer from two concurrent emergencies: physical infrastructure decay on the streets and high-tech extortion in citizen pockets.</p>
            <p>A "digital arrest" call holds a victim hostage for hours via fake CBI video calls until life savings disappear. Simultaneously, physical potholes and municipal hazards go unaddressed due to fragmented routing.</p>
          </div>
          <div className="space-y-4">
            <div className="rounded-sm border-l-4 border-amber-950 border-y border-r border-amber-300 bg-white p-6">
              <span className="font-mono text-[0.62rem] uppercase tracking-tag text-amber-600">FRONTLINE 01 · Physical Safety</span>
              <h3 className="mt-1 font-display text-lg font-semibold">Street &amp; Civic Hazards</h3>
              <p className="mt-1 text-xs text-ink-faint">Potholes, structural fires, water main bursts, illegal dumping, and unlit transit corridors.</p>
            </div>
            <div className="rounded-sm border-l-4 border-amber-600 border-y border-r border-amber-300 bg-white p-6">
              <span className="font-mono text-[0.62rem] uppercase tracking-tag text-amber-600">FRONTLINE 02 · Digital Threats</span>
              <h3 className="mt-1 font-display text-lg font-semibold">Cyber &amp; Financial Extortion</h3>
              <p className="mt-1 text-xs text-ink-faint">Digital arrest scams, deepfake video impersonation, counterfeit currency notes, and syndicate bank mule networks.</p>
            </div>
          </div>
        </div>
      </section>

      {/* S·04 7-core AI neural engines */}
      <section className="border-t border-amber-300 px-5 py-20 md:px-12">
        <BandHead num="S·04">7-Core AI <em className="font-light italic text-amber-700">neural engines.</em></BandHead>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['🎭 Deepfake Forensics', 'Dual EfficientNet-B7 ensemble sampling 32 frames deep. MTCNN face detection calculates frame-consensus authenticity scores.', 'MTCNN + 2× EfficientNet-B7'],
            ['💵 Counterfeit Currency CNN', 'Trained on 6,304 note images. Integrates 4 classical checks: security thread, microprint sharpness, and RBI serial OCR.', '98.67% Accuracy · AUC 0.998'],
            ['🚨 Scene Verification', 'YOLO12s road damage detection fused with SigLIP waste classifier. Persistence ratio gate prevents single-frame synthetic illusions.', 'YOLO12s + SigLIP'],
            ['🗺️ DBSCAN Hotspotting', 'Haversine spatial clustering groups incidents into real-time patrol zones with centroid threat vectors.', 'DBSCAN Spatial Clustering'],
            ['🕸️ Fraud Ring Graph AI', 'Louvain community detection & betweenness centrality reveal hidden syndicate mule accounts and phone networks.', 'Louvain Graph AI'],
            ['⚖️ Nayak BNS Legal RAG', '3,974 indexed sections across BNS, Motor Vehicles Act, CrPC & RBI circulars. Citation-backed legal advice.', '3,974 Sections Indexed']
          ].map(([title, desc, badge]) => (
            <div key={title} className="rounded-sm border border-amber-300 bg-white p-6 flex flex-col justify-between">
              <div>
                <h4 className="font-display text-base font-semibold text-ink">{title}</h4>
                <p className="mt-2 text-xs leading-relaxed text-ink-faint">{desc}</p>
              </div>
              <span className="mt-4 inline-block font-mono text-[0.6rem] uppercase tracking-tag text-amber-700 bg-amber-100/70 px-2 py-1 rounded-sm w-fit">{badge}</span>
            </div>
          ))}
        </div>
      </section>

      {/* S·05 live digital-arrest interception */}
      <section className="border-t border-amber-300 px-5 py-20 md:px-12">
        <BandHead num="S·05">Live digital-arrest <em className="font-light italic text-amber-700">interception.</em></BandHead>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4 text-sm leading-relaxed text-ink-soft">
            <p>A "digital arrest" scam relies on keeping the victim isolated on continuous video calls while impersonating enforcement agencies (CBI, ED, Cyber Crime Police).</p>
            <p>KAWACH monitors active sessions using a 4-phase weighted fusion engine: script keyphrase match (.30), voice-spoof probability (.20), deepfake video consensus (.20), and transaction anomaly (.30). When the score crosses 70, dispatch fires automatically before money leaves the account.</p>
          </div>
          <div className="grid grid-cols-3 gap-4 border border-amber-300 bg-white p-6 rounded-sm text-center">
            <div>
              <p className="font-mono text-xl font-bold text-amber-950">.30 / .20</p>
              <p className="font-mono text-[0.6rem] uppercase tracking-tag text-ink-faint mt-1">Weighted Fusion</p>
            </div>
            <div>
              <p className="font-mono text-xl font-bold text-amber-950">&ge; 70</p>
              <p className="font-mono text-[0.6rem] uppercase tracking-tag text-ink-faint mt-1">Auto Dispatch</p>
            </div>
            <div>
              <p className="font-mono text-xl font-bold text-amber-950">Pre-Transfer</p>
              <p className="font-mono text-[0.6rem] uppercase tracking-tag text-ink-faint mt-1">Bank Interception</p>
            </div>
          </div>
        </div>
      </section>

      {/* S·06 louvain mule & syndicate graph */}
      <section className="border-t border-amber-300 bg-amber-950 px-5 py-24 text-amber-50 md:px-12">
        <p className="font-mono text-[0.68rem] uppercase tracking-wide2 text-amber-300">S·06 · Syndicate Intelligence</p>
        <h2 className="mt-4 max-w-3xl font-display text-3xl font-medium leading-tight tracking-tight md:text-5xl">
          Offenders, SIMs, bank accounts, &amp; UPI handles form{' '}
          <em className="font-light italic text-amber-200">one connected graph.</em>
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3 text-xs text-amber-200 border-t border-amber-800 pt-6">
          <div>
            <b className="block text-sm text-white mb-1">Louvain Community Detection</b>
            Discovers hidden criminal clusters across complex inter-bank transfer networks.
          </div>
          <div>
            <b className="block text-sm text-white mb-1">Betweenness Centrality</b>
            Highlights high-frequency broker nodes connecting disparate fraud rings.
          </div>
          <div>
            <b className="block text-sm text-white mb-1">Explainable Mule Flags</b>
            Every flag carries step-by-step human-readable audit justification for court.
          </div>
        </div>
      </section>

      {/* S·07 SLA guarantee ladder */}
      <section className="border-t border-amber-300 px-5 py-20 md:px-12">
        <BandHead num="S·07">15-Minute SLA <em className="font-light italic text-amber-700">guarantee ladder.</em></BandHead>
        <div className="grid gap-4 max-w-3xl">
          {[
            ['Critical Emergency', '15 min floor', 'bg-red-600 text-white'],
            ['High Priority Threat', '4 hrs floor', 'bg-amber-600 text-white'],
            ['Normal Incident', '24 hrs window', 'bg-amber-800 text-white'],
            ['Standard Civic Query', '72 hrs window', 'bg-slate-700 text-white']
          ].map(([label, time, badge]) => (
            <div key={label} className="flex items-center justify-between border border-amber-300 bg-white p-4 rounded-sm">
              <span className="font-display text-sm font-semibold">{label}</span>
              <span className={`font-mono text-[0.62rem] uppercase tracking-tag px-3 py-1 rounded-sm ${badge}`}>{time}</span>
            </div>
          ))}
        </div>
      </section>

      {/* S·08 BSA §63 court dossiers */}
      <section className="border-t border-amber-300 px-5 py-20 md:px-12">
        <BandHead num="S·08">BSA §63 Court-Admissible <em className="font-light italic text-amber-700">dossiers.</em></BandHead>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4 text-sm leading-relaxed text-ink-soft">
            <p>Incidents generate SHA-256 hash-sealed PDF dossiers directly from database records. Hashed over final output bytes and registered in an immutable audit ledger, every dossier maintains court-ready chain of custody under Bharatiya Sakshya Adhiniyam 2023 §63.</p>
          </div>
          <div className="space-y-3 font-mono text-xs text-ink-faint border-l-2 border-amber-500 pl-4">
            <p><b className="text-ink">Cryptographic Validation:</b> SHA-256 checksum printed in PDF footer matches court exports.</p>
            <p><b className="text-ink">Chain-of-Custody Log:</b> Every access, verification, and dispatch action timestamped.</p>
            <p><b className="text-ink">Instant PDF Export:</b> Single-click dossier compilation for investigating officers.</p>
          </div>
        </div>
      </section>

      {/* S·09 zero-cost production stack */}
      <section className="border-t border-amber-300 px-5 py-20 md:px-12">
        <BandHead num="S·09">Zero-cost <em className="font-light italic text-amber-700">production stack.</em></BandHead>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5 text-center">
          {[
            ['Vercel', 'Citizen PWA Frontend'],
            ['Render', 'FastAPI Backend'],
            ['HF Spaces', 'AI Microservice'],
            ['Supabase', 'Postgres & Legal RAG'],
            ['Cloudinary', 'Evidence Media CDN']
          ].map(([tech, role]) => (
            <div key={tech} className="border border-amber-300 bg-white p-4 rounded-sm">
              <b className="font-mono text-lg text-amber-950 block">{tech}</b>
              <span className="font-mono text-[0.6rem] uppercase tracking-tag text-ink-faint mt-1 block">{role}</span>
            </div>
          ))}
        </div>
      </section>

      {/* S·10 closing gate */}
      <section className="border-t border-amber-300 px-5 py-20 md:px-12">
        <BandHead num="S·10">The city is reporting. <em className="font-light italic text-amber-700">Take your seat.</em></BandHead>
        <div className="flex flex-wrap gap-4">
          <button onClick={onEnterCitizen} className={GATE_BTN}>Launch Citizen App</button>
          <a href={POLICE_URL} className={GATE_BTN}>Open Police Console</a>
        </div>
      </section>

      <footer className="flex flex-wrap justify-between gap-4 border-t border-amber-800 bg-amber-950 px-5 py-5 font-mono text-[0.6rem] uppercase tracking-tag text-amber-300 md:px-12">
        <span>KAWACH · One shield, two frontlines</span>
        <span>Identity-free by construction · CodeKrafters</span>
      </footer>
    </div>
  );
}
