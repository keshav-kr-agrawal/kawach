import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, Radio, MessageSquare, BookOpen, Fingerprint, Lock, ArrowRight, Activity, MapPin } from 'lucide-react';

export default function LandingPageView({ onEnterCitizen }) {
  const handlePoliceRedirect = () => {
    // Redirection to the police command app on port 5174
    window.location.href = 'http://localhost:5174';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-between overflow-x-hidden">
      {/* Dynamic Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-50 via-slate-50 to-slate-100 pointer-events-none opacity-60 z-0" />
      
      {/* Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 font-outfit">KAWACH</h1>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block -mt-1">National Threat Intelligence</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a 
            href="http://localhost:5173/" 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all shadow-2xs"
          >
            ← Portal Hub
          </a>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 border border-yellow-200 rounded-full text-xs font-semibold text-yellow-800">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping mr-1" />
            Bengaluru Command Active
          </div>
        </div>
      </header>

      {/* Main Hero & Dual Portal Split */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 flex flex-col justify-center py-10">
        
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-bold text-blue-700 uppercase tracking-wider mb-6"
          >
            <Activity className="w-3.5 h-3.5" /> Next-Gen Public Safety Platform
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-4xl sm:text-5xl font-black text-slate-900 font-outfit leading-tight tracking-tight"
          >
            Bridging the Trust Gap <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">in Public Safety</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-slate-600 text-sm sm:text-base mt-4 max-w-xl mx-auto leading-relaxed font-medium"
          >
            A unified state-wide threat intelligence grid protecting neighborhoods and neutralizing digital threats through citizen-led intelligence.
          </motion.p>
        </div>

        {/* The Split Screen / Dual Card Layout */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl mx-auto w-full items-stretch">
          
          {/* Citizen Portal Card (Light / Yellow theme) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, type: 'spring', bounce: 0.2 }}
            className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col justify-between shadow-xl shadow-slate-100 hover:shadow-2xl hover:border-yellow-300 transition-all duration-300 relative overflow-hidden group"
          >
            {/* Color Accent Indicator */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-snapYellow" />
            
            <div>
              <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center border border-yellow-100 mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 font-outfit mb-3">Citizen Sentinel</h3>
              <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed mb-6">
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
              className="w-full py-4 px-6 bg-snapYellow border border-yellow-400 hover:bg-yellow-400 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-yellow-100/50 hover:shadow-yellow-200 text-xs sm:text-sm tracking-wider uppercase font-outfit"
            >
              Access Citizen Portal <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Command Center Card (Deep Blue / Slate Theme) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, type: 'spring', bounce: 0.2 }}
            className="bg-policeSlate border border-slate-800 rounded-3xl p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden group text-white"
          >
            {/* Color Accent Indicator */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-blue-500" />
            <div className="absolute -right-20 -top-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="w-12 h-12 bg-slate-800/80 border border-slate-700 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-2xl font-black font-outfit">Command Console</h3>
                <span className="px-2.5 py-0.5 bg-blue-500/20 border border-blue-500/40 rounded-full text-[9px] font-bold text-blue-300 uppercase tracking-widest">
                  Secure
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed mb-6">
                Official intranet entry point for authorized officers. Manage geospatial hotspot coordinates, visualize suspect associate networks, monitor alerts, and review deduplicated records.
              </p>

              <ul className="space-y-3.5 mb-8">
                <li className="flex items-center gap-3 text-xs font-semibold text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 text-[10px]">✔</span>
                  Neo4j Force-Directed Link Analysis
                </li>
                <li className="flex items-center gap-3 text-xs font-semibold text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 text-[10px]">✔</span>
                  Geospatial DBSCAN Hotspot Clustering
                </li>
                <li className="flex items-center gap-3 text-xs font-semibold text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 text-[10px]">✔</span>
                  Biometric Face Matching & Ingestion
                </li>
              </ul>
            </div>

            <button
              onClick={handlePoliceRedirect}
              className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all hover:border-slate-600 text-xs sm:text-sm tracking-wider uppercase font-outfit shadow-lg shadow-black/30"
            >
              <Fingerprint className="w-4 h-4 text-blue-400 animate-pulse" /> Enter Command Console
            </button>
          </motion.div>

        </div>

        {/* Feature Highlights / USPs */}
        <section className="mt-24 border-t border-slate-200/80 pt-16 max-w-5xl mx-auto w-full">
          <h4 className="text-center text-slate-500 font-bold uppercase tracking-wider text-xs mb-10">KAWACH Core Platform Highlights</h4>
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <Radio className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h5 className="font-bold text-slate-900 text-sm font-outfit mb-1">Crowdsourced Intelligence</h5>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">
                  Real-time proximity streams matching device location EXIF tags for absolute evidence verification.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-50 border border-yellow-100 flex items-center justify-center text-yellow-600 flex-shrink-0">
                <BookOpen className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h5 className="font-bold text-slate-900 text-sm font-outfit mb-1">Digital Law Library</h5>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">
                  Bite-sized rights, situaion simulators, and official act regulations cached for quick emergency offline access.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-bold text-slate-900 text-sm font-outfit mb-1">Secured Data Privacy</h5>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">
                  Compliant with DPDP Act 2023. Automatic metadata scrubbing handles complete informant protection.
                </p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200/80 py-8 text-center text-xs text-slate-400 font-semibold w-full">
        <p>© 2026 KAWACH Security Grid. Optimized for Karnataka State Law Enforcement & Public Safety.</p>
      </footer>
    </div>
  );
}
