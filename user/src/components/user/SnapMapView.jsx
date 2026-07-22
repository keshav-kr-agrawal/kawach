import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { X, Play, ShieldAlert, Award, Radio, Eye, AlertOctagon, BookOpen, User, Volume2, VolumeX, Plus, Minus, Navigation } from 'lucide-react';
import { getStatusLabel, getStatusColor } from '../../api/videoService';

// Fix Leaflet default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to dynamically pan and center map on initial load or explicit trigger
function MapRecenter({ center, forceRecenter, onRecenterDone }) {
  const map = useMap();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (center && (!hasInitialized.current || forceRecenter)) {
      map.setView(center, 15, { animate: true });
      hasInitialized.current = true;
      if (onRecenterDone) onRecenterDone();
    }
  }, [center, forceRecenter, map, onRecenterDone]);
  return null;
}

// Interactive floating zoom and recenter control buttons subcomponent
function FloatingMapControls({ gpsCoords, onRecenterClick }) {
  const map = useMap();

  return (
    <div 
      className="floating-map-controls"
      style={{
        position: 'absolute',
        right: '16px',
        bottom: '90px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'auto'
      }}
    >
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          map.zoomIn();
        }}
        title="Zoom In (+)"
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          color: '#09090b',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <Plus size={20} strokeWidth={2.5} />
      </button>

      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          map.zoomOut();
        }}
        title="Zoom Out (-)"
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          color: '#09090b',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <Minus size={20} strokeWidth={2.5} />
      </button>

      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          map.setView(gpsCoords, 15, { animate: true });
          if (onRecenterClick) onRecenterClick();
        }}
        title="Recenter My Location"
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          color: '#2563eb',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <Navigation size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// Component to listen to zoom level changes on Leaflet map
function MapZoomListener({ onChange }) {
  const map = useMap();
  useEffect(() => {
    const handleZoom = () => {
      onChange(map.getZoom());
    };
    map.on('zoomend', handleZoom);
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
  const [triggerRecenter, setTriggerRecenter] = useState(false);
  const [showFlagNotice, setShowFlagNotice] = useState(false);

  const mapVideoRef = useRef(null);

  const defaultCenter = [gpsCoords?.lat || 12.9716, gpsCoords?.lng || 77.5946];

  // Merge map pins with user reports
  const allPinsRaw = [
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
        feedType: r.category || 'General Alert',
        videoUrl: r.videoUrl || "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4"
      }))
  ];

  const allPins = allPinsRaw.filter(pin => {
    const liveReport = userReports.find(r => r.id === pin.id);
    const status = liveReport ? liveReport.status : pin.status;
    return status !== 'REPORTED_SUSPICIOUS' && status !== 'REJECTED';
  });

  const openVideoModal = (pin) => {
    setSelectedVideo(pin);
    setShowFlagNotice(false);
  };

  const closeVideoModal = () => {
    setSelectedVideo(null);
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

  const getSnapchatStatusLabel = (status) => {
    if (status === 'AI_CHECK_1') return '⚡ Safety Verification Active';
    if (status === 'AI_CHECK_2') return '🛡️ Protocol Audit Active';
    return getStatusLabel(status);
  };

  const showHeatmap = zoomLevel < 16;
  const heatmapOpacity = showHeatmap ? Math.max(0.2, Math.min(0.85, (16 - zoomLevel) / 2)) : 0;
  const showAvatars = zoomLevel >= 15;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      
      {/* Leaflet Interactive Map */}
      <MapContainer 
        center={defaultCenter} 
        zoom={14} 
        zoomControl={false}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        dragging={true}
        touchZoom={true}
        keyboard={true}
        zoomAnimation={true}
        style={{ width: '100%', height: '100%', zIndex: 1 }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
        />

        {/* Recenter Map when triggered */}
        <MapRecenter center={defaultCenter} forceRecenter={triggerRecenter} onRecenterDone={() => setTriggerRecenter(false)} />
        <MapZoomListener onChange={setZoomLevel} />
        <FloatingMapControls gpsCoords={defaultCenter} onRecenterClick={() => setTriggerRecenter(true)} />

        {/* User Current Location Marker */}
        <Marker 
          position={defaultCenter}
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

        {/* Heatmap concentric circles */}
        {showHeatmap && allPins.map((pin) => (
          <React.Fragment key={`heat-${pin.id}`}>
            <Circle 
              center={[pin.lat, pin.lng]} 
              radius={240} 
              pathOptions={{ className: 'heatmap-circle-blue', fillOpacity: heatmapOpacity * 0.4 }} 
            />
            <Circle 
              center={[pin.lat, pin.lng]} 
              radius={160} 
              pathOptions={{ className: 'heatmap-circle-green', fillOpacity: heatmapOpacity * 0.55 }} 
            />
            <Circle 
              center={[pin.lat, pin.lng]} 
              radius={90} 
              pathOptions={{ className: 'heatmap-circle-yellow', fillOpacity: heatmapOpacity * 0.7 }} 
            />
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
          else if (isChecking) borderClass = 'suspicious';

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
                  <div class="avatar-marker-container ${borderClass}" style="background-image: linear-gradient(135deg, #ffd900 0%, #ff9500 100%)">
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

      {/* Floating Info Banner Overlay */}
      <div className="absolute bottom-20 left-4 right-4 z-20 pointer-events-none">
        <div className="bg-white/95 border-2 border-[#E9BA26] p-3.5 rounded-2xl shadow-lg backdrop-blur-md flex items-center justify-between pointer-events-auto">
          <div>
            <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-wider block font-mono">
              BENGALURU SAFETY SPHERE
            </span>
            <h4 className="font-black text-ink text-xs font-sora mt-0.5">
              {allPins.length} Verified Incidents Nearby
            </h4>
          </div>
          <span className="px-2.5 py-1 bg-[#E9BA26] text-ink text-[10px] font-extrabold rounded-xl uppercase font-sora">
            GPS Active
          </span>
        </div>
      </div>

      {/* Video Modal Overlay */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-amber-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#E9BA26] rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl relative overflow-hidden">
            
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <div>
                <span className="text-[9px] font-bold text-[#b08850] uppercase tracking-wider block font-mono">
                  {getSnapchatStatusLabel(selectedVideo.status)}
                </span>
                <h3 className="font-black text-ink text-base font-sora">{selectedVideo.title}</h3>
              </div>
              <button onClick={closeVideoModal} className="text-ink-faint hover:text-ink-soft font-bold text-xs">
                ✕
              </button>
            </div>

            <div className="w-full h-48 bg-amber-950 rounded-2xl overflow-hidden relative">
              {selectedVideo.videoUrl ? (
                <video
                  ref={mapVideoRef}
                  src={selectedVideo.videoUrl}
                  autoPlay
                  controls
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-ink-faint text-xs font-bold">
                  [Stream Feed Unavailable]
                </div>
              )}
            </div>

            <p className="text-ink-soft text-xs font-semibold leading-relaxed">
              {selectedVideo.description}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleFlagIncident}
                className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-xl text-xs"
              >
                Flag Suspicious
              </button>
              <button
                onClick={closeVideoModal}
                className="px-4 py-2 bg-[#E9BA26] text-ink font-black rounded-xl text-xs uppercase font-sora"
              >
                Close
              </button>
            </div>

            {showFlagNotice && (
              <div className="p-3 bg-red-600 text-white rounded-xl text-xs text-center font-bold">
                Incident flagged to precinct control room.
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
