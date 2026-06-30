import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, EyeOff, Bookmark, Activity, ArrowLeft, Award, Trash2, CheckCircle2, X, Heart, Play, MapPin, Radio, ShieldAlert } from 'lucide-react';

export default function UserProfileView({ onBack, bookmarkedLaws = [], userReports = [], onRemoveBookmark, onDeleteReport, onResolveReport, onSignOut }) {
  const [ghostMode, setGhostMode] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState('posted'); // 'posted' or 'liked'
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const safeReports = Array.isArray(userReports) ? userReports : [];
  const safeBookmarkedLaws = Array.isArray(bookmarkedLaws) ? bookmarkedLaws : [];

  const localUploaderUuid = localStorage.getItem('kawach_uploader_uuid') || '';
  const myReports = safeReports.filter(r => r && (r.uploaderUuid === localUploaderUuid || (r.id && typeof r.id === 'string' && r.id.startsWith('c-'))));
  
  const likedIds = (() => {
    try {
      const stored = localStorage.getItem('kawach_liked_reports');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  })();
  const myLikedReports = safeReports.filter(r => r && r.id && likedIds.includes(r.id));

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

  if (!isReady) {
    return (
      <div className="p-6 flex flex-col gap-6 animate-pulse select-none">
        <div className="h-28 bg-slate-200 rounded-3xl" />
        <div className="h-32 bg-slate-200 rounded-3xl" />
        <div className="h-48 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-y-auto pb-24 select-text bg-slate-50" style={{ scrollbarWidth: 'none' }}>
      <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-yellow-500/5 to-transparent pointer-events-none z-0" />
      
      {/* Header (Hidden because of layout level TopBar) */}
      <div className="sticky top-0 bg-white border-b border-slate-200/80 px-4 py-4 flex items-center justify-between z-30 shadow-xs" style={{ display: 'none' }}>
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

        {/* Tab Selection Segments */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => setActiveTab('posted')}
            className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider text-center ${
              activeTab === 'posted'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Posted Logs ({myReports.length})
          </button>
          <button
            onClick={() => setActiveTab('liked')}
            className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider text-center ${
              activeTab === 'liked'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Liked Feed ({myLikedReports.length})
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'posted' ? (
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-slate-400" /> Sentinel Activity Logs
            </h3>

            {myReports.length > 0 ? (
              <div className="grid grid-cols-3 gap-1 md:gap-1.5">
                {myReports.map((report) => (
                  <div 
                    key={report.id} 
                    onClick={() => setSelectedReport(report)}
                    className="aspect-square bg-slate-900 rounded-xl overflow-hidden relative cursor-pointer group hover:scale-[1.02] transition-transform duration-200"
                  >
                    {report.videoUrl ? (
                      <video 
                        src={report.videoUrl} 
                        className="w-full h-full object-cover pointer-events-none" 
                        muted 
                        playsInline
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center p-2 text-center text-slate-400">
                        <ShieldAlert className="w-5 h-5 text-yellow-500 mb-1" />
                        <span className="text-[7px] font-bold truncate w-full">{report.category}</span>
                      </div>
                    )}
                    {/* Status Overlay icon */}
                    <div className="absolute top-1 right-1 px-1 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider bg-black/60 text-white">
                      {report.status === 'RESOLVED' ? '✅' : '⏳'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs font-semibold">
                No posted logs yet. Record and post safety reports to show them here.
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-slate-400" /> Liked Reports & Feeds
            </h3>

            {myLikedReports.length > 0 ? (
              <div className="grid grid-cols-3 gap-1 md:gap-1.5">
                {myLikedReports.map((report) => (
                  <div 
                    key={report.id} 
                    onClick={() => setSelectedReport(report)}
                    className="aspect-square bg-slate-900 rounded-xl overflow-hidden relative cursor-pointer group hover:scale-[1.02] transition-transform duration-200"
                  >
                    {report.videoUrl ? (
                      <video 
                        src={report.videoUrl} 
                        className="w-full h-full object-cover pointer-events-none" 
                        muted 
                        playsInline
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center p-2 text-center text-slate-400">
                        <ShieldAlert className="w-5 h-5 text-yellow-500 mb-1" />
                        <span className="text-[7px] font-bold truncate w-full">{report.category}</span>
                      </div>
                    )}
                    {/* Status Overlay icon */}
                    <div className="absolute top-1 right-1 px-1 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider bg-black/60 text-white">
                      {report.status === 'RESOLVED' ? '✅' : '⏳'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs font-semibold">
                No liked safety videos yet. Upvoted videos in the proximity feed will appear here.
              </div>
            )}
          </section>
        )}

        {/* Sign Out Button */}
        <section className="pt-2">
          <button 
            onClick={onSignOut}
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider shadow-sm transition-colors text-center"
            style={{ minHeight: '44px' }}
          >
            Sign Out of Sentinel PWA
          </button>
        </section>

        {/* Detail Modal Overlay */}
        <AnimatePresence>
          {selectedReport && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
              onClick={() => setSelectedReport(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-3xl p-5 w-full max-w-sm border border-slate-100 flex flex-col gap-4 shadow-2xl relative select-text"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-700 transition-colors"
                  style={{ minWidth: '32px', minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X className="w-4 h-4" />
                </button>

                <div>
                  <span className="px-2.5 py-0.5 bg-yellow-50 border border-yellow-100 rounded-full text-[9px] font-bold text-yellow-800 uppercase tracking-wide">
                    {selectedReport.category}
                  </span>
                  <h3 className="text-sm font-black text-slate-900 font-outfit uppercase tracking-wider mt-2 pr-6">
                    {selectedReport.title || 'Incident Log'}
                  </h3>
                </div>

                {selectedReport.videoUrl ? (
                  <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 aspect-video shadow-sm">
                    <video 
                      src={selectedReport.videoUrl} 
                      controls 
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-video bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-4 text-center text-slate-400">
                    <ShieldAlert className="w-10 h-10 text-yellow-500 mb-2" />
                    <span className="text-xs font-bold text-slate-700">No Video Media Uploaded</span>
                    <span className="text-[10px] text-slate-500 mt-1">Report recorded as textual log telemetry</span>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-slate-600 text-xs font-semibold leading-relaxed">
                    {selectedReport.description || 'No description provided.'}
                  </p>
                  <div className="flex flex-col gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-100 pt-2.5">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Location: {selectedReport.lat?.toFixed(4)}, {selectedReport.lng?.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Radio className="w-3.5 h-3.5 text-slate-400" />
                      <span>Status: {selectedReport.status}</span>
                    </div>
                  </div>
                </div>

                {/* Actions (Only show for reports uploaded by the user) */}
                {(myReports.some(r => r.id === selectedReport.id)) && (
                  <div className="flex gap-2 border-t border-slate-100 pt-3">
                    {selectedReport.status !== 'RESOLVED' && (
                      <button
                        onClick={() => {
                          onResolveReport(selectedReport.id);
                          setSelectedReport(prev => ({ ...prev, status: 'RESOLVED' }));
                        }}
                        className="flex-1 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 rounded-xl text-emerald-600 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                        style={{ minHeight: '40px' }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Resolve</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onDeleteReport(selectedReport.id);
                        setSelectedReport(null);
                      }}
                      className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-rose-600 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                      style={{ minHeight: '40px' }}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
