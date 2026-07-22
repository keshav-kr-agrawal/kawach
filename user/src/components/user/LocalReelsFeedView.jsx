import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
      videoRef.current.play().catch((err) => console.log('Video autoplay:', err));
    }
  }, [isMuted, reel.videoUrl]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (videoRef.current) {
            if (entry.isIntersecting) {
              videoRef.current.play().catch((err) => console.log('Autoplay blocked:', err));
            } else {
              videoRef.current.pause();
            }
          }
        });
      },
      { threshold: 0.2 }
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
      className="w-full h-full snap-start relative flex flex-col justify-between p-5 bg-[#09090b] text-white overflow-hidden select-text border-b border-amber-400/20"
    >
      {/* Video or Visual Canvas */}
      <div className="absolute inset-0 bg-[#09090b] z-0">
        {reel.videoUrl ? (
          <video
            key={reel.videoUrl || reel.id}
            ref={videoRef}
            src={reel.videoUrl}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#18181b] flex items-center justify-center text-amber-200/60 font-bold text-xs font-mono">
            [Real Citizen Stream]
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />
      </div>

      {/* Top Header Overlay */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-[#E9BA26] text-ink text-[10px] font-black rounded-full font-sora border border-amber-950/10">
            {getDepartmentEmoji(reel.department)} {reel.department || 'GENERAL'}
          </span>
          <span className="px-2.5 py-1 bg-black/60 text-white text-[10px] font-bold rounded-full backdrop-blur-xs font-mono">
            {reel.timestamp || 'Just now'}
          </span>
        </div>

        <button
          onClick={toggleMute}
          className="p-2.5 bg-black/60 text-white rounded-full backdrop-blur-xs shadow-xs hover:bg-black/80 transition-all"
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
            isUpvoted ? 'bg-[#E9BA26] text-ink scale-110' : 'bg-black/60 text-white hover:bg-black/80'
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
      <div className="relative z-10 space-y-2 text-white max-w-[80%] pr-4 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-300 font-mono">📍 {reel.location || 'Near Current GPS'}</span>
        </div>
        
        <h3 className="text-lg font-black font-sora text-white leading-snug drop-shadow-sm">
          {reel.title}
        </h3>
        
        <p className="text-amber-100/90 text-xs font-medium leading-relaxed line-clamp-2 drop-shadow-xs">
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
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [upvotedList, setUpvotedList] = useState([]);
  const [flagModalReel, setFlagModalReel] = useState(null);

  // Map real user reports only (no hardcoded mock videos)
  const realReels = userReports.map(r => ({
    id: r.id,
    title: r.title || 'User Safety Incident',
    description: r.description || 'Public incident upload.',
    department: (r.category || 'POLICE').toUpperCase(),
    location: r.lat && r.lng ? `GPS (${r.lat.toFixed(3)}, ${r.lng.toFixed(3)})` : 'Near Current GPS',
    timestamp: r.timestamp || 'Just now',
    upvotes: r.upvotes || r.views || 0,
    status: r.status,
    videoUrl: r.videoUrl
  }));

  const toggleMute = () => setIsMuted(!isMuted);

  const toggleUpvote = (id) => {
    setUpvotedList(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white font-sans overflow-hidden select-text relative">
      
      {/* Editorial Header */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-amber-400/20 flex-none flex items-center justify-between z-20 md:px-6 md:pt-6 md:pb-3">
        <div>
          <h2 className="text-lg font-black text-ink font-sora md:text-xl">
            Incident <span className="font-serif italic font-normal text-[#b08850] pr-1">Feed</span>
          </h2>
        </div>
        <span className="text-[10px] font-bold text-ink bg-amber-400/20 border border-amber-400/30 px-2.5 py-1 rounded-full font-mono">
          {realReels.length} Real Videos
        </span>
      </div>

      {/* Vertical Snap Scroll Reels Container or Empty State */}
      {realReels.length > 0 ? (
        <div className="flex-1 overflow-y-scroll snap-y snap-mandatory h-full w-full bg-[#09090b]">
          {realReels.map((reel) => (
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
      ) : (
        <div className="flex-1 bg-[#09090b] flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 text-3xl">
            📹
          </div>
          <h3 className="text-base font-black font-sora text-white">
            No Real Incident Videos Found
          </h3>
          <p className="text-xs font-medium text-amber-200/80 max-w-xs leading-relaxed">
            There are currently no real citizen videos recorded. Tap below to record and publish the first real incident clip!
          </p>
          <button
            onClick={() => navigate('/user/camera')}
            className="px-5 py-3 bg-[#E9BA26] hover:bg-amber-400 text-ink font-black rounded-xl text-xs uppercase tracking-wider font-sora shadow-lg transition-all cursor-pointer"
          >
            📹 Record Real Incident Clip
          </button>
        </div>
      )}

      {/* Flag Incident Modal */}
      {flagModalReel && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-red-500 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="font-black text-red-600 text-base font-sora">
              Flag Suspicious Feed?
            </h3>
            <p className="text-ink-soft text-xs font-semibold leading-relaxed">
              Are you sure you want to flag "{flagModalReel.title}"? This alert will be forwarded to district moderators for inspection.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setFlagModalReel(null)}
                className="px-4 py-2 bg-amber-50 text-ink-soft font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onReportVideo) onReportVideo(flagModalReel.id);
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
