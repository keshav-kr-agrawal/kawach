import React, { useState } from 'react';
import { ArrowUp, Share2, AlertOctagon, Radio, ChevronUp, ChevronDown, ShieldAlert } from 'lucide-react';
import { getStatusLabel } from '../api/videoService';

export default function LocalReelsFeedView({ gpsCoords, userReports, onReportVideo }) {
  const [currentReelIndex, setCurrentReelIndex] = useState(0);
  const [upvotedList, setUpvotedList] = useState({});
  const [reportModal, setReportModal] = useState(null);
  const [reportStatusMessage, setReportStatusMessage] = useState('');
  const [reelsPlayProgress, setReelsPlayProgress] = useState(0);

  // Initial local reels data
  const [reels, setReels] = useState([
    {
      id: 'reel-1',
      title: 'Suspicious Night Gathering',
      description: 'Group of 4 loitering near commercial bank vault after midnight. Notified community watch.',
      distanceValue: 0.35,
      uploaderUuid: 'e9b1d3a4-8390-410a-bf1f-b3a1a3a41151',
      timestamp: '10m ago',
      upvotes: 42,
      shares: 8,
      status: 'PUBLIC_APPROVED',
      avatarGradient: 'linear-gradient(135deg, #ff5f6d 0%, #ffc371 100%)',
      videoUrl: null
    },
    {
      id: 'reel-2',
      title: 'Subway Waterlogging Hazard',
      description: 'Pedestrian subway HSR layout fully flooded due to heavy rains. Hazard warning!',
      distanceValue: 1.1,
      uploaderUuid: '419ae2b2-fc8e-4a6c-9c98-cf48a202aef1',
      timestamp: '2h ago',
      upvotes: 18,
      shares: 3,
      status: 'COHORT_TEST',
      avatarGradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      videoUrl: null
    },
    {
      id: 'reel-3',
      title: 'Suspicious Vehicle Transfer',
      description: 'Moving boxes into vans without registration plates under dark alley. Suspected theft.',
      distanceValue: 2.4,
      uploaderUuid: 'ad89012a-3301-44bf-80a2-cd890fb91024',
      timestamp: '1d ago',
      upvotes: 67,
      shares: 14,
      status: 'PUBLIC_APPROVED',
      avatarGradient: 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)',
      videoUrl: null
    }
  ]);

  // Merge approved user uploads and sort strictly by distance
  const allReelsRaw = [
    ...reels,
    ...userReports
      .filter(r => r.status === 'PUBLIC_APPROVED' || r.status === 'COHORT_TEST' || r.status === 'AI_CHECK_1' || r.status === 'AI_CHECK_2')
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
        avatarGradient: 'linear-gradient(135deg, #fffc00 0%, #ff9500 100%)',
        videoUrl: r.videoUrl,
        trimStart: r.trimStart,
        trimEnd: r.trimEnd
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
    <div className="view-container" style={{ padding: '0', position: 'relative', height: 'calc(100vh - 84px)', overflow: 'hidden', backgroundColor: '#000000' }}>
      
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
        pointerEvents: 'none'
      }}>
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

      {/* Main Swipeable Feed Simulator */}
      <div style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        
        {/* Real captured video player OR mock animation */}
        {activeReel.videoUrl ? (
          <>
            <video
              src={activeReel.trimStart !== undefined && activeReel.trimEnd !== undefined 
                ? `${activeReel.videoUrl}#t=${activeReel.trimStart},${activeReel.trimEnd}` 
                : activeReel.videoUrl}
              autoPlay
              loop
              muted
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
                backgroundColor: '#fffc00',
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
                backgroundColor: 'rgba(255, 252, 0, 0.1)',
                border: '2px solid #fffc00',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fffc00'
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
                color: isReelChecking ? '#fffc00' : (activeReel.status === 'REPORTED_SUSPICIOUS' ? '#ff3b30' : '#007aff')
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
            onClick={handlePrevReel}
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
                onClick={() => toggleUpvote(activeReel.id)}
                style={{
                  background: upvotedList[activeReel.id] ? '#fffc00' : 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '50%',
                  width: '46px',
                  height: '46px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: upvotedList[activeReel.id] ? '#000000' : '#ffffff',
                  cursor: 'pointer',
                  boxShadow: upvotedList[activeReel.id] ? '0 0 12px rgba(255,252,0,0.4)' : 'none'
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
              <button style={{
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
              }}>
                <Share2 size={20} />
              </button>
              <span style={{ fontSize: '11px', color: '#ffffff', marginTop: '4px', fontWeight: '600' }}>{activeReel.shares}</span>
            </div>

            {/* Report Fake button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button 
                onClick={() => triggerReportModal(activeReel)}
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
            onClick={handleNextReel}
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
              backgroundColor: 'rgba(255, 252, 0, 0.95)',
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
