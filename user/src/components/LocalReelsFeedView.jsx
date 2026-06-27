import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Share2, AlertOctagon, Radio, ChevronUp, ChevronDown, ShieldAlert, BookOpen, User, Volume2, VolumeX } from 'lucide-react';
import { getStatusLabel } from '../api/videoService';

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

export default function LocalReelsFeedView({ gpsCoords, userReports, onReportVideo, onOpenProfile, onOpenLibrary }) {
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [upvotedList, setUpvotedList] = useState({});
  const [reportModal, setReportModal] = useState(null);
  const [reportStatusMessage, setReportStatusMessage] = useState('');
  const [reelsPlayProgress, setReelsPlayProgress] = useState(0);

  const videoRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [is2xSpeed, setIs2xSpeed] = useState(false);
  const [showCenterIcon, setShowCenterIcon] = useState(null); // 'play' or 'pause'
  const [isMuted, setIsMuted] = useState(false); // default unmuted
  const [showMuteIconOverlay, setShowMuteIconOverlay] = useState(null); // 'mute' or 'unmute'

  const pressTimerRef = useRef(null);
  const pressStartTimeRef = useRef(0);

  useEffect(() => {
    setIsPaused(false);
    setIs2xSpeed(false);
    setShowCenterIcon(null);
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.0;
      videoRef.current.play().catch(err => console.log('Autoplay blocked:', err));
    }
  }, [currentReelIndex]);

  const handleVideoTap = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(err => console.log(err));
      setIsPaused(false);
      setShowCenterIcon('play');
    } else {
      videoRef.current.pause();
      setIsPaused(true);
      setShowCenterIcon('pause');
    }
    setTimeout(() => {
      setShowCenterIcon(null);
    }, 800);
  };

  const toggleMute = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    setShowMuteIconOverlay(nextMuted ? 'mute' : 'unmute');
    setTimeout(() => {
      setShowMuteIconOverlay(null);
    }, 800);
  };

  const handlePressStart = (e) => {
    if (!videoRef.current) return;
    pressStartTimeRef.current = Date.now();
    pressTimerRef.current = setTimeout(() => {
      videoRef.current.playbackRate = 2.0;
      setIs2xSpeed(true);
    }, 300);
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    const pressDuration = Date.now() - pressStartTimeRef.current;
    if (pressDuration < 300) {
      handleVideoTap();
    }
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.0;
    }
    setIs2xSpeed(false);
  };

  const handleTouchStart = (e) => {
    handlePressStart(e);
  };

  const handleTouchEnd = () => {
    handlePressEnd();
  };

  // No pre-seeded mock reels in the feed
  const [reels, setReels] = useState([]);

  // Merge approved user uploads and sort strictly by distance
  const allReelsRaw = [
    ...reels,
    ...userReports
      .filter(r => r.status === 'PUBLIC_APPROVED' || r.status === 'COHORT_TEST' || r.status === 'DEPT_ROUTING' || r.status === 'AI_CHECK_1' || r.status === 'AI_CHECK_2')
      .map(r => ({
        id: r.id,
        title: r.title,
        description: r.description || 'Recorded safety alert.',
        distanceValue: 0.05,
        uploaderUuid: r.uploaderUuid,
        timestamp: 'Just now',
        upvotes: 0,
        shares: 0,
        status: r.status,
        avatarGradient: 'linear-gradient(135deg, #ffd900 0%, #ff9500 100%)',
        videoUrl: r.videoUrl,
        trimStart: r.trimStart,
        trimEnd: r.trimEnd,
        routedDepartment: r.routedDepartment,
        routingPriority: r.routingPriority,
        routingReason: r.routingReason,
        escalationRequired: r.escalationRequired
      }))
  ];

  // STRICT MODERATION FILTER: Hide elements that are REPORTED_SUSPICIOUS or REJECTED
  const allReels = allReelsRaw.filter(reel => {
    const liveReport = userReports.find(r => r.id === reel.id);
    const status = liveReport ? liveReport.status : reel.status;
    return status !== 'REPORTED_SUSPICIOUS' && status !== 'REJECTED';
  }).sort((a, b) => a.distanceValue - b.distanceValue);

  // Bounds safety checks
  const safeIndex = Math.min(currentReelIndex, Math.max(0, allReels.length - 1));
  const activeReel = allReels[safeIndex];

  const handleNextReel = () => {
    if (safeIndex < allReels.length - 1) {
      setCurrentReelIndex(safeIndex + 1);
    }
  };

  const handlePrevReel = () => {
    if (safeIndex > 0) {
      setCurrentReelIndex(safeIndex - 1);
    }
  };

  const toggleUpvote = (reelId) => {
    setUpvotedList((prev) => ({
      ...prev,
      [reelId]: !prev[reelId]
    }));
  };

  const triggerReportModal = (reel) => {
    setReportModal(reel);
    setReportStatusMessage('');
  };

  const submitReport = () => {
    if (!reportModal) return;

    setReportStatusMessage('Processing safety flag...');
    setTimeout(() => {
      onReportVideo(reportModal.id);
      
      setReportStatusMessage('SUCCESS: Flagged. Shifting report status to [REPORTED_SUSPICIOUS] for AI re-audit.');
      setTimeout(() => {
        setReportModal(null);
        if (currentReelIndex >= allReels.length - 1) {
          setCurrentReelIndex(Math.max(0, allReels.length - 2));
        }
      }, 1500);
    }, 1200);
  };

  if (allReels.length === 0) {
    return (
      <div className="view-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' }}>
        <p style={{ color: '#999999', fontSize: '13px', fontWeight: '500' }}>No proximity reels available.</p>
      </div>
    );
  }

  const isReelChecking = activeReel.status === 'AI_CHECK_1' || activeReel.status === 'AI_CHECK_2';

  return (
    <div className="view-container" style={{ padding: '0', position: 'relative', height: '100%', overflow: 'hidden', backgroundColor: '#000000' }}>
      
      {/* Absolute Header Overlay */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pointerEvents: 'auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Profile button */}
          <button 
            onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#ffd900',
              border: '1.5px solid #000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
            }}
            title="Open User Profile"
          >
            <User size={16} color="#000000" strokeWidth={2.5} />
          </button>
          
          <div className="glass-panel" style={{
            padding: '6px 14px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(0, 0, 0, 0.08)'
          }}>
            <Radio size={14} className="pulse-red" style={{ color: '#ff3b30' }} />
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#000000', fontFamily: 'Outfit' }}>
              PROXIMITY FEED (NEAREST FIRST)
            </span>
          </div>
        </div>

        {/* Legal Library button */}
        <button 
          onClick={(e) => { e.stopPropagation(); onOpenLibrary(); }}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#333333',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
          }}
          title="Open Legal Library"
        >
          <BookOpen size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Main Swipeable Feed Simulator */}
      <div 
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Transparent Gesture Overlay Shield covering the entire player background */}
        <div
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 3,
            cursor: 'pointer',
            backgroundColor: 'transparent'
          }}
        />

        {/* 2x Speed badge overlay */}
        {is2xSpeed && (
          <div style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '20px',
            padding: '6px 14px',
            color: '#ffd900',
            fontSize: '11px',
            fontWeight: '800',
            letterSpacing: '0.05em',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            pointerEvents: 'none',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
          }}>
            <span>⏩ 2x SPEED</span>
          </div>
        )}

        {/* Center Indicator overlay (Play/Pause/Mute/Unmute) */}
        {(showCenterIcon || showMuteIconOverlay) && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.75)',
            borderRadius: '16px',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            color: '#ffffff',
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}>
            {showCenterIcon === 'play' && (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                <span style={{ fontSize: '10px', fontWeight: '800', fontFamily: 'Outfit', letterSpacing: '0.05em' }}>PLAY</span>
              </>
            )}
            {showCenterIcon === 'pause' && (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                <span style={{ fontSize: '10px', fontWeight: '800', fontFamily: 'Outfit', letterSpacing: '0.05em' }}>PAUSE</span>
              </>
            )}
            {showMuteIconOverlay === 'mute' && (
              <>
                <VolumeX size={28} />
                <span style={{ fontSize: '10px', fontWeight: '800', fontFamily: 'Outfit', letterSpacing: '0.05em' }}>MUTED</span>
              </>
            )}
            {showMuteIconOverlay === 'unmute' && (
              <>
                <Volume2 size={28} />
                <span style={{ fontSize: '10px', fontWeight: '800', fontFamily: 'Outfit', letterSpacing: '0.05em' }}>UNMUTED</span>
              </>
            )}
          </div>
        )}
        
        {/* Real captured video player OR mock animation */}
        {activeReel.videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={activeReel.trimStart !== undefined && activeReel.trimEnd !== undefined 
                ? `${activeReel.videoUrl}#t=${activeReel.trimStart},${activeReel.trimEnd}` 
                : activeReel.videoUrl}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              onTimeUpdate={(e) => {
                const video = e.target;
                const start = activeReel.trimStart !== undefined ? activeReel.trimStart : 0;
                const end = activeReel.trimEnd !== undefined ? activeReel.trimEnd : video.duration || 15;
                const duration = end - start;
                if (duration > 0) {
                  const progress = ((video.currentTime - start) / duration) * 100;
                  setReelsPlayProgress(Math.min(100, Math.max(0, progress)));
                }
              }}
              style={{ width: '100%', height: '100%', objectFit: 'cover', zIndex: 2 }}
            />
            {/* Snapchat-style Story Progress Bar */}
            <div style={{
              position: 'absolute',
              top: '72px', // offset from the top overlay header area
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
              background: activeReel.avatarGradient,
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
                Distance: {activeReel.distanceValue === 0.05 ? 'Under 50m' : `${activeReel.distanceValue} km away`}
              </span>
              <span style={{
                fontSize: '9px',
                fontWeight: '800',
                backgroundColor: 'rgba(255,255,255,0.15)',
                padding: '4px 10px',
                borderRadius: '12px',
                color: isReelChecking ? '#ffd900' : (activeReel.status === 'REPORTED_SUSPICIOUS' ? '#ff3b30' : '#007aff')
              }}>
                {isReelChecking ? '🤖 AI Safety Check Active' : getStatusLabel(activeReel.status)}
              </span>
            </div>
          </>
        )}

        {/* Swipe Navigation Buttons */}
        <div style={{
          position: 'absolute',
          right: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          zIndex: 10,
          alignItems: 'center'
        }}>
          {/* Swipe Up */}
          <button 
            onClick={(e) => { e.stopPropagation(); handlePrevReel(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            disabled={safeIndex === 0}
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: safeIndex === 0 ? 'rgba(255,255,255,0.2)' : '#ffffff',
              cursor: 'pointer'
            }}
          >
            <ChevronUp size={22} />
          </button>

          {/* Core Interactive Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '10px 0' }}>
            
            {/* Upvote button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleUpvote(activeReel.id); }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                style={{
                  background: upvotedList[activeReel.id] ? '#ffd900' : 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '50%',
                  width: '46px',
                  height: '46px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: upvotedList[activeReel.id] ? '#000000' : '#ffffff',
                  cursor: 'pointer',
                  boxShadow: upvotedList[activeReel.id] ? '0 0 12px rgba(234,179,8,0.4)' : 'none'
                }}
              >
                <ArrowUp size={20} strokeWidth={2.5} />
              </button>
              <span style={{ fontSize: '11px', color: '#ffffff', marginTop: '4px', fontWeight: '700' }}>
                {activeReel.upvotes + (upvotedList[activeReel.id] ? 1 : 0)}
              </span>
            </div>

            {/* Share */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '50%',
                  width: '46px',
                  height: '46px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <Share2 size={20} />
              </button>
              <span style={{ fontSize: '11px', color: '#ffffff', marginTop: '4px', fontWeight: '600' }}>{activeReel.shares}</span>
            </div>

            {/* Volume Toggle Mute Button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button 
                onClick={toggleMute}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                style={{
                  background: isMuted ? 'rgba(255, 59, 48, 0.15)' : 'rgba(0,0,0,0.5)',
                  border: isMuted ? '1px solid rgba(255, 59, 48, 0.4)' : '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '50%',
                  width: '46px',
                  height: '46px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isMuted ? '#ff3b30' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title={isMuted ? "Unmute Audio" : "Mute Audio"}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <span style={{ fontSize: '9px', color: isMuted ? '#ff3b30' : '#ffffff', marginTop: '4px', fontWeight: '750' }}>
                {isMuted ? "Mute Active" : "Sound On"}
              </span>
            </div>

            {/* Report Fake button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); triggerReportModal(activeReel); }}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                style={{
                  background: 'rgba(255, 59, 48, 0.15)',
                  border: '1px solid rgba(255, 59, 48, 0.4)',
                  borderRadius: '50%',
                  width: '46px',
                  height: '46px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ff3b30',
                  cursor: 'pointer'
                }}
              >
                <AlertOctagon size={20} />
              </button>
              <span style={{ fontSize: '9px', color: '#ff3b30', marginTop: '4px', fontWeight: '700' }}>Flag Fake</span>
            </div>
          </div>

          {/* Swipe Down */}
          <button 
            onClick={(e) => { e.stopPropagation(); handleNextReel(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            disabled={safeIndex === allReels.length - 1}
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: safeIndex === allReels.length - 1 ? 'rgba(255,255,255,0.2)' : '#ffffff',
              cursor: 'pointer'
            }}
          >
            <ChevronDown size={22} />
          </button>
        </div>

        {/* Details Overlay Sheet at Bottom */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: '76px',
          padding: '20px 20px 30px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%)',
          zIndex: 5,
          color: '#ffffff',
          pointerEvents: 'none'
        }}>
          {isReelChecking && (
            <div style={{
              backgroundColor: 'rgba(255, 217, 0, 0.95)',
              color: '#000000',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '10px',
              fontWeight: '800',
              width: 'fit-content',
              marginBottom: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}>
              🤖 AI SAFETY VERIFICATION ACTIVE
            </div>
          )}
          {activeReel.routedDepartment && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              marginBottom: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(4px)',
              padding: '8px 12px',
              borderRadius: '12px',
              borderLeft: `4px solid ${getPriorityColor(activeReel.routingPriority)}`,
              pointerEvents: 'auto',
              maxWidth: '280px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px' }}>{getDepartmentEmoji(activeReel.routedDepartment)}</span>
                <span style={{ fontSize: '11px', fontWeight: '850', color: '#ffd900', fontFamily: 'Outfit' }}>
                  {activeReel.routedDepartment}
                </span>
                <span style={{
                  fontSize: '8px',
                  fontWeight: '900',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  backgroundColor: getPriorityColor(activeReel.routingPriority),
                  color: '#ffffff',
                  marginLeft: 'auto'
                }}>
                  {activeReel.routingPriority}
                </span>
              </div>
              {activeReel.routingReason && (
                <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.8)', fontWeight: '500', lineHeight: '1.2' }}>
                  {activeReel.routingReason}
                </span>
              )}
            </div>
          )}
          <h2 style={{ fontSize: '15px', margin: '0 0 4px 0', fontFamily: 'Outfit', fontWeight: '800' }}>
            {activeReel.title}
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', margin: '0 0 10px 0', lineHeight: 1.4, fontWeight: '500' }}>
            {activeReel.description}
          </p>
          <div style={{ display: 'flex', gap: '10px', fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: '500' }}>
            <span>👤 Ghost ID: {activeReel.uploaderUuid.substring(0, 8)}...</span>
            <span>•</span>
            <span>⏱️ {activeReel.timestamp}</span>
          </div>
        </div>

      </div>

      {/* Report Modal */}
      {reportModal && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#ffffff',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          color: '#000000',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 59, 48, 0.1)',
            border: '2px solid #ff3b30',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ff3b30',
            marginBottom: '20px'
          }}>
            <AlertOctagon size={32} />
          </div>

          <h3 style={{ fontSize: '18px', margin: '0 0 8px 0', fontFamily: 'Outfit', fontWeight: '850' }}>
            Flag Safety Video
          </h3>
          <p style={{
            fontSize: '12px',
            color: '#666666',
            textAlign: 'center',
            maxWidth: '240px',
            lineHeight: 1.5,
            margin: '0 0 20px 0',
            fontWeight: '500'
          }}>
            Flagging this video initiates an automated forensic verification trace. The upload status will transition into secondary rigorous verification models.
          </p>

          {reportStatusMessage ? (
            <span style={{ fontSize: '12px', color: '#ff3b30', fontWeight: '700', textAlign: 'center', maxWidth: '240px' }}>
              {reportStatusMessage}
            </span>
          ) : (
            <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '240px' }}>
              <button
                onClick={() => setReportModal(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  border: '1px solid #e5e5e5',
                  backgroundColor: '#f2f2f2',
                  color: '#000000',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '12px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#ff3b30',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '12px',
                  boxShadow: '0 4px 10px rgba(255, 59, 48, 0.2)'
                }}
              >
                Flag Video
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
