import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { X, Play, ShieldAlert, Award, Radio, Eye, AlertOctagon, BookOpen, User, Volume2, VolumeX } from 'lucide-react';
import { getStatusLabel, getStatusColor } from '../../api/videoService';

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

// Component to listen to zoom level changes on Leaflet map
function MapZoomListener({ onChange }) {
  const map = useMap();
  useEffect(() => {
    const handleZoom = () => {
      onChange(map.getZoom());
    };
    map.on('zoomend', handleZoom);
    // Initial zoom
    onChange(map.getZoom());
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map, onChange]);
  return null;
}

export default function SnapMapView({ gpsCoords, userReports, onReportVideo, onOpenProfile, onOpenLibrary }) {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(14);
  const [playingVideo, setPlayingVideo] = useState(false);
  const [playProgress, setPlayProgress] = useState(0);
  const [showFlagNotice, setShowFlagNotice] = useState(false);

  const mapVideoRef = useRef(null);
  const [mapIsPaused, setMapIsPaused] = useState(false);
  const [mapIs2xSpeed, setMapIs2xSpeed] = useState(false);
  const [showMapCenterIcon, setShowMapCenterIcon] = useState(null); // 'play' or 'pause'
  const [mapIsMuted, setMapIsMuted] = useState(false); // default unmuted
  const [showMapMuteIconOverlay, setShowMapMuteIconOverlay] = useState(null); // 'mute' or 'unmute'

  const mapPressTimerRef = useRef(null);
  const mapPressStartTimeRef = useRef(0);

  // Reset when selectedVideo changes
  useEffect(() => {
    setMapIsPaused(false);
    setMapIs2xSpeed(false);
    setShowMapCenterIcon(null);
    setMapIsMuted(false);
    setShowMapMuteIconOverlay(null);
    if (mapVideoRef.current) {
      mapVideoRef.current.playbackRate = 1.0;
    }
  }, [selectedVideo]);

  const handleMapVideoTap = () => {
    if (!mapVideoRef.current) return;
    if (mapVideoRef.current.paused) {
      mapVideoRef.current.play().catch(err => console.log(err));
      setMapIsPaused(false);
      setShowMapCenterIcon('play');
    } else {
      mapVideoRef.current.pause();
      setMapIsPaused(true);
      setShowMapCenterIcon('pause');
    }
    setTimeout(() => {
      setShowMapCenterIcon(null);
    }, 800);
  };

  const toggleMapMute = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const nextMuted = !mapIsMuted;
    setMapIsMuted(nextMuted);
    setShowMapMuteIconOverlay(nextMuted ? 'mute' : 'unmute');
    setTimeout(() => {
      setShowMapMuteIconOverlay(null);
    }, 800);
  };

  const handleMapPressStart = (e) => {
    if (!mapVideoRef.current) return;
    mapPressStartTimeRef.current = Date.now();
    mapPressTimerRef.current = setTimeout(() => {
      mapVideoRef.current.playbackRate = 2.0;
      setMapIs2xSpeed(true);
    }, 300);
  };

  const handleMapPressEnd = () => {
    if (mapPressTimerRef.current) {
      clearTimeout(mapPressTimerRef.current);
      mapPressTimerRef.current = null;
    }
    const pressDuration = Date.now() - mapPressStartTimeRef.current;
    if (pressDuration < 300) {
      handleMapVideoTap();
    }
    if (mapVideoRef.current) {
      mapVideoRef.current.playbackRate = 1.0;
    }
    setMapIs2xSpeed(false);
  };
  const [videoPlayProgress, setVideoPlayProgress] = useState(0);

  // No pre-seeded mock pins on the map
  const [mapPins] = useState([]);

  // Merge map pins with any approved user-uploaded clips (including AI check states for testing)
  const allPinsRaw = [
    ...mapPins,
    ...userReports
      .filter(r => r.status === 'PUBLIC_APPROVED' || r.status === 'COHORT_TEST' || r.status === 'AI_CHECK_1' || r.status === 'AI_CHECK_2' || r.status === 'DEPT_ROUTING' || r.status === 'REPORTED_SUSPICIOUS')
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
        avatarGradient: 'linear-gradient(135deg, #ffd900 0%, #ff9500 100%)',
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

  const showHeatmap = zoomLevel < 16;
  const heatmapOpacity = showHeatmap ? Math.max(0.2, Math.min(0.85, (16 - zoomLevel) / 2)) : 0;
  const showAvatars = zoomLevel >= 15;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      
      {/* Top Header Card (Hidden because of layout level TopBar) */}
      <div className="glass-panel" style={{
        display: 'none',
        top: '20px',
        left: '20px',
        right: '20px',
        padding: '12px 16px',
        borderRadius: '20px',
        zIndex: 999,
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        border: '1px solid rgba(0,0,0,0.06)',
        background: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Profile Button */}
          <button 
            onClick={onOpenProfile}
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
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}
            title="Open User Profile"
          >
            <User size={16} color="#000000" strokeWidth={2.5} />
          </button>
          
          <div>
            <h3 style={{ margin: 0, fontSize: '11px', fontWeight: '800', fontFamily: 'Outfit, sans-serif', color: '#000000', letterSpacing: '0.02em' }}>
              SENTINEL GHOST MAP
            </h3>
            <p style={{ margin: 0, fontSize: '9px', color: '#555555', fontWeight: '600' }}>
              PII-Free Safety Grid
            </p>
          </div>
        </div>

        {/* Right side controls: Legal Library & Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={onOpenLibrary}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              backgroundColor: '#f2f2f2',
              border: '1px solid #e5e5e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#333333'
            }}
            title="Open Legal Library"
          >
            <BookOpen size={16} strokeWidth={2.5} />
          </button>
          
          <div style={{
            backgroundColor: 'rgba(255, 217, 0, 0.2)',
            color: '#000000',
            padding: '4px 8px',
            borderRadius: '10px',
            fontSize: '9px',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            border: '1px solid rgba(255, 217, 0, 0.5)'
          }}>
            <Radio size={10} style={{ color: '#ff3b30' }} />
            <span>LIVE</span>
          </div>
        </div>
      </div>

      {/* Leaflet Map (Light Tiles - CartoDB Voyager) */}
      <MapContainer 
        center={gpsCoords} 
        zoom={14} 
        zoomControl={false}
        zoomAnimation={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
        />

        {/* Recenter Map when GPS coordinates update */}
        <MapRecenter center={gpsCoords} />
        <MapZoomListener onChange={setZoomLevel} />

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

        {/* Snapchat-style Heatmap concentric circles */}
        {showHeatmap && allPins.map((pin) => (
          <React.Fragment key={`heat-${pin.id}`}>
            {/* Outer Blue Circle */}
            <Circle 
              center={[pin.lat, pin.lng]} 
              radius={240} 
              pathOptions={{ className: 'heatmap-circle-blue', fillOpacity: heatmapOpacity * 0.4 }} 
            />
            {/* Mid Green Circle */}
            <Circle 
              center={[pin.lat, pin.lng]} 
              radius={160} 
              pathOptions={{ className: 'heatmap-circle-green', fillOpacity: heatmapOpacity * 0.55 }} 
            />
            {/* Inner Yellow Circle */}
            <Circle 
              center={[pin.lat, pin.lng]} 
              radius={90} 
              pathOptions={{ className: 'heatmap-circle-yellow', fillOpacity: heatmapOpacity * 0.7 }} 
            />
            {/* Core Red Circle */}
            <Circle 
              center={[pin.lat, pin.lng]} 
              radius={40} 
              pathOptions={{ className: 'heatmap-circle-red', fillOpacity: heatmapOpacity * 0.85 }} 
            />
          </React.Fragment>
        ))}

        {/* Video Thumbnail Markers */}
        {showAvatars && allPins.map((pin) => {
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
            <div 
              onMouseDown={handleMapPressStart}
              onMouseUp={handleMapPressEnd}
              onMouseLeave={handleMapPressEnd}
              onTouchStart={handleMapPressStart}
              onTouchEnd={handleMapPressEnd}
              style={{
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
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              {/* 2x Speed badge overlay */}
              {mapIs2xSpeed && (
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 100,
                  backgroundColor: 'rgba(0,0,0,0.85)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  color: '#ffd900',
                  fontSize: '9px',
                  fontWeight: '805',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  pointerEvents: 'none'
                }}>
                  <span>⏩ 2x SPEED</span>
                </div>
              )}

              {/* Center Play/Pause/Mute Indicator overlay */}
              {(showMapCenterIcon || showMapMuteIconOverlay) && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 100,
                  backgroundColor: 'rgba(0,0,0,0.75)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#ffffff',
                  pointerEvents: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}>
                  {showMapCenterIcon === 'play' && (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                      <span style={{ fontSize: '9px', fontWeight: '800', fontFamily: 'Outfit', letterSpacing: '0.05em' }}>PLAY</span>
                    </>
                  )}
                  {showMapCenterIcon === 'pause' && (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                      <span style={{ fontSize: '9px', fontWeight: '800', fontFamily: 'Outfit', letterSpacing: '0.05em' }}>PAUSE</span>
                    </>
                  )}
                  {showMapMuteIconOverlay === 'mute' && (
                    <>
                      <VolumeX size={20} />
                      <span style={{ fontSize: '9px', fontWeight: '800', fontFamily: 'Outfit', letterSpacing: '0.05em' }}>MUTED</span>
                    </>
                  )}
                  {showMapMuteIconOverlay === 'unmute' && (
                    <>
                      <Volume2 size={20} />
                      <span style={{ fontSize: '9px', fontWeight: '800', fontFamily: 'Outfit', letterSpacing: '0.05em' }}>UNMUTED</span>
                    </>
                  )}
                </div>
              )}
              
              {selectedVideo.videoUrl ? (
                <>
                  <video
                    ref={mapVideoRef}
                    src={selectedVideo.trimStart !== undefined && selectedVideo.trimEnd !== undefined 
                      ? `${selectedVideo.videoUrl}#t=${selectedVideo.trimStart},${selectedVideo.trimEnd}` 
                      : selectedVideo.videoUrl}
                    autoPlay
                    loop
                    muted={mapIsMuted}
                    playsInline
                    onTimeUpdate={(e) => {
                      const video = e.target;
                      const start = selectedVideo.trimStart !== undefined ? selectedVideo.trimStart : 0;
                      const end = selectedVideo.trimEnd !== undefined && selectedVideo.trimEnd > start ? selectedVideo.trimEnd : video.duration || 999;
                      
                      // Handle manual loop fallback for media fragments
                      if (video.currentTime >= end - 0.2) {
                        video.currentTime = start;
                        video.play().catch(() => {});
                      }

                      const duration = end - start;
                      if (duration > 0) {
                        const progress = ((video.currentTime - start) / duration) * 100;
                        setVideoPlayProgress(Math.min(100, Math.max(0, progress)));
                      }
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', zIndex: 2 }}
                  />
                  {/* Floating Volume Speaker Toggle button */}
                  <button
                    onClick={toggleMapMute}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      right: '12px',
                      zIndex: 12,
                      background: mapIsMuted ? 'rgba(255, 59, 48, 0.85)' : 'rgba(0,0,0,0.65)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                      transition: 'all 0.2s ease'
                    }}
                    title={mapIsMuted ? "Unmute Audio" : "Mute Audio"}
                  >
                    {mapIsMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
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
                        background: '#ffd900',
                        border: 'none',
                        borderRadius: '50%',
                        width: '64px',
                        height: '64px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000000',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(255,217,0,0.4)'
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
                      backgroundColor: '#ffd900',
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
