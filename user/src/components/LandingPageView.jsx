import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Radio, MessageSquare, BookOpen, Fingerprint, Lock, ArrowRight, Activity, MapPin, Building2, KeyRound } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-between overflow-x-hidden relative select-text">
      {/* Dynamic Background Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-50 via-slate-50 to-slate-100 pointer-events-none opacity-60 z-0" />
      
      {/* Navigation Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-outfit">KAWACH</h1>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block -mt-1">Unified Threat Intelligence</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-yellow-100 border border-yellow-200 rounded-full text-[10px] font-bold text-yellow-800 uppercase tracking-wider">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-ping mr-1" />
          State Grid Active
        </div>
      </header>

      {/* Main Core Showcase */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 flex flex-col justify-center py-8">
        
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-bold text-blue-700 uppercase tracking-wider mb-5">
            <Activity className="w-3.5 h-3.5" /> Municipal Safety Ecosystem
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 font-outfit leading-tight tracking-tight">
            Integrated Emergency Response &<br />
            <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">Geospatial Intelligence</span>
          </h2>
          <p className="text-slate-500 text-sm mt-3 max-w-xl mx-auto leading-relaxed font-semibold">
            One network linking citizens, police command grids, medical response teams, and rescue departments for localized, lightning-fast safety coordination.
          </p>
        </div>

        {/* Dual Split Cards: Citizen vs Department Dropdown Login */}
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
                Anonymous and secure incident reporting platform. Scramble your device identity in Ghost Mode, watch proximity safety alert feeds, and access your daily legal rights library.
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
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Select Department Node
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <select
                        value={dept}
                        onChange={(e) => setDept(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-850 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:border-blue-500 appearance-none"
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
                        className="w-full px-3.5 py-3 bg-slate-900 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
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
                          className="w-full px-3.5 py-3 bg-slate-900 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
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

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 py-6 text-center text-[10px] text-slate-400 font-semibold w-full">
        <p>© 2026 KAWACH Security Grid. Integrated System Interface Node.</p>
      </footer>
    </div>
  );
}
