import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Radio, MessageSquare, BookOpen, Fingerprint, Lock, ArrowRight, Activity, MapPin, Building2, ExternalLink, Navigation, ShieldAlert, EyeOff } from 'lucide-react';

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

      // Latency-free SPA dynamic redirection
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
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-between overflow-x-hidden relative select-text">
      {/* Dynamic Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/30 via-slate-50 to-slate-100 pointer-events-none opacity-60 z-0" />
      
      {/* Navigation Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-slate-200/50 bg-white/70 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10">
            <img src="/kawach.png" alt="KAWACH Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-outfit">KAWACH</h1>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block -mt-1">Unified Threat Intelligence</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
          <button onClick={() => scrollToSection('about')} className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
            <InfoIcon className="w-4 h-4" /> About System
          </button>
          <button onClick={() => scrollToSection('pillars')} className="hover:text-blue-600 transition-colors flex items-center gap-1.5">
            <Activity className="w-4 h-4" /> 29 Pillars
          </button>
          <button onClick={() => scrollToSection('gate')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-all flex items-center gap-1.5">
            <Fingerprint className="w-4 h-4 text-slate-600" /> Access Gate
          </button>
        </nav>
        
        <div className="flex md:hidden items-center gap-2 px-3.5 py-1.5 bg-yellow-100 border border-yellow-200 rounded-full text-[10px] font-bold text-yellow-800 uppercase tracking-wider">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-ping mr-1" />
          Active
        </div>
      </header>

      {/* Main Core Showcase */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-12 space-y-20">
        
        {/* Hero Showcase Section */}
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-bold text-blue-700 uppercase tracking-wider mb-5">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Active Deployment: Bengaluru Command
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 font-outfit leading-tight tracking-tight">
            Bridging the Trust Gap Between <br />
            <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">Citizens & Law Enforcement</span>
          </h2>
          <p className="text-slate-500 text-sm mt-4 max-w-xl mx-auto leading-relaxed font-semibold">
            KAWACH is a unified, state-wide geospatial grid and threat intelligence platform designed for Bengaluru City Police. It resolves physical street alerts and digital public safety threats using real-time crowdsourced feeds.
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mt-10">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <h4 className="text-2xl font-black text-slate-900 font-outfit">29</h4>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Strategic Pillars</span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <h4 className="text-2xl font-black text-slate-900 font-outfit">100%</h4>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PII Encrypted</span>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
              <h4 className="text-2xl font-black text-slate-900 font-outfit">30%</h4>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Faster Dispatch</span>
            </div>
          </div>
        </section>

        {/* Dual Split Cards: Citizen vs Department Dropdown Login */}
        <section id="gate" className="space-y-10 scroll-mt-24">
          <div className="text-center max-w-lg mx-auto">
            <h3 className="text-2xl font-black text-slate-900 font-outfit">Secure Entry Gateways</h3>
            <p className="text-slate-400 text-xs mt-1.5 font-semibold">Select your secure portal below to connect with your state-wide threat intelligence node.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto w-full items-stretch">
            
            {/* Citizen Portal Entrance */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col justify-between shadow-xl shadow-slate-100 hover:shadow-2xl hover:border-yellow-300 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-2 bg-yellow-400" />
              
              <div>
                <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center border border-yellow-100 mb-6 group-hover:scale-105 transition-transform">
                  <Users className="w-6 h-6 text-yellow-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 font-outfit mb-3">Citizen Sentinel</h3>
                <p className="text-slate-600 text-xs sm:text-sm font-semibold leading-relaxed mb-6">
                  Secure, anonymous safety reporting grid for the public. Report neighborhood incidents in Ghost Mode, watch live proximity feeds, and check local safety indexes with complete metadata scrubbing.
                </p>

                <ul className="space-y-3.5 mb-8">
                  <li className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 text-[10px]">✔</span>
                    Snap-Style Proximity Safety Maps
                  </li>
                  <li className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 text-[10px]">✔</span>
                    Interactive Situation Legal Guide
                  </li>
                  <li className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 text-[10px]">✔</span>
                    Scam Call & Deepfake Audio Shield
                  </li>
                </ul>
              </div>

              <button
                onClick={onEnterCitizen}
                className="w-full py-4 px-6 bg-yellow-400 border border-yellow-400 hover:bg-yellow-500 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-yellow-100 text-xs tracking-wider uppercase font-outfit"
              >
                Access Citizen Portal <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Department Authoritative Login (Slate theme) */}
            <div className="bg-slate-950 border border-slate-900 rounded-3xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group text-white">
              <div className="absolute top-0 left-0 right-0 h-2 bg-blue-500" />
              
              <form onSubmit={handleOfficialSubmit} className="flex flex-col h-full justify-between gap-6">
                <div>
                  <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-6">
                    <Lock className="w-6 h-6 text-blue-400" />
                  </div>
                  
                  <h3 className="text-2xl font-black font-outfit mb-1">Government Portal</h3>
                  <p className="text-slate-400 text-xs font-semibold leading-relaxed mb-6">
                    Authorized access for state law enforcement, medical dispatchers, and rescue control agencies.
                  </p>

                  {/* Login Inputs */}
                  <div className="space-y-4 text-slate-900">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Select Department Node
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 z-10" />
                        <select
                          value={dept}
                          onChange={(e) => setDept(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-blue-500 appearance-none relative"
                        >
                          <option value="POLICE">Police Department (Command Center)</option>
                          <option value="FIRE">Fire & Rescue Department</option>
                          <option value="HEALTH">Health & Ambulance Services</option>
                          <option value="DISASTER">Disaster Management Command</option>
                          <option value="ADMIN">Super Admin (God-Mode Console)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-outfit">
                          Official ID
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. officer_1"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                          className="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 font-outfit">
                          Access Key
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            placeholder="••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-3.5 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all text-xs tracking-wider uppercase font-outfit disabled:opacity-50 mt-4"
                >
                  <Fingerprint className="w-4 h-4 text-blue-200" />
                  <span>{loading ? 'Authenticating Node...' : 'Access Department Console'}</span>
                </button>
              </form>
            </div>

          </div>
        </section>

        {/* Interactive Law Library / Rule Book Banner */}
        <section className="max-w-5xl mx-auto w-full">
          <div className="bg-gradient-to-r from-blue-700 to-indigo-850 p-6 md:p-8 rounded-3xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl border border-blue-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-200">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black font-outfit">Citizen Interactive Rule Book & Law Library</h3>
                <p className="text-blue-100 text-xs mt-0.5 max-w-xl font-medium leading-relaxed">
                  Know your legal rights in 60 seconds. Review police protocols, arrest guidelines, and digital fraud protections compiled directly from the Bharatiya Nyaya Sanhita (BNS).
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/user/library')}
              className="px-5 py-3 bg-white hover:bg-blue-50 text-blue-800 font-bold rounded-2xl transition-all flex items-center gap-2 text-xs shrink-0 shadow-md font-outfit uppercase tracking-wider"
            >
              Explore Rule Book <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Geospatial Deployment Section */}
        <section id="about" className="max-w-5xl mx-auto w-full scroll-mt-24 space-y-10">
          <div className="text-center max-w-lg mx-auto">
            <h3 className="text-2xl font-black text-slate-900 font-outfit flex items-center justify-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" /> Geospatial Footprint: Bengaluru Grid
            </h3>
            <p className="text-slate-400 text-xs mt-1.5 font-semibold">Decoupled smart GIS and encrypted audit logging across high-density urban wards.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Navigation className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm font-outfit">Localized Proximity Spheres</h4>
              <p className="text-slate-500 text-xs leading-relaxed font-semibold">
                Fully optimized for high-density hubs including Koramangala, Indiranagar, and HSR Layout. Video pins and incident feeds utilize Leaflet and CartoDB Voyager light tiles to pinpoint emergency hubs within 15 meters.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-3">
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm font-outfit">Emergency Interlock</h4>
              <p className="text-slate-500 text-xs leading-relaxed font-semibold">
                Emergency dispatches from the public bypass standard cohort verification pipelines and are auto-routed directly to district SP dashboards with immediate alert rings and localized sound triggers.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-3">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <EyeOff className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm font-outfit">Anonymized Audit Trails</h4>
              <p className="text-slate-500 text-xs leading-relaxed font-semibold">
                Every citizen upload is assigned a Section 65B Audit-Hash (e.g. SHA-256 logs) containing proof-of-location metadata, ensuring legal admissibility in courts while securing reporter identities.
              </p>
            </div>
          </div>
        </section>

        {/* 29 Strategic Pillars Grid */}
        <section id="pillars" className="max-w-7xl mx-auto w-full scroll-mt-24 space-y-10">
          <div className="text-center max-w-xl mx-auto">
            <h3 className="text-2xl font-black text-slate-900 font-outfit">System Architecture: The 29 Strategic Pillars</h3>
            <p className="text-slate-400 text-xs mt-1.5 font-semibold">A comprehensive system of state safety and intelligence pipelines built for Indian Law Enforcement & Citizens.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {PILLARS.map((p) => (
              <div key={p.num} className="bg-white border border-slate-200 p-5 rounded-2xl hover:border-blue-200 hover:shadow-md transition-all duration-200 flex gap-4">
                <span className="text-xs font-black text-blue-600 font-mono tracking-wider shrink-0 mt-0.5">{p.num}</span>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-xs font-outfit">{p.title}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950 py-16 px-6 text-slate-400 text-xs font-semibold w-full">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-10 mb-12 text-left">
          
          {/* Logo & Info */}
          <div className="sm:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img src="/kawach.png" alt="KAWACH Logo" className="w-12 h-12 object-contain" />
              <div>
                <h3 className="text-lg font-black font-outfit text-white tracking-wide">KAWACH</h3>
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest block -mt-1">Unified Public Safety Grid</span>
              </div>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed max-w-sm font-semibold">
              An enterprise-grade geospatial intelligence and forensic PWA safeguarding local streets and digital communication channels.
            </p>
          </div>

          {/* System Nodes */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">System Nodes</h4>
            <ul className="space-y-2 text-slate-500 font-semibold">
              <li><button onClick={() => navigate('/user/login')} className="hover:text-white transition-colors">Citizen Sentinel PWA</button></li>
              <li><button onClick={() => navigate('/')} className="hover:text-white transition-colors">Police Command Center</button></li>
              <li><button onClick={() => navigate('/')} className="hover:text-white transition-colors">Civic Departments Panel</button></li>
              <li><button onClick={() => navigate('/admin')} className="hover:text-white transition-colors">Super Admin Console</button></li>
            </ul>
          </div>

          {/* Compliance & Laws */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Compliance & Laws</h4>
            <ul className="space-y-2 text-slate-500 font-semibold">
              <li><button onClick={() => navigate('/user/library')} className="hover:text-white transition-colors">BNS Rule Book</button></li>
              <li><button onClick={() => scrollToSection('about')} className="hover:text-white transition-colors">Section 65B Admissibility</button></li>
              <li><button onClick={() => scrollToSection('about')} className="hover:text-white transition-colors">SHA-256 Audit Ledger</button></li>
              <li><button onClick={() => scrollToSection('about')} className="hover:text-white transition-colors">PII Scrubbing Protocols</button></li>
            </ul>
          </div>

          {/* System Status */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">System Status</h4>
            <ul className="space-y-2 text-slate-500 font-semibold">
              <li>State Hub: <span className="text-emerald-500 font-bold">ACTIVE</span></li>
              <li>AI Space: <span className="text-emerald-500 font-bold">CONNECTED</span></li>
              <li>Ingestion Rate: <span className="text-white font-bold">99.8%</span></li>
              <li>Secure Tunnel: <span className="text-blue-500 font-bold">AES-256</span></li>
            </ul>
          </div>

        </div>

        <div className="max-w-7xl mx-auto border-t border-slate-900 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-600 text-xs font-semibold">© 2026 KAWACH Security Grid. All rights reserved.</p>
          <div className="text-white font-bold text-xs uppercase tracking-wider">
            Built by <span className="text-yellow-400">CodeKrafters</span> for <span className="text-orange-500">In</span><span>d</span><span className="text-green-500">ia</span> 🇮🇳
          </div>
        </div>
      </footer>
    </div>
  );
}

// Simple placeholder fallback for the Info icon
function InfoIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
