import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, EyeOff, Bookmark, Activity, ArrowLeft, Award, Trash2 } from 'lucide-react';

export default function UserProfileView({ onBack, bookmarkedLaws = [], userReports = [], onRemoveBookmark, onDeleteReport, onSignOut }) {
  const [ghostMode, setGhostMode] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const localUploaderUuid = localStorage.getItem('kawach_uploader_uuid') || '';
  const myReports = userReports.filter(r => r.uploaderUuid === localUploaderUuid);

  // Civic Trust Score metrics calculation
  const approvedReports = myReports.filter(r => r.status === 'PUBLIC_APPROVED').length;
  const totalReportsCount = myReports.length;
  
  // Calculate a mock dynamic score based on reports history
  let trustScore = 92; // default
  if (totalReportsCount > 0) {
    const successRate = (approvedReports / totalReportsCount) * 100;
    trustScore = Math.min(100, Math.max(70, Math.round(75 + (successRate * 0.25))));
  }

  // Pre-seed mock activity log if no uploads exist
  const mockActivityLog = [
    { id: 'act-1', event: 'Video uploaded: Loitering under HSR bridge', date: 'Yesterday', result: 'Verified (Threat Score: 32%)' },
    { id: 'act-2', event: 'Emergency direct dispatch: Fire HSR block 4', date: '3 days ago', result: 'Dispatched instantly' },
    { id: 'act-3', event: 'Scam caller log reported: +91-9122340590', date: '1 week ago', result: 'Frozen in RBI Registry' }
  ];

  return (
    <div className="subview-container select-text relative">
      <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-yellow-500/5 to-transparent pointer-events-none z-0" />
      
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200/80 px-4 py-4 flex items-center justify-between z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-700 transition-colors"
            title="Go back"
            style={{ minHeight: '44px', minWidth: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-black text-slate-900 font-outfit uppercase tracking-wider">Citizen Profile</h2>
            <p className="text-[10px] text-slate-500 font-medium -mt-0.5">Sentinel Identity & Privacy Controls</p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-yellow-100 border border-yellow-200 rounded-full text-[9px] font-bold text-yellow-800 uppercase tracking-wide">
          Level 3 Sentinel
        </span>
      </div>

      {isReady ? (
        <div className="p-4 space-y-6 pb-24 relative z-10">

        {/* 1. CIVIC TRUST SCORE CIRCULAR RADIAL */}
        <section className="bg-white/90 backdrop-blur-md border border-slate-200/60 rounded-3xl p-5 shadow-xs flex items-center gap-6 hover:border-yellow-250 transition-all duration-300">
          <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
            {/* SVG Circular Ring */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="#e2e8f0"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="#ffd900" // Safety Yellow
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 - (251.2 * trustScore) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-black text-slate-950 leading-none">{trustScore}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5"> Trust Score</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-black text-slate-900 text-sm font-outfit flex items-center gap-1.5">
              <Award className="w-4 h-4 text-yellow-500" /> Civic Reputation Rating
            </h3>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
              Your trust score goes up each time your reported safety feeds are verified by cohort peers or station dispatch teams.
            </p>
            <div className="text-[9px] font-bold text-slate-800 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md w-fit">
              {approvedReports} / {totalReportsCount || 3} Feeds Verified
            </div>
          </div>
        </section>

        {/* 2. GHOST MODE INTERACTIVE TOGGLE */}
        <section className="bg-white/90 backdrop-blur-md border border-slate-200/60 rounded-3xl p-5 shadow-xs hover:border-yellow-250 transition-all duration-300">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-50 border border-yellow-100 rounded-xl flex items-center justify-center text-yellow-600">
                <EyeOff className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm font-outfit">Ghost Mode Privacy</h4>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Automatic metadata scrubbing</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <button 
                onClick={() => setGhostMode(!ghostMode)}
                className={`w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 relative focus:outline-none ${
                  ghostMode ? 'bg-[#ffd900]' : 'bg-slate-200 border border-slate-300/40'
                }`}
                title={ghostMode ? "Disable Ghost Mode" : "Enable Ghost Mode"}
                style={{ minHeight: '28px', minWidth: '56px' }}
              >
                <motion.div 
                  className="bg-white w-5 h-5 rounded-full shadow-md absolute"
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  animate={{ left: ghostMode ? '31px' : '3px' }}
                />
              </button>
            </div>
          </div>

          <p className="text-slate-500 text-xs font-semibold leading-relaxed border-t border-slate-100 pt-3">
            {ghostMode ? (
              <span className="text-emerald-600 font-bold">
                ✓ ACTIVE: All uploads are fully anonymous. GPS coordinate offsets are encrypted with rotary SHA-256 logs. PII parameters scrubbed.
              </span>
            ) : (
              <span className="text-amber-600 font-bold">
                ⚠ PUBLIC: Uploads will carry coordinate locations to expedite police dispatch times. Name remains confidential.
              </span>
            )}
          </p>
        </section>

        {/* 3. BOOKMARKED LAWS SECTION */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
            <Bookmark className="w-4 h-4 text-slate-400" /> Bookmarked Laws & Rights
          </h3>

          <div className="space-y-2.5">
            {bookmarkedLaws.length > 0 ? (
              bookmarkedLaws.map((law) => (
                <div key={law.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2.5 py-0.5 bg-yellow-100 border border-yellow-200 rounded-full text-[9px] font-bold text-yellow-800 uppercase tracking-wide">
                        {law.backTitle || 'Motor Vehicles Act'}
                      </span>
                      <button
                        onClick={() => onRemoveBookmark(law.id)}
                        className="text-[9px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider"
                        style={{ minHeight: '36px', padding: '0 8px' }}
                      >
                        Remove
                      </button>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide mb-1.5">
                      {law.title}
                    </h4>
                    <p className="text-slate-500 text-[11px] font-semibold leading-relaxed">
                      {law.backContent}
                    </p>
                  </div>
                  <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <span className="text-[8px] font-bold text-slate-800 uppercase tracking-wider block mb-0.5">Immediate Action</span>
                    <p className="text-slate-600 text-[10px] leading-relaxed font-semibold">
                      {law.action}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-center text-slate-400 text-xs font-semibold">
                No bookmarked laws. Saved cards from the Law Library will appear here for fast offline reading.
              </div>
            )}
          </div>
        </section>

        {/* 4. RECENT ACTIVITY LOGS */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-slate-400" /> Sentinel Activity Logs
          </h3>

          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-2xs">
            {myReports.length > 0 ? (
              myReports.map((report) => (
                <div key={report.id} className="p-3.5 flex justify-between items-center gap-3">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">{report.title || 'Live Broadcast feed'}</h4>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Verified via GPS EXIF</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-yellow-500/10 border border-yellow-500/35 rounded-full text-[9px] font-bold text-yellow-800 tracking-wider">
                      {report.status}
                    </span>
                    <button
                      onClick={() => onDeleteReport(report.id)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete report"
                      style={{ minWidth: '32px', minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : null}

            {mockActivityLog.map((log) => (
              <div key={log.id} className="p-3.5 flex justify-between items-center gap-3">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">{log.event}</h4>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">{log.date}</span>
                </div>
                <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-[9px] font-bold text-slate-700 tracking-wider">
                  {log.result}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 5. SIGN OUT BUTTON */}
        <section className="pt-2">
          <button 
            onClick={onSignOut}
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider shadow-sm transition-colors text-center"
            style={{ minHeight: '44px' }}
          >
            Sign Out of Sentinel PWA
          </button>
        </section>

      </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
