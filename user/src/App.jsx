import React, { useState, useEffect } from 'react';
import BottomNav from './components/BottomNav';
import SnapMapView from './components/SnapMapView';
import ServicesDirectoryView from './components/ServicesDirectoryView';
import SecureCameraView from './components/SecureCameraView';
import AlertsChatView from './components/AlertsChatView';
import LocalReelsFeedView from './components/LocalReelsFeedView';
import { simulateWorkflowProgress, VIDEO_STATUS } from './api/videoService';

export default function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [gpsCoords, setGpsCoords] = useState([12.9285, 77.6245]); // Defaults to Koramangala, Bengaluru
  const [userReports, setUserReports] = useState([]);

  // Fetch real coordinates if available, fallback to mock if blocked
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoords([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.warn('GPS location access blocked or unavailable, using mock coordinates.', error);
        }
      );
    }
  }, []);

  const handleNewUpload = (newReport) => {
    // Inject flag counter
    const reportWithFlags = { ...newReport, flagsCount: 0 };
    
    // Add to user reports history state
    setUserReports((prev) => [reportWithFlags, ...prev]);

    // Start state machine simulation (only if it's NOT an emergency direct dispatch,
    // as emergency dispatches are instantly approved and audited directly in background)
    if (!newReport.emergencyOverride) {
      simulateWorkflowProgress(reportWithFlags, (updatedReport) => {
        setUserReports((prev) => 
          prev.map((r) => r.id === updatedReport.id ? { ...updatedReport, flagsCount: r.flagsCount } : r)
        );
      });
    } else {
      // Emergency: instantly PUBLIC_APPROVED, but starts verification checks silently in background
      setTimeout(() => {
        setUserReports((prev) => 
          prev.map((r) => r.id === newReport.id ? { ...r, status: VIDEO_STATUS.AI_CHECK_2 } : r)
        );
      }, 5000);
    }

    // Automatically navigate back to map view to see current upload progress
    setActiveTab('map');
  };

  // Handles community fake news reporting flagging threshold (flags >= 2)
  const handleReportVideo = (videoId) => {
    setUserReports((prev) => {
      return prev.map((r) => {
        if (r.id === videoId) {
          const nextFlags = (r.flagsCount || 0) + 1;
          const isSuspicious = nextFlags >= 2;
          
          let nextStatus = r.status;
          if (isSuspicious) {
            nextStatus = VIDEO_STATUS.REPORTED_SUSPICIOUS;
            console.log(`[MODERATION] Video ${videoId} flagged as fake ${nextFlags} times. Shifting to REPORTED_SUSPICIOUS.`);
            
            // Re-trigger secondary rigorous AI checks in background after 5s
            setTimeout(() => {
              setUserReports((currentList) => 
                currentList.map((item) => {
                  if (item.id === videoId) {
                    // 50% chance of recovery or final rejection
                    const finalStatus = Math.random() > 0.4 ? VIDEO_STATUS.PUBLIC_APPROVED : VIDEO_STATUS.REJECTED;
                    return { ...item, status: finalStatus, flagsCount: 0 };
                  }
                  return item;
                })
              );
            }, 6000);
          }
          
          return { ...r, flagsCount: nextFlags, status: nextStatus };
        }
        return r;
      });
    });
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'map':
        return <SnapMapView gpsCoords={gpsCoords} userReports={userReports} onReportVideo={handleReportVideo} />;
      case 'services':
        return <ServicesDirectoryView gpsCoords={gpsCoords} />;
      case 'camera':
        return <SecureCameraView onUploadComplete={handleNewUpload} gpsCoords={gpsCoords} />;
      case 'alerts':
        return <AlertsChatView />;
      case 'reels':
        return <LocalReelsFeedView gpsCoords={gpsCoords} userReports={userReports} onReportVideo={handleReportVideo} />;
      default:
        return <SnapMapView gpsCoords={gpsCoords} userReports={userReports} onReportVideo={handleReportVideo} />;
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#ffffff'
    }}>
      {/* Active Tab Viewport */}
      {renderActiveView()}

      {/* Persistent Upload Tracker Banners if active uploads are in progress */}
      {userReports.length > 0 && activeTab === 'map' && (
        <div style={{
          position: 'absolute',
          bottom: '100px',
          left: '20px',
          right: '20px',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none'
        }}>
          {userReports.slice(0, 2).map((report) => (
            <div 
              className="glass-panel"
              style={{
                padding: '10px 14px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                pointerEvents: 'auto',
                backgroundColor: '#ffffff'
              }}
              key={report.id}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span style={{ color: '#007aff', fontWeight: '700' }}>📹 Processing Report:</span>
                <span style={{ 
                  color: '#333333',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '120px'
                }}>
                  [{report.title || report.id}]
                </span>
              </div>
              <span style={{
                color: report.status === 'PUBLIC_APPROVED' ? '#22c55e' : (report.status === 'REPORTED_SUSPICIOUS' ? '#ff3b30' : '#007aff'),
                fontWeight: '700'
              }}>
                {report.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tab Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
