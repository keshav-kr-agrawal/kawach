import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Share2, AlertOctagon, Radio, ChevronUp, ChevronDown, ShieldAlert, BookOpen, User, Volume2, VolumeX } from 'lucide-react';
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

const getPriorityColor = (prio) => {
  switch (prio) {
    case 'CRITICAL': return '#ef4444';
    case 'HIGH': return '#f97316';
    case 'NORMAL': return '#3b82f6';
    case 'LOW': return '#10b981';
    default: return '#6b7280';
  }
};

// Sub-component for individual video reel cards
function ReelCard({ reel, userReports, onReportVideo, isMuted, toggleMute, upvotedList, toggleUpvote, triggerReportModal }) {
  const videoRef = useRef(null);
  const cardRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reelsPlayProgress, setReelsPlayProgress] = useState(0);

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
              videoRef.current.currentTime = 0;
            }
          }
        });
      },
      { threshold: 0.7 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  const isReelChecking = reel.status === 'AI_CHECK_1' || reel.status === 'AI_CHECK_2';

  return (
    <div 
      ref={cardRef} 
      className="relative w-full h-[100dvh] snap-center bg-black flex items-center justify-center flex-shrink-0"
    >
      {/* Real captured video player OR mock animation */}
      {reel.videoUrl ? (
        <>
          <video
            ref={videoRef}
            src={reel.trimStart !== undefined && reel.trimEnd !== undefined && reel.trimEnd > reel.trimStart
              ? `${reel.videoUrl}#t=${reel.trimStart},${reel.trimEnd}` 
              : reel.videoUrl}
            loop
            muted={isMuted}
            playsInline
            onTimeUpdate={(e) => {
              const video = e.target;
              const start = reel.trimStart !== undefined ? reel.trimStart : 0;
              const end = reel.trimEnd !== undefined ? reel.trimEnd : video.duration || 15;
              const duration = end - start;
              if (duration > 0) {
                const progress = ((video.currentTime - start) / duration) * 100;
                setReelsPlayProgress(Math.min(100, Math.max(0, progress)));
              }
            }}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Snapchat-style Story Progress Bar */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '20px',
            right: '20px',
            height: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '2px',
            zIndex: 10,
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${reelsPlayProgress}%`,
              height: '100%',
              backgroundColor: '#ffd900',
              borderRadius: '2px',
              transition: 'width 0.1s linear'
            }} />
          </div>
        </>
      ) : (
        <>
          <div style={{
            width: '100%',
            height: '100%',
            background: reel.avatarGradient || 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            opacity: 0.15,
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1
          }} />

          <div style={{
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div className="pulse-red" style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 217, 0, 0.1)',
              border: '2px solid #ffd900',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffd900'
            }}>
              <ShieldAlert size={40} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: '750', color: '#ffffff', letterSpacing: '0.05em' }}>
              STREAMING LOCAL ALERTS
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: '500' }}>
              Distance: {reel.distanceValue === 0.05 ? 'Under 50m' : `${reel.distanceValue} km away`}
            </span>
            <span style={{
              fontSize: '9px',
              fontWeight: '800',
              backgroundColor: 'rgba(255,255,255,0.15)',
              padding: '4px 10px',
              borderRadius: '12px',
              color: isReelChecking ? '#ffd900' : (reel.status === 'REPORTED_SUSPICIOUS' ? '#ff3b30' : '#007aff')
            }}>
              {isReelChecking ? '🤖 AI Safety Check Active' : getStatusLabel(reel.status)}
            </span>
          </div>
        </>
      )}

      {/* UI Overlay (Bottom Right - Actions) */}
      <div className="absolute bottom-24 right-4 flex flex-col items-center gap-6 z-10">
        {/* Upvote button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleUpvote(reel.id); }}
            style={{
              background: 'transparent',
              border: 'none',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: upvotedList[reel.id] ? '#ffd900' : '#ffffff',
              cursor: 'pointer'
            }}
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
          <span style={{ fontSize: '10px', color: '#ffffff', marginTop: '4px', fontWeight: '700', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
            {reel.upvotes}
          </span>
        </div>

        {/* Share */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'transparent',
              border: 'none',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <Share2 size={18} />
          </button>
          <span style={{ fontSize: '10px', color: '#ffffff', marginTop: '4px', fontWeight: '600', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>{reel.shares}</span>
        </div>

        {/* Mute Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
            style={{
              background: 'transparent',
              border: 'none',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isMuted ? '#ff3b30' : '#ffffff',
              cursor: 'pointer'
            }}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <span style={{ fontSize: '8px', color: isMuted ? '#ff3b30' : '#ffffff', marginTop: '4px', fontWeight: '750', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
            {isMuted ? "Muted" : "Sound"}
          </span>
        </div>

        {/* Flag Incident */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); triggerReportModal(reel); }}
            style={{
              background: 'transparent',
              border: 'none',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ff3b30',
              cursor: 'pointer'
            }}
          >
            <AlertOctagon size={18} />
          </button>
          <span style={{ fontSize: '8px', color: '#ff6b6b', marginTop: '4px', fontWeight: '700', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>Flag Fake</span>
        </div>
      </div>

      {/* UI Overlay (Bottom Left - Text/AI Tags) */}
      <div className="absolute bottom-20 left-4 right-16 flex flex-col gap-2 z-10 text-white pointer-events-none">
        {/* AI checking compact pill */}
        {isReelChecking && (
          <div className="bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full w-max flex items-center gap-1">
            🤖 AI Scanning
          </div>
        )}

        {/* Compact dept + priority pills row */}
        {reel.routedDepartment && (
          <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
            <span className="bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full w-max font-bold">
              {getDepartmentEmoji(reel.routedDepartment)} {reel.routedDepartment}
            </span>
            {reel.subCategory && (
              <span className="bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full w-max">
                {reel.subCategory.replace(/_/g, ' ')}
              </span>
            )}
            <span className="text-white text-xs px-2 py-1 rounded-full w-max font-black" style={{ backgroundColor: getPriorityColor(reel.routingPriority) }}>
              {reel.routingPriority}
            </span>
            {typeof reel.trustScore === 'number' && reel.trustScore > 0 && (
              <span className="bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full w-max">
                Trust {reel.trustScore.toFixed(0)}
              </span>
            )}
          </div>
        )}

        <h2 className="text-sm font-bold text-shadow" style={{ margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
          {reel.title}
        </h2>
        <p className="text-xs text-white/90 text-shadow" style={{ margin: 0, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
          {reel.description}
        </p>
        <div className="flex gap-2 text-[10px] text-white/60 font-semibold">
          <span>👤 {reel.uploaderUuid.substring(0, 8)}...</span>
          <span>•</span>
          <span>⏱️ {reel.timestamp}</span>
        </div>
      </div>
    </div>
  );
}

export default function LocalReelsFeedView({ gpsCoords, userReports, onReportVideo, onUpvoteReport, onOpenProfile, onOpenLibrary }) {
  const [upvotedList, setUpvotedList] = useState(() => {
    try {
      const saved = localStorage.getItem('kawach_liked_reports');
      const parsed = saved ? JSON.parse(saved) : [];
      const listObj = {};
      parsed.forEach(id => { listObj[id] = true; });
      return listObj;
    } catch (e) {
      return {};
    }
  });
  const [reportModal, setReportModal] = useState(null);
  const [reportStatusMessage, setReportStatusMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  // Merge approved user uploads and sort strictly by distance
  const allReels = userReports
    .filter(r => r.status === 'PUBLIC_APPROVED' || r.status === 'COHORT_TEST' || r.status === 'DEPT_ROUTING' || r.status === 'AI_CHECK_1' || r.status === 'AI_CHECK_2')
    .map(r => ({
      id: r.id,
      title: r.title,
      description: r.description || 'Recorded safety alert.',
      distanceValue: 0.05,
      uploaderUuid: r.uploaderUuid,
      timestamp: r.timestamp || 'Just now',
      upvotes: r.upvotes || 0,
      shares: 0,
      status: r.status,
      avatarGradient: 'linear-gradient(135deg, #ffd900 0%, #ff9500 100%)',
      videoUrl: r.videoUrl,
      trimStart: r.trimStart,
      trimEnd: r.trimEnd,
      routedDepartment: r.routedDepartment,
      routingPriority: r.routingPriority,
      routingReason: r.routingReason,
      subCategory: r.subCategory,
      estimatedResolutionDays: r.estimatedResolutionDays,
      trustScore: r.trustScore,
      civicUrgencyScore: r.civicUrgencyScore,
      sceneDetected: r.sceneDetected,
      detectedIssues: r.detectedIssues,
      temporalConsistency: r.temporalConsistency,
      dominantClass: r.dominantClass
    }));

  const toggleUpvote = (id) => {
    setUpvotedList(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
    if (onUpvoteReport) {
      onUpvoteReport(id);
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const triggerReportModal = (reel) => {
    setReportModal(reel);
    setReportStatusMessage('');
  };

  const submitReport = () => {
    if (!reportModal) return;
    onReportVideo(reportModal.id);
    setReportStatusMessage('FORENSIC COMPLIANCE TRACE LAUNCHED ✅');
    setTimeout(() => {
      setReportModal(null);
    }, 1500);
  };

  if (allReels.length === 0) {
    return (
      <div className="view-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <p style={{ color: '#999999', fontSize: '13px', fontWeight: '500' }}>No proximity reels available.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full snap-y snap-mandatory overflow-y-scroll scrollbar-hide bg-black">

      
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
          triggerReportModal={triggerReportModal}
        />
      ))}

      {/* Flag Report — Bottom Sheet (not full-screen takeover) */}
      {reportModal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 9999,
          }}
          onClick={() => setReportModal(null)}
        >
          {/* Dim overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(2px)',
          }} />
          {/* Sheet */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              borderRadius: '24px 24px 0 0',
              backgroundColor: '#ffffff',
              padding: `24px 24px calc(24px + env(safe-area-inset-bottom))`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              animation: 'slideUp 0.25s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#e2e8f0', marginBottom: '4px' }} />

            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 59, 48, 0.08)',
              border: '2px solid rgba(255,59,48,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ff3b30',
            }}>
              <AlertOctagon size={28} />
            </div>

            <h3 style={{ fontSize: '17px', margin: 0, fontFamily: 'Outfit', fontWeight: '850', color: '#000' }}>
              Flag Safety Video
            </h3>
            <p style={{
              fontSize: '12px',
              color: '#64748b',
              textAlign: 'center',
              maxWidth: '280px',
              lineHeight: 1.5,
              margin: 0,
              fontWeight: '500'
            }}>
              Flagging initiates an automated forensic verification trace. The upload status will transition into secondary rigorous verification models.
            </p>

            {reportStatusMessage ? (
              <span style={{ fontSize: '12px', color: '#ff3b30', fontWeight: '700', textAlign: 'center' }}>
                {reportStatusMessage}
              </span>
            ) : (
              <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '320px' }}>
                <button
                  onClick={() => setReportModal(null)}
                  style={{
                    flex: 1,
                    padding: '13px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    color: '#374151',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '13px',
                    fontFamily: 'Outfit'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitReport}
                  style={{
                    flex: 1,
                    padding: '13px',
                    borderRadius: '16px',
                    border: 'none',
                    backgroundColor: '#ff3b30',
                    color: '#ffffff',
                    cursor: 'pointer',
                    fontWeight: '800',
                    fontSize: '13px',
                    fontFamily: 'Outfit',
                    boxShadow: '0 4px 12px rgba(255, 59, 48, 0.25)'
                  }}
                >
                  Flag Video
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
