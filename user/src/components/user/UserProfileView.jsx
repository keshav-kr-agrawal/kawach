import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function Spinner() {
  return (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div>
  );
}

export default function UserProfileView({ 
  onBack, 
  bookmarkedLaws = [], 
  userReports = [], 
  onRemoveBookmark, 
  onToggleBookmark,
  onDeleteReport, 
  onResolveReport, 
  onSignOut,
  onLogout,
  isLoading,
  user
}) {
  const handleSignOut = onSignOut || onLogout;

  const [ghostMode, setGhostMode] = useState(true);
  const [activeTab, setActiveTab] = useState('posted'); // 'posted' or 'liked'
  const [selectedReport, setSelectedReport] = useState(null);

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-white">
        <Spinner />
      </div>
    );
  }

  const safeReports = Array.isArray(userReports) ? userReports : [];
  const safeBookmarkedLaws = Array.isArray(bookmarkedLaws) ? bookmarkedLaws : [];

  const localUploaderUuid = localStorage.getItem('kawach_uploader_uuid') || '';
  const myReports = safeReports.filter(r => r && (r.uploaderUuid === localUploaderUuid || (r.id && typeof r.id === 'string' && r.id.startsWith('c-'))));

  return (
    <div className="flex-1 flex flex-col h-full bg-white font-sans text-ink overflow-y-auto pb-24 select-text">
      
      {/* Header Banner — Restored with top notch safety padding */}
      <div className="px-4 pt-6 pb-3 bg-white border-b border-amber-400/20 md:px-6 md:pt-8 md:pb-4">
        <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-widest block mb-0.5 font-mono">
          PRIVACY CONTROL &amp; INCIDENT HISTORY
        </span>
        <h2 className="text-xl font-black text-ink font-sora md:text-2xl">
          Citizen <span className="font-serif italic font-normal text-[#b08850] pr-1">Profile</span>
        </h2>
        <p className="text-ink-soft text-xs font-semibold mt-1 leading-relaxed hidden sm:block">
          Manage your anonymous sentinel identity, saved law codes, and public report status.
        </p>
      </div>

      <div className="p-5 space-y-6">

        {/* User Card Info */}
        <div className="bg-white border-2 border-[#E9BA26] rounded-3xl p-6 space-y-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#E9BA26] text-ink font-black text-xl rounded-2xl flex items-center justify-center border border-amber-950/10 shadow-xs font-sora">
              {(user?.email || 'C')[0].toUpperCase()}
            </div>
            <div>
              <h3 className="font-black text-ink text-base font-sora">
                {user?.email || 'Anonymous Citizen Node'}
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                Verified Sentinel User
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-amber-400/10 border border-amber-400/20 p-3 rounded-2xl">
              <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-wider block">Reports Logged</span>
              <h4 className="text-xl font-black text-ink font-sora mt-0.5">{myReports.length}</h4>
            </div>
            <div className="bg-amber-400/10 border border-amber-400/20 p-3 rounded-2xl">
              <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-wider block">Saved Laws</span>
              <h4 className="text-xl font-black text-ink font-sora mt-0.5">{safeBookmarkedLaws.length}</h4>
            </div>
          </div>
        </div>

        {/* Ghost Mode Privacy Toggle */}
        <div className="bg-white border border-amber-400/20 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <h4 className="font-black text-ink text-xs font-sora">Ghost Mode Metadata Scrubbing</h4>
            <p className="text-ink-soft text-[10px] font-semibold mt-0.5">Strip GPS EXIF & device identifiers before dispatch</p>
          </div>
          <input
            type="checkbox"
            checked={ghostMode}
            onChange={(e) => setGhostMode(e.target.checked)}
            className="w-5 h-5 accent-[#E9BA26] cursor-pointer"
          />
        </div>

        {/* Navigation Tabs (My Reports vs Bookmarked Laws) */}
        <div className="space-y-4">
          <div className="bg-amber-50 p-1 rounded-2xl flex gap-1 border border-amber-200">
            <button
              onClick={() => setActiveTab('posted')}
              className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all font-sora ${
                activeTab === 'posted'
                  ? 'bg-white text-ink shadow-xs border border-amber-400/40'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              📹 My Uploaded Incidents ({myReports.length})
            </button>
            <button
              onClick={() => setActiveTab('liked')}
              className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all font-sora ${
                activeTab === 'liked'
                  ? 'bg-white text-ink shadow-xs border border-amber-400/40'
                  : 'text-ink-soft hover:text-ink'
              }`}
            >
              🔖 Saved Legal Rules ({safeBookmarkedLaws.length})
            </button>
          </div>

          {/* Content Lists */}
          {activeTab === 'posted' ? (
            <div className="space-y-3">
              {myReports.length === 0 ? (
                <div className="p-8 text-center bg-amber-50 rounded-2xl border border-dashed border-amber-200 text-ink-faint text-xs font-semibold">
                  No incident reports submitted yet. Use Camera to record evidence.
                </div>
              ) : (
                myReports.map((report) => (
                  <div key={report.id} className="bg-white border border-amber-400/20 p-4 rounded-2xl space-y-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-ink text-xs font-sora">{report.title}</h4>
                      <span className="text-[9px] font-bold text-ink bg-[#E9BA26] px-2 py-0.5 rounded uppercase font-mono">
                        {report.status}
                      </span>
                    </div>
                    <p className="text-ink-soft text-[11px] font-semibold">{report.description}</p>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => onDeleteReport && onDeleteReport(report.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg text-[10px]"
                      >
                        Delete Log
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {safeBookmarkedLaws.length === 0 ? (
                <div className="p-8 text-center bg-amber-50 rounded-2xl border border-dashed border-amber-200 text-ink-faint text-xs font-semibold">
                  No bookmarked laws saved. Explore the Citizen Law Library.
                </div>
              ) : (
                safeBookmarkedLaws.map((lawId) => (
                  <div key={lawId} className="bg-white border border-amber-400/20 p-4 rounded-2xl flex items-center justify-between shadow-xs">
                    <div>
                      <h4 className="font-black text-ink text-xs font-sora">BNS Rule Citation #{lawId}</h4>
                      <span className="text-[10px] text-ink-faint font-bold">Saved in Legal Portfolio</span>
                    </div>
                    <button
                      onClick={() => onRemoveBookmark && onRemoveBookmark(lawId)}
                      className="text-red-500 font-bold text-xs px-2 py-1 bg-red-50 rounded-lg"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Sign Out Action */}
        <div className="pt-4">
          <button
            onClick={handleSignOut}
            className="w-full py-3.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-black rounded-2xl text-xs uppercase tracking-wider font-sora transition-all"
          >
            Sign Out of Sentinel Grid
          </button>
        </div>

      </div>
    </div>
  );
}
