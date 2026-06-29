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
      style={{
        width: '100%',
        height: '100%',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        position: 'relative',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      {/* Real captured video player OR mock animation */}
      {reel.videoUrl ? (
        <>
          <video
            ref={videoRef}
            src={reel.trimStart !== undefined && reel.trimEnd !== undefined 
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
            style={{ width: '100%', height: '100%', objectFit: 'cover', zIndex: 2 }}
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

      {/* Interactive Actions Overlay */}
      <div style={{
        position: 'absolute',
        right: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        zIndex: 10,
        alignItems: 'center'
      }}>
        {/* Upvote button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleUpvote(reel.id); }}
            style={{
              background: upvotedList[reel.id] ? '#ffd900' : 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: upvotedList[reel.id] ? '#000000' : '#ffffff',
              cursor: 'pointer',
              boxShadow: upvotedList[reel.id] ? '0 0 12px rgba(234,179,8,0.4)' : 'none'
            }}
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
          <span style={{ fontSize: '10px', color: '#ffffff', marginTop: '4px', fontWeight: '700' }}>
            {reel.upvotes}
          </span>
        </div>

        {/* Share */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '50%',
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
          <span style={{ fontSize: '10px', color: '#ffffff', marginTop: '4px', fontWeight: '600' }}>{reel.shares}</span>
        </div>

        {/* Mute Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
            style={{
              background: isMuted ? 'rgba(255, 59, 48, 0.15)' : 'rgba(0,0,0,0.5)',
              border: isMuted ? '1px solid rgba(255, 59, 48, 0.4)' : '1px solid rgba(255,255,255,0.15)',
              borderRadius: '50%',
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
          <span style={{ fontSize: '8px', color: isMuted ? '#ff3b30' : '#ffffff', marginTop: '4px', fontWeight: '750' }}>
            {isMuted ? "Muted" : "Sound"}
          </span>
        </div>

        {/* Flag Incident */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); triggerReportModal(reel); }}
            style={{
              background: 'rgba(255, 59, 48, 0.15)',
              border: '1px solid rgba(255, 59, 48, 0.4)',
              borderRadius: '50%',
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
          <span style={{ fontSize: '8px', color: '#ff3b30', marginTop: '4px', fontWeight: '700' }}>Flag Fake</span>
        </div>
      </div>

      {/* Details Overlay Sheet at Bottom */}
      <div style={{
        position: 'absolute',
        bottom: 'calc(70px + env(safe-area-inset-bottom))',
        left: 0,
        right: '76px',
        padding: '20px 20px 24px',
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
            alignItems: 'center'
          }}>
            🤖 AI SAFETY VERIFICATION ACTIVE
          </div>
        )}
        {reel.routedDepartment && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            marginBottom: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.70)',
            backdropFilter: 'blur(6px)',
            padding: '10px 12px',
            borderRadius: '12px',
            borderLeft: `4px solid ${getPriorityColor(reel.routingPriority)}`,
            pointerEvents: 'auto',
            maxWidth: '290px'
          }}>
            {/* Dept + priority row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px' }}>{getDepartmentEmoji(reel.routedDepartment)}</span>
              <span style={{ fontSize: '11px', fontWeight: '850', color: '#ffd900', fontFamily: 'Outfit' }}>
                {reel.routedDepartment}
              </span>
              {reel.subCategory && (
                <span style={{
                  fontSize: '8px',
                  fontWeight: '700',
                  padding: '2px 6px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(255,217,0,0.18)',
                  color: '#ffd900',
                  border: '1px solid rgba(255,217,0,0.35)'
                }}>
                  {reel.subCategory.replace(/_/g, ' ')}
                </span>
              )}
              <span style={{
                fontSize: '8px',
                fontWeight: '900',
                padding: '2px 6px',
                borderRadius: '6px',
                backgroundColor: getPriorityColor(reel.routingPriority),
                color: '#ffffff',
                marginLeft: 'auto'
              }}>
                {reel.routingPriority}
              </span>
            </div>

            {/* Routing reason */}
            {reel.routingReason && (
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.80)', fontWeight: '500', lineHeight: '1.2' }}>
                {reel.routingReason}
              </span>
            )}

            {/* Detected scene issues chips */}
            {Array.isArray(reel.detectedIssues) && reel.detectedIssues.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {reel.detectedIssues.slice(0, 3).map((issue, i) => (
                  <span key={i} style={{
                    fontSize: '8px',
                    fontWeight: '700',
                    padding: '2px 7px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(16,185,129,0.20)',
                    color: '#6ee7b7',
                    border: '1px solid rgba(16,185,129,0.35)'
                  }}>
                    {issue}
                  </span>
                ))}
              </div>
            )}

            {/* Trust score bar + ETA row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {typeof reel.trustScore === 'number' && reel.trustScore > 0 && (
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>
                    <span>Trust</span>
                    <span style={{
                      color: reel.trustScore >= 70 ? '#6ee7b7' : reel.trustScore >= 40 ? '#fbbf24' : '#f87171',
                      fontWeight: '800'
                    }}>
                      {reel.trustScore.toFixed(0)}
                    </span>
                  </div>
                  <div style={{ height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, reel.trustScore)}%`,
                      borderRadius: '2px',
                      backgroundColor: reel.trustScore >= 70 ? '#10b981' : reel.trustScore >= 40 ? '#f59e0b' : '#ef4444'
                    }} />
                  </div>
                </div>
              )}
              {reel.estimatedResolutionDays && (
                <span style={{
                  fontSize: '8px',
                  fontWeight: '800',
                  padding: '2px 7px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(255,255,255,0.10)',
                  color: 'rgba(255,255,255,0.75)',
                  whiteSpace: 'nowrap'
                }}>
                  ~{reel.estimatedResolutionDays}d ETA
                </span>
              )}
            </div>
          </div>
        )}
        <h2 style={{ fontSize: '14px', margin: '0 0 4px 0', fontFamily: 'Outfit', fontWeight: '800' }}>
          {reel.title}
        </h2>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', margin: '0 0 10px 0', lineHeight: 1.4, fontWeight: '500' }}>
          {reel.description}
        </p>
        <div style={{ display: 'flex', gap: '10px', fontSize: '9px', color: 'rgba(255,255,255,0.5)', fontWeight: '500' }}>
          <span>👤 Ghost ID: {reel.uploaderUuid.substring(0, 8)}...</span>
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
    <div 
      className="view-container" 
      style={{ 
        padding: '0', 
        position: 'relative', 
        height: '100%', 
        overflowY: 'scroll', 
        scrollSnapType: 'y mandatory',
        backgroundColor: '#000000',
        scrollbarWidth: 'none'
      }}
    >
      <style>{`
        /* Hide scrollbars for reels container */
        .view-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
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
