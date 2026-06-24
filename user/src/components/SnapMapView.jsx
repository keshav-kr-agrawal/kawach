import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { X, Play, ShieldAlert, Award, Radio, Eye, AlertOctagon } from 'lucide-react';
import { getStatusLabel, getStatusColor } from '../api/videoService';

// Fix Leaflet default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to dynamically pan and center map when user location changes
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

export default function SnapMapView({ gpsCoords, userReports, onReportVideo }) {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [showFlagNotice, setShowFlagNotice] = useState(false);
  const [videoPlayProgress, setVideoPlayProgress] = useState(0);

  // Mock upload databases overlay
  const [mapPins] = useState([
    {
      id: 'mock-pin-1',
      title: 'Suspicious Night Gathering',
      description: 'Group loitering near commercial bank vault after hours.',
      lat: 12.9348,
      lng: 77.6189,
      uploaderUuid: 'e9b1d3a4-8390-410a-bf1f-b3a1a3a41151',
      timestamp: '10 minutes ago',
      distance: '350m away',
      status: 'PUBLIC_APPROVED',
      views: 128,
      avatarGradient: 'linear-gradient(135deg, #ff5f6d 0%, #ffc371 100%)',
      feedType: 'Violence/Loitering',
      videoUrl: null
    },
    {
      id: 'mock-pin-2',
      title: 'Subway Waterlogging Hazard',
      description: 'Major drain overflow making the pedestrian subway impassable.',
      lat: 12.9312,
      lng: 77.6285,
      uploaderUuid: '419ae2b2-fc8e-4a6c-9c98-cf48a202aef1',
      timestamp: '2 hours ago',
      distance: '1.1km away',
      status: 'COHORT_TEST',
      views: 45,
      avatarGradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      feedType: 'Infrastructure',
      videoUrl: null
    },
    {
      id: 'mock-pin-3',
      title: 'Suspicious Vehicle Transfer',
      description: 'Two individuals loading unlabeled packages between cars without lights.',
      lat: 12.9412,
      lng: 77.6098,
      uploaderUuid: 'ad89012a-3301-44bf-80a2-cd890fb91024',
      timestamp: '45 mins ago',
      distance: '850m away',
      status: 'PUBLIC_APPROVED',
      views: 14,
      avatarGradient: 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)',
      feedType: 'Theft/Property',
      videoUrl: null
    }
  ]);

  // Merge map pins with any approved user-uploaded clips (including AI check states for testing)
  const allPinsRaw = [
    ...mapPins,
    ...userReports
      .filter(r => r.status === 'PUBLIC_APPROVED' || r.status === 'COHORT_TEST' || r.status === 'AI_CHECK_1' || r.status === 'AI_CHECK_2')
      .map(r => ({
        id: r.id,
        title: r.title || 'Citizen Incident Log',
        description: r.description || 'User recorded safety alert.',
        lat: r.lat + (Math.sin((r.id || '').charCodeAt(r.id.length - 1) || 1) * 0.00015),
        lng: r.lng + (Math.cos((r.id || '').charCodeAt(r.id.length - 2) || 1) * 0.00015),
        uploaderUuid: r.uploaderUuid,
        timestamp: r.timestamp || 'Just now',
        distance: 'Within 50m',
        status: r.status,
        views: r.views || 0,
        avatarGradient: 'linear-gradient(135deg, #fffc00 0%, #ff9500 100%)',
        feedType: r.category || 'General Alert',
        videoUrl: r.videoUrl,
        trimStart: r.trimStart,
        trimEnd: r.trimEnd
      }))
  ];

  // STRICT MODERATION FILTER: Stop displaying any videos that are REPORTED_SUSPICIOUS or REJECTED
  const allPins = allPinsRaw.filter(pin => {
    const liveReport = userReports.find(r => r.id === pin.id);
    const status = liveReport ? liveReport.status : pin.status;
    return status !== 'REPORTED_SUSPICIOUS' && status !== 'REJECTED';
  });

  // Handle Playback Simulation for 10-second clip (only for mock videos with no videoUrl)
  useEffect(() => {
    let timer;
    if (playingVideo && selectedVideo && !selectedVideo.videoUrl) {
      timer = setInterval(() => {
        setPlayProgress((prev) => {
          if (prev >= 100) {
            setPlayingVideo(false);
            return 0;
          }
          return prev + 10;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [playingVideo, selectedVideo]);

  const openVideoModal = (pin) => {
    setSelectedVideo(pin);
    setPlayingVideo(true);
    setPlayProgress(0);
    setVideoPlayProgress(0);
    setShowFlagNotice(false);
  };

  const closeVideoModal = () => {
    setSelectedVideo(null);
    setPlayingVideo(false);
    setPlayProgress(0);
    setVideoPlayProgress(0);
    setShowFlagNotice(false);
  };

  const handleFlagIncident = () => {
    if (!selectedVideo) return;
    
    onReportVideo(selectedVideo.id);
    
    setShowFlagNotice(true);
    setTimeout(() => {
      closeVideoModal();
    }, 2000);
  };

  const getSnapchatStatusColor = (status) => {
    if (status === 'REPORTED_SUSPICIOUS') return '#ff3b30';
    if (status === 'PUBLIC_APPROVED') return '#007aff';
    if (status === 'AI_CHECK_1' || status === 'AI_CHECK_2') return '#ffcc00'; // soft warning yellow
    return '#ff9500';
  };

  const getSnapchatStatusLabel = (status) => {
    if (status === 'AI_CHECK_1') return '🤖 AI Safety Check Active';
    if (status === 'AI_CHECK_2') return '🛡️ Rigorous AI Audit Active';
    return getStatusLabel(status);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      
      {/* Top Header Card (White Snapchat theme) */}
      <div className="glass-panel" style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        padding: '12px 16px',
        borderRadius: '20px',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(0,0,0,0.06)',
        background: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: '#007aff',
            boxShadow: '0 0 8px #007aff'
          }} />
          <div>
            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '800', fontFamily: 'Outfit, sans-serif', color: '#000000' }}>
              SENTINEL GHOST MAP
            </h3>
            <p style={{ margin: 0, fontSize: '10px', color: '#555555', fontWeight: '500' }}>
              Encrypted, PII-Free Public Safety Feeds
            </p>
          </div>
        </div>
        <div style={{
          backgroundColor: 'rgba(255, 252, 0, 0.2)',
          color: '#000000',
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          border: '1px solid rgba(255, 252, 0, 0.5)'
        }}>
          <Radio size={12} style={{ color: '#ff3b30' }} />
          <span>LIVE</span>
        </div>
      </div>

      {/* Leaflet Map (Light Tiles - CartoDB Voyager) */}
      <MapContainer 
        center={gpsCoords} 
        zoom={14} 
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
        />

        {/* Recenter Map when GPS coordinates update */}
        <MapRecenter center={gpsCoords} />

        {/* User Current Location Marker (Non-interactive visual guide to prevent overlapping click blocking) */}
        <Marker 
          position={gpsCoords}
          interactive={false}
          icon={L.divIcon({
            className: 'custom-user-marker',
            html: `
              <div class="user-pulse-container" style="pointer-events: none;">
                <div class="user-pulse-dot"></div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })}
        />

        {/* Video Thumbnail Markers */}
        {allPins.map((pin) => {
          const isVerified = pin.status === 'PUBLIC_APPROVED';
          const isChecking = pin.status === 'AI_CHECK_1' || pin.status === 'AI_CHECK_2';
          
          let borderClass = '';
          if (isVerified) borderClass = 'verified';
          else if (isChecking) borderClass = 'suspicious'; // renders standard border color rule

          return (
            <Marker
              key={pin.id}
              position={[pin.lat, pin.lng]}
              eventHandlers={{
                click: () => openVideoModal(pin)
              }}
              icon={L.divIcon({
                className: 'custom-map-avatar',
                html: `
                  <div class="avatar-marker-container ${borderClass}" style="background-image: ${pin.avatarGradient || 'linear-gradient(135deg, #e5e5e5 0%, #b3b3b3 100%)'}">
                    <div class="avatar-marker-play">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                `,
                iconSize: [50, 50],
                iconAnchor: [25, 25]
              })}
            />
          );
        })}
      </MapContainer>

      {/* Full-Screen Video Modal (Light Snapchat Sheet) */}
      {selectedVideo && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#f2f2f2',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          
          {/* Top Bar inside Modal */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px 20px 10px',
            background: 'linear-gradient(to bottom, rgba(255,255,255,1) 60%, rgba(255,255,255,0) 100%)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: selectedVideo.status === 'PUBLIC_APPROVED' ? '#ffffff' : '#000000',
                backgroundColor: getSnapchatStatusColor(selectedVideo.status),
                padding: '3px 10px',
                borderRadius: '12px',
                width: 'fit-content'
              }}>
                {getSnapchatStatusLabel(selectedVideo.status)}
              </span>
              <h2 style={{ margin: 0, fontSize: '16px', color: '#000000', fontFamily: 'Outfit', fontWeight: '800' }}>
                {selectedVideo.title}
              </h2>
            </div>
            <button 
              onClick={closeVideoModal}
              style={{
                background: '#e5e5e5',
                border: 'none',
                color: '#333333',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Video Playback Sandbox */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            padding: '20px'
          }}>
            
            {/* Viewfinder Video Element */}
            <div style={{
              width: '100%',
              aspectRatio: '9/16',
              maxWidth: '300px',
              borderRadius: '24px',
              border: '1px solid #e5e5e5',
              background: '#000000',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              
              {selectedVideo.videoUrl ? (
                <>
                  <video
                    src={selectedVideo.trimStart !== undefined && selectedVideo.trimEnd !== undefined 
                      ? `${selectedVideo.videoUrl}#t=${selectedVideo.trimStart},${selectedVideo.trimEnd}` 
                      : selectedVideo.videoUrl}
                    autoPlay
                    loop
                    muted
                    onTimeUpdate={(e) => {
                      const video = e.target;
                      const start = selectedVideo.trimStart !== undefined ? selectedVideo.trimStart : 0;
                      const end = selectedVideo.trimEnd !== undefined ? selectedVideo.trimEnd : video.duration || 15;
                      const duration = end - start;
                      if (duration > 0) {
                        const progress = ((video.currentTime - start) / duration) * 100;
                        setVideoPlayProgress(Math.min(100, Math.max(0, progress)));
                      }
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', zIndex: 2 }}
                  />
                  {/* Snapchat-style Top Progress bar */}
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    right: '8px',
                    height: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.35)',
                    borderRadius: '2px',
                    zIndex: 10,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${videoPlayProgress}%`,
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
                    background: selectedVideo.avatarGradient,
                    opacity: 0.15,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 1
                  }} />

                  {playingVideo ? (
                    <div style={{
                      zIndex: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <ShieldAlert size={48} className="pulse-red" style={{ color: '#ff3b30' }} />
                      <span style={{ fontSize: '11px', fontWeight: '700', color: '#ffffff', letterSpacing: '0.05em' }}>
                        PLAYING GHOST STREAM
                      </span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { setPlayingVideo(true); setPlayProgress(0); }}
                      style={{
                        zIndex: 2,
                        background: '#fffc00',
                        border: 'none',
                        borderRadius: '50%',
                        width: '64px',
                        height: '64px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000000',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(255,252,0,0.4)'
                      }}
                    >
                      <Play size={28} style={{ marginLeft: '4px' }} fill="#000000" />
                    </button>
                  )}

                  {/* Progress Bar */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '6px',
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    zIndex: 3
                  }}>
                    <div style={{
                      width: `${playProgress}%`,
                      height: '100%',
                      backgroundColor: '#fffc00',
                      transition: 'width 1s linear'
                    }} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom Info Sheet inside Modal (Pristine White) */}
          <div className="glass-panel" style={{
            padding: '20px 24px 30px',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            borderTop: '1px solid #e5e5e5',
            background: '#ffffff'
          }}>
            
            {showFlagNotice ? (
              <div style={{ 
                padding: '20px 0', 
                textAlign: 'center', 
                color: '#ff3b30', 
                fontWeight: '750', 
                fontSize: '13px',
                animation: 'pulse-marker 1s infinite alternate'
              }}>
                ⚠️ VIDEO FLAGGED AS FAKE. INITIATING AUDIT REMOVAL...
              </div>
            ) : (
              <>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#333333', lineHeight: 1.5, fontWeight: '500' }}>
                  {selectedVideo.description}
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: '#666666',
                  borderTop: '1px solid #f2f2f2',
                  paddingTop: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', gap: '15px', fontWeight: '500' }}>
                    <span>📍 {selectedVideo.distance}</span>
                    <span>⏱️ {selectedVideo.timestamp}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                    <Eye size={12} />
                    <span>{selectedVideo.views} views</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{
                    flex: 1,
                    backgroundColor: '#f2f2f2',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    fontSize: '10px',
                    color: '#555555',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: '500'
                  }}>
                    <Award size={14} style={{ color: '#007aff' }} />
                    <span>Section 65B Audit-Hash: {selectedVideo.id.toUpperCase()}</span>
                  </div>

                  <button
                    onClick={handleFlagIncident}
                    style={{
                      backgroundColor: 'rgba(255, 59, 48, 0.1)',
                      color: '#ff3b30',
                      border: '1px solid rgba(255, 59, 48, 0.25)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <AlertOctagon size={12} />
                    Flag Fake
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
