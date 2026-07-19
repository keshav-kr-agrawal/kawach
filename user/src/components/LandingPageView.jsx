import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  { num: '29', title: 'Deepfake & Spoof Defense', desc: 'Identifies synthesized voice clones and checks CBI video call authenticity.' }
];

export default function LandingPageView({ onEnterCitizen, onOfficialLogin }) {
  const navigate = useNavigate();
  const [dept, setDept] = useState('POLICE');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOfficialSubmit = (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const mockUser = {
        username: username,
        role: dept === 'ADMIN' ? 'DGP' : 'SP',
        department: dept
      };
      localStorage.setItem('token', 'mock_jwt_token_official');
      localStorage.setItem('user', JSON.stringify(mockUser));

      if (onOfficialLogin) {
        onOfficialLogin('mock_jwt_token_official', mockUser);
      }

      if (dept === 'POLICE') {
        navigate('/department/police');
      } else if (dept === 'FIRE') {
        navigate('/department/fire');
      } else if (dept === 'HEALTH') {
        navigate('/department/health');
      } else if (dept === 'DISASTER') {
        navigate('/department/disaster');
      } else if (dept === 'ADMIN') {
        navigate('/admin');
      }
    }, 600);
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col justify-between overflow-x-hidden relative select-text">
      {/* Dynamic Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-100/10 via-white to-white pointer-events-none opacity-60 z-0" />
      
      {/* Navigation Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-yellow-200 bg-white/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10">
            <img src="/kawach.png" alt="KAWACH Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-sora">KAWACH</h1>
            <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-widest block -mt-1 font-mono">Unified Threat Intelligence</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
          <button onClick={() => scrollToSection('about')} className="hover:text-[#b08850] transition-colors flex items-center gap-1.5 font-sora uppercase tracking-wider">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            About System
          </button>
          <button onClick={() => scrollToSection('pillars')} className="hover:text-[#b08850] transition-colors flex items-center gap-1.5 font-sora uppercase tracking-wider">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            29 Pillars
          </button>
          <button onClick={() => scrollToSection('gate')} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 rounded-xl transition-all flex items-center gap-1.5 font-sora uppercase tracking-wider border border-slate-950/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M2 12a10 10 0 0 1 13-9.54M22 12a10 10 0 0 0-13-9.54M8 12a4 4 0 0 1 8 0v2M12 12v3"/></svg>
            Portals
          </button>
        </nav>
        
        <div className="flex md:hidden items-center gap-2 px-3.5 py-1.5 bg-yellow-50 border border-yellow-200 rounded-full text-[10px] font-bold text-[#b08850] uppercase tracking-wider font-mono">
          <span className="w-2 h-2 bg-yellow-400 rounded-full animate-ping mr-1" />
          Active
        </div>
      </header>

      {/* Main Core Showcase */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-12 space-y-20">
        
        {/* Hero Showcase Section */}
        <section className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-yellow-400/10 border border-yellow-400/20 rounded-full text-xs font-bold text-[#b08850] uppercase tracking-wider">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 animate-pulse"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14"/></svg>
            Active Deployment: Bengaluru Command
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 font-sora leading-tight tracking-tight">
            Bridging the <span className="font-serif italic font-normal text-[#b08850] pr-1.5 underline decoration-[#ffd900] decoration-wavy">trust gap</span> between <br />
            <span className="bg-gradient-to-r from-yellow-500 to-[#b08850] bg-clip-text text-transparent filter drop-shadow-sm font-black">Citizens, Police & Civic Units</span>
          </h2>
          
          <p className="text-slate-500 text-sm mt-4 max-w-xl mx-auto leading-relaxed font-semibold">
            KAWACH is a unified geospatial grid providing 3 distinct, specialized portals tailored for Citizens, Law Enforcement, and Municipal Civic Departments.
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-10">
            <div className="bg-white border border-yellow-400/20 p-4 rounded-2xl shadow-xs hover:border-[#b08850]/40 transition-all duration-300">
              <h4 className="text-2xl font-black text-slate-950 font-sora">3</h4>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Dedicated Portals</span>
            </div>
            <div className="bg-white border border-yellow-400/20 p-4 rounded-2xl shadow-xs hover:border-[#b08850]/40 transition-all duration-300">
              <h4 className="text-2xl font-black text-slate-950 font-sora">100%</h4>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">PII Encrypted</span>
            </div>
            <div className="bg-white border border-yellow-400/20 p-4 rounded-2xl shadow-xs hover:border-[#b08850]/40 transition-all duration-300">
              <h4 className="text-2xl font-black text-slate-950 font-sora">29</h4>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Strategic Pillars</span>
            </div>
          </div>
        </section>

        {/* 3 Distinct Gateway Cards: Citizen, Police, Civic Departments */}
        <section id="gate" className="space-y-10 scroll-mt-24">
          <div className="text-center max-w-lg mx-auto">
            <h3 className="text-2xl font-black text-slate-900 font-sora">Select Portal Gateway</h3>
            <p className="text-slate-400 text-xs mt-1.5 font-semibold">Connect directly to your authorized state threat intelligence module.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto w-full items-stretch">
            
            {/* 1. Citizen Sentinel PWA Card */}
            <div className="bg-white border-2 border-[#ffd900] rounded-3xl p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-yellow-500 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#ffd900]" />
              
              <div>
                <div className="w-12 h-12 bg-yellow-400/10 rounded-2xl flex items-center justify-center border border-yellow-400/20 mb-5 group-hover:scale-105 transition-transform">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#b08850" strokeWidth="2" className="w-6 h-6"><path d="M17 21v-2a4 4 0 0 4-4H5a4 4 0 0 4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-widest block font-mono mb-1">Portal 01</span>
                <h3 className="text-xl font-black text-slate-900 font-sora mb-2">Citizen Sentinel PWA</h3>
                <p className="text-slate-600 text-xs font-semibold leading-relaxed mb-6">
                  Secure, anonymous safety reporting grid for the public. Report neighborhood incidents in Ghost Mode, watch proximity feeds, and check local rights.
                </p>
              </div>

              <button
                onClick={onEnterCitizen}
                className="w-full py-3.5 px-4 bg-[#ffd900] hover:bg-yellow-400 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xs text-xs tracking-wider uppercase font-sora border border-slate-950/10"
              >
                Access Citizen Portal ➔
              </button>
            </div>

            {/* 2. Police Command Center Card */}
            <div className="bg-white border-2 border-[#ffd900] rounded-3xl p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-yellow-500 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#ffd900]" />
              
              <div>
                <div className="w-12 h-12 bg-yellow-400/10 rounded-2xl flex items-center justify-center border border-yellow-400/20 mb-5 group-hover:scale-105 transition-transform">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#b08850" strokeWidth="2" className="w-6 h-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-widest block font-mono mb-1">Portal 02</span>
                <h3 className="text-xl font-black text-slate-900 font-sora mb-2">Police Command Center</h3>
                <p className="text-slate-600 text-xs font-semibold leading-relaxed mb-6">
                  Intranet command console for police officers. Analyze offender recidivism, trace digital arrest scams, track ANPR hotspots, and direct dispatches.
                </p>
              </div>

              <button
                onClick={() => navigate('/department/police')}
                className="w-full py-3.5 px-4 bg-[#ffd900] hover:bg-yellow-400 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xs text-xs tracking-wider uppercase font-sora border border-slate-950/10"
              >
                Enter Police Console ➔
              </button>
            </div>

            {/* 3. Civic Departments Console Card */}
            <div className="bg-white border-2 border-[#ffd900] rounded-3xl p-6 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-yellow-500 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#ffd900]" />
              
              <div>
                <div className="w-12 h-12 bg-yellow-400/10 rounded-2xl flex items-center justify-center border border-yellow-400/20 mb-5 group-hover:scale-105 transition-transform">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#b08850" strokeWidth="2" className="w-6 h-6"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="16"/><line x1="15" y1="22" x2="15" y2="16"/><path d="M8 6h2M14 6h2M8 10h2M14 10h2"/></svg>
                </div>
                <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-widest block font-mono mb-1">Portal 03</span>
                <h3 className="text-xl font-black text-slate-900 font-sora mb-2">Civic Departments</h3>
                <p className="text-slate-600 text-xs font-semibold leading-relaxed mb-6">
                  Dispatch dashboard for municipal units (Health, Power, Water, Sanitation, Fire). Review AI reports, inspect deepfake verdicts, and update case statuses.
                </p>
              </div>

              <button
                onClick={() => {
                  window.location.href = 'http://localhost:3000';
                }}
                className="w-full py-3.5 px-4 bg-[#ffd900] hover:bg-yellow-400 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xs text-xs tracking-wider uppercase font-sora border border-slate-950/10"
              >
                Access Civic Panels ➔
              </button>
            </div>

          </div>
        </section>

        {/* Interactive Law Library Banner */}
        <section className="max-w-5xl mx-auto w-full">
          <div className="bg-white border border-yellow-400/20 p-6 md:p-8 rounded-3xl text-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs hover:border-[#b08850]/30 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-400/10 rounded-2xl flex items-center justify-center text-[#b08850] border border-yellow-400/20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 4-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              </div>
              <div>
                <h3 className="text-lg font-black font-sora text-slate-950">Citizen Interactive Rule Book & Law Library</h3>
                <p className="text-slate-500 text-xs mt-0.5 max-w-xl font-medium leading-relaxed">
                  Know your legal rights in 60 seconds. Review police protocols, arrest guidelines, and digital fraud protections compiled directly from the Bharatiya Nyaya Sanhita (BNS).
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/user/library')}
              className="px-5 py-3 bg-[#ffd900] hover:bg-yellow-400 text-slate-950 font-bold rounded-2xl transition-all flex items-center gap-2 text-xs shrink-0 shadow-xs border border-slate-950/10 font-sora uppercase tracking-wider"
            >
              Explore Rule Book ➔
            </button>
          </div>
        </section>

        {/* 29 Strategic Pillars Grid */}
        <section id="pillars" className="max-w-7xl mx-auto w-full scroll-mt-24 space-y-10">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="text-2xl font-black text-slate-900 font-sora">System Architecture: The 29 Strategic Pillars</h3>
            <p className="text-slate-400 text-xs mt-1.5 font-semibold">A comprehensive system of state safety and intelligence pipelines built for Indian Law Enforcement & Citizens.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {PILLARS.map((p) => (
              <div key={p.num} className="bg-white border border-yellow-400/20 p-5 rounded-2xl hover:border-[#b08850]/40 hover:shadow-xs transition-all duration-200 flex gap-4">
                <span className="text-xs font-black text-[#b08850] font-mono tracking-wider shrink-0 mt-0.5">{p.num}</span>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-950 text-xs font-sora">{p.title}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-yellow-200 bg-white py-16 px-6 text-slate-500 text-xs font-semibold w-full">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-10 mb-12 text-left">
          
          <div className="sm:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img src="/kawach.png" alt="KAWACH Logo" className="w-12 h-12 object-contain" />
              <div>
                <h3 className="text-lg font-black font-sora text-slate-950 tracking-wide">KAWACH</h3>
                <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-widest block -mt-1 font-mono">Unified Public Safety Grid</span>
              </div>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed max-w-sm font-semibold">
              An enterprise-grade geospatial intelligence and forensic PWA safeguarding local streets and digital communication channels.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider">System Portals</h4>
            <ul className="space-y-2 text-slate-500 font-semibold">
              <li><button onClick={() => navigate('/user/map')} className="hover:text-[#b08850] transition-colors">Citizen Sentinel PWA</button></li>
              <li><button onClick={() => navigate('/department/police')} className="hover:text-[#b08850] transition-colors">Police Command Center</button></li>
              <li><a href="http://localhost:3000" className="hover:text-[#b08850] transition-colors">Civic Departments Panel</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider">Compliance & Laws</h4>
            <ul className="space-y-2 text-slate-500 font-semibold">
              <li><button onClick={() => navigate('/user/library')} className="hover:text-[#b08850] transition-colors">BNS Rule Book</button></li>
              <li><button onClick={() => scrollToSection('about')} className="hover:text-[#b08850] transition-colors">Section 65B Admissibility</button></li>
              <li><button onClick={() => scrollToSection('about')} className="hover:text-[#b08850] transition-colors">SHA-256 Audit Ledger</button></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider">System Status</h4>
            <ul className="space-y-2 text-slate-500 font-semibold">
              <li>State Grid: <span className="text-emerald-600 font-bold">ACTIVE</span></li>
              <li>Ingestion Rate: <span className="text-slate-950 font-bold">99.8%</span></li>
              <li>Secure Tunnel: <span className="text-[#b08850] font-bold">AES-256</span></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto border-t border-yellow-200 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-400 text-xs font-semibold">© 2026 KAWACH Security Grid. All rights reserved.</p>
          <div className="text-slate-900 font-bold text-xs uppercase tracking-wider">
            Built by <span className="text-[#b08850] font-black">CodeKrafters</span> for <span className="text-orange-500">In</span><span>d</span><span className="text-green-500">ia</span> 🇮🇳
          </div>
        </div>
      </footer>
    </div>
  );
}
