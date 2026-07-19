import React, { useState, useRef, useEffect } from 'react';
import { getStatusLabel } from '../../api/videoService';

const getDepartmentEmoji = (dept) => {
  switch (dept) {
    case 'POLICE': return '🚔';
    case 'TRAFFIC': return '🚦';
    case 'WATER': return '💧';
    case 'ELECTRICITY': return '⚡';
    case 'SANITATION': return '🧹';
    case 'FIRE': return '🔥';
    case 'HEALTH': return '🏥';
    case 'CONSTRUCTION': return '🏗️';
    case 'ENVIRONMENT': return '🌿';
    case 'REVENUE': return '📋';
    default: return '🏢';
  }
};

function ReelCard({ reel, userReports, onReportVideo, isMuted, toggleMute, upvotedList, toggleUpvote, triggerReportModal }) {
  const videoRef = useRef(null);
  const cardRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsPlaying(true);
            if (videoRef.current) {
              videoRef.current.play().catch((err) => console.log('Autoplay blocked:', err));
            }
          } else {
            setIsPlaying(false);
            if (videoRef.current) {
              videoRef.current.pause();
            }
          }
        });
      },
      { threshold: 0.6 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const isUpvoted = upvotedList.includes(reel.id);
  const liveReport = userReports.find(r => r.id === reel.id);
  const currentStatus = liveReport ? liveReport.status : reel.status;
  const currentUpvotes = (reel.upvotes || 0) + (isUpvoted ? 1 : 0);

  return (
    <div 
      ref={cardRef}
      className="w-full h-full snap-start relative flex flex-col justify-between p-5 bg-white text-slate-900 overflow-hidden select-text border-b border-yellow-400/20"
    >
      {/* Video or Image Canvas */}
      <div className="absolute inset-0 bg-slate-900 z-0">
        {reel.videoUrl ? (
          <video
            ref={videoRef}
            src={reel.videoUrl}
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-400 font-bold text-xs">
            [Visual Stream Feed]
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />
      </div>

      {/* Top Header Overlay */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-[#ffd900] text-slate-950 text-[10px] font-black rounded-full font-sora border border-slate-950/10">
            {getDepartmentEmoji(reel.department)} {reel.department || 'GENERAL'}
          </span>
          <span className="px-2.5 py-1 bg-white/90 text-slate-900 text-[10px] font-bold rounded-full backdrop-blur-xs font-mono">
            {reel.timestamp || 'Just now'}
          </span>
        </div>

        <button
          onClick={toggleMute}
          className="p-2.5 bg-white/90 text-slate-900 rounded-full backdrop-blur-xs shadow-xs hover:bg-white transition-all"
        >
          {isMuted ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          )}
        </button>
      </div>

      {/* Right Action Stack */}
      <div className="absolute right-4 bottom-24 z-10 flex flex-col gap-4 items-center">
        <button
          onClick={() => toggleUpvote(reel.id)}
          className={`p-3.5 rounded-full backdrop-blur-md transition-all shadow-md ${
            isUpvoted ? 'bg-[#ffd900] text-slate-950 scale-110' : 'bg-white/80 text-slate-900 hover:bg-white'
          }`}
        >
          <svg viewBox="0 0 24 24" fill={isUpvoted ? '#09090b' : 'none'} stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
        </button>
        <span className="text-[10px] font-black text-white font-mono drop-shadow">{currentUpvotes}</span>

        <button
          onClick={() => triggerReportModal(reel)}
          className="p-3.5 bg-red-600/90 hover:bg-red-600 text-white rounded-full backdrop-blur-md shadow-md transition-all"
          title="Flag Suspicious"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </button>
      </div>

      {/* Bottom Information Details */}
      <div className="relative z-10 space-y-2 text-white max-w-[80%] pr-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-yellow-300 font-mono">📍 {reel.location || 'Bengaluru Ward'}</span>
        </div>
        
        <h3 className="text-lg font-black font-sora text-white leading-snug drop-shadow-sm">
          {reel.title}
        </h3>
        
        <p className="text-slate-200 text-xs font-medium leading-relaxed line-clamp-2 drop-shadow-xs">
          {reel.description}
        </p>

        <div className="pt-2 flex items-center gap-2">
          <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-xs text-white text-[9px] font-bold rounded-md font-mono">
            Status: {getStatusLabel(currentStatus)}
          </span>
        </div>
      </div>

    </div>
  );
}

export default function LocalReelsFeedView({ userReports = [], onReportVideo }) {
  const [isMuted, setIsMuted] = useState(false);
  const [upvotedList, setUpvotedList] = useState([]);
  const [flagModalReel, setFlagModalReel] = useState(null);

  // Pre-seed mock incident feeds
  const mockFeeds = [
    {
      id: 'feed-1',
      title: 'Water Main Pipeline Burst',
      description: 'Massive water gush flooding 100ft road Indiranagar. BWSSB repair crew dispatched.',
      department: 'WATER',
      location: '100ft Road, Indiranagar',
      timestamp: '10 mins ago',
      upvotes: 42,
      status: 'PUBLIC_APPROVED'
    },
    {
      id: 'feed-2',
      title: 'Power Outage & Transformer Spark',
      description: 'Sparks spotted on pole #B-42. BESCOM team informed for emergency shutdown.',
      department: 'ELECTRICITY',
      location: '5th Block, Koramangala',
      timestamp: '25 mins ago',
      upvotes: 89,
      status: 'PUBLIC_APPROVED'
    },
    {
      id: 'feed-3',
      title: 'Road Hole Hazard Near Junction',
      description: 'Caved asphalt creating severe traffic jam. Traffic police placing safety cones.',
      department: 'TRAFFIC',
      location: 'Silk Board Junction',
      timestamp: '1 hour ago',
      upvotes: 120,
      status: 'PUBLIC_APPROVED'
    }
  ];

  // Merge user reports
  const allReels = [
    ...userReports.map(r => ({
      id: r.id,
      title: r.title || 'User Safety Incident',
      description: r.description || 'Public incident upload.',
      department: (r.category || 'POLICE').toUpperCase(),
      location: 'Near Current GPS',
      timestamp: r.timestamp || 'Just now',
      upvotes: r.views || 5,
      status: r.status,
      videoUrl: r.videoUrl
    })),
    ...mockFeeds
  ];

  const toggleMute = () => setIsMuted(!isMuted);

  const toggleUpvote = (id) => {
    setUpvotedList(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white font-sans overflow-hidden select-text relative">
      
      {/* Editorial Header */}
      <div className="px-6 py-4 bg-white border-b border-yellow-400/20 flex-none flex items-center justify-between z-20">
        <div>
          <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-widest block font-mono">
            COMMUNITY SAFETY BROADCASTS
          </span>
          <h2 className="text-xl font-black text-slate-950 font-sora">
            Incident <span className="font-serif italic font-normal text-[#b08850] pr-1">Feed</span>
          </h2>
        </div>
        <span className="text-[10px] font-bold text-slate-900 bg-yellow-400/20 border border-yellow-400/30 px-2.5 py-1 rounded-full font-mono">
          {allReels.length} Active Feeds
        </span>
      </div>

      {/* Vertical Snap Scroll Reels Container */}
      <div className="flex-1 overflow-y-scroll snap-y snap-mandatory h-full w-full bg-slate-950">
        {allReels.map((reel) => (
          <ReelCard
            key={reel.id}
            reel={reel}
            userReports={userReports}
            onReportVideo={onReportVideo}
            isMuted={isMuted}
            toggleMute={toggleMute}
            upvotedList={upvotedList}
            toggleUpvote={toggleUpvote}
            triggerReportModal={(r) => setFlagModalReel(r)}
          />
        ))}
      </div>

      {/* Flag Incident Modal */}
      {flagModalReel && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="font-black text-red-600 text-base font-sora">
              Flag Suspicious Feed?
            </h3>
            <p className="text-slate-600 text-xs font-semibold leading-relaxed">
              Are you sure you want to flag "{flagModalReel.title}"? This alert will be forwarded to district moderators for inspection.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setFlagModalReel(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onReportVideo(flagModalReel.id);
                  setFlagModalReel(null);
                  alert('Incident flagged to precinct control.');
                }}
                className="px-4 py-2 bg-red-600 text-white font-black rounded-xl text-xs uppercase font-sora"
              >
                Flag Alert
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
