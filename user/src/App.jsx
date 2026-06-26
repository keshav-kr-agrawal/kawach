import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import BottomNav from './components/BottomNav';
import SnapMapView from './components/SnapMapView';
import ServicesDirectoryView from './components/ServicesDirectoryView';
import SecureCameraView from './components/SecureCameraView';
import AlertsChatView from './components/AlertsChatView';
import LocalReelsFeedView from './components/LocalReelsFeedView';
import LandingPageView from './components/LandingPageView';
import CitizenLoginView from './components/CitizenLoginView';
import InteractiveLegalLibraryView from './components/InteractiveLegalLibraryView';
import UserProfileView from './components/UserProfileView';
import { simulateWorkflowProgress, VIDEO_STATUS } from './api/videoService';

const ALL_FLASHCARDS = [
  {
    id: 'fc-1',
    title: 'Cop takes your keys?',
    backTitle: 'Motor Vehicles Act, 1988',
    frontDescription: 'A traffic officer stops you and attempts to pluck the keys out of your ignition. Can they legally do this?',
    backContent: 'Under the Motor Vehicles Act, no officer has the legal authority to forcibly confiscate ignition keys. Doing so constitutes illegal restraint.',
    action: 'Politely ask for their badge ID and rank. Document the incident or record on your device. File a complaint with the traffic control room.',
    penalty: 'Officer faces internal departmental action for misconduct.'
  },
  {
    id: 'fc-2',
    title: 'Midnight Arrest Rule',
    backTitle: 'Section 46(4) of CrPC',
    frontDescription: 'Can a female citizen be arrested after sunset and before sunrise by law enforcement?',
    backContent: 'Strictly prohibited. No woman can be arrested after 6 PM or before 6 AM except in exceptional circumstances under written permission of a Judicial Magistrate.',
    action: 'Demand to see the written order of a Judicial Magistrate. If absent, refuse custody. Ensure a female officer is present at all times.',
    penalty: 'Arresting officers can be charged under Section 166 (Public servant disobeying law).'
  },
  {
    id: 'fc-3',
    title: 'Digital Arrest Scams',
    backTitle: 'BNS Section 318 (Cheating)',
    frontDescription: 'You receive a video call claiming your Aadhaar card is linked to money laundering and they order you to stay online under "digital arrest".',
    backContent: 'There is NO legal concept of "Digital Arrest". Real police forces do not conduct interrogations via Skype, WhatsApp, or Zoom for case freezing.',
    action: 'Disconnect immediately. Do not share banking passwords or transfer money. Report the caller phone number/UPI ID to the Citizen Fraud Shield.',
    penalty: 'Scammers face up to 7 years in prison and heavy financial fines.'
  },
  {
    id: 'fc-4',
    title: 'Bribe Demands',
    backTitle: 'Prevention of Corruption Act',
    frontDescription: 'An official demands a payment of "speed money" to approve your application or passport clearance.',
    backContent: 'Demanding or accepting bribe currency is a severe criminal offense. Speed money is NOT a legally recognized processing fee.',
    action: 'Refuse to pay. Discreetly record the interaction or voice note the officer. Immediately report the official name to the Anti-Corruption Bureau.',
    penalty: 'Min 3 years to Max 7 years imprisonment for corrupt officials.'
  }
];

function UserLayout({ userReports }) {
  const location = useLocation();

  // Check if we are currently on map tab
  const isMapTab = location.pathname.startsWith('/user/map');

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
      {/* Subview Scroll Viewport */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Persistent Upload Tracker Banners if active uploads are in progress (only shown on Map) */}
      {userReports.length > 0 && isMapTab && (
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
                <span style={{ color: '#ffd900', fontWeight: '700' }}>📹 Processing Report:</span>
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
                color: report.status === 'PUBLIC_APPROVED' ? '#22c55e' : (report.status === 'REPORTED_SUSPICIOUS' ? '#ff3b30' : '#ffd900'),
                fontWeight: '700'
              }}>
                {report.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tab Navigation (persistent layout) */}
      <BottomNav />
    </div>
  );
}

function RequireCitizenAuth({ token, children }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!token) {
      navigate('/user/login');
    }
  }, [token, navigate]);
  return token ? children : null;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [gpsCoords, setGpsCoords] = useState([12.9285, 77.6245]); // Defaults to Koramangala, Bengaluru
  const [userReports, setUserReports] = useState([]);
  const [citizenToken, setCitizenToken] = useState(sessionStorage.getItem('citizen_token') || '');
  const [bookmarkedLawIds, setBookmarkedLawIds] = useState(['fc-1']); // default pre-seed bookmark

  const handleToggleBookmark = (lawId) => {
    setBookmarkedLawIds((prev) => 
      prev.includes(lawId) ? prev.filter(id => id !== lawId) : [...prev, lawId]
    );
  };

  // Handle body styling scope for PWA mock and query parameter check
  useEffect(() => {
    const isCitizenApp = location.pathname.startsWith('/user');
    if (isCitizenApp) {
      document.body.classList.add('in-app');
    } else {
      document.body.classList.remove('in-app');
    }

    // Auto-login parsing
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    if (tokenFromUrl) {
      sessionStorage.setItem('citizen_token', tokenFromUrl);
      setCitizenToken(tokenFromUrl);
      // Clean query params
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
      navigate('/user/map');
    }

    return () => {
      document.body.classList.remove('in-app');
    };
  }, [location, navigate]);

  // Fetch coordinates on startup
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
    const reportWithFlags = { ...newReport, flagsCount: 0 };
    setUserReports((prev) => [reportWithFlags, ...prev]);

    if (!newReport.emergencyOverride) {
      simulateWorkflowProgress(reportWithFlags, (updatedReport) => {
        setUserReports((prev) => 
          prev.map((r) => r.id === updatedReport.id ? { ...updatedReport, flagsCount: r.flagsCount } : r)
        );
      });
    } else {
      setTimeout(() => {
        setUserReports((prev) => 
          prev.map((r) => r.id === newReport.id ? { ...r, status: VIDEO_STATUS.AI_CHECK_2 } : r)
        );
      }, 5000);
    }
  };

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
            
            setTimeout(() => {
              setUserReports((currentList) => 
                currentList.map((item) => {
                  if (item.id === videoId) {
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

  return (
    <Routes>
      {/* Landing Gateway Page */}
      <Route path="/" element={<LandingPageView onEnterCitizen={() => navigate(citizenToken ? '/user/map' : '/user/login')} />} />
      
      {/* Standalone Login Screen */}
      <Route 
        path="/user/login" 
        element={
          <CitizenLoginView 
            onLoginSuccess={() => {
              sessionStorage.setItem('citizen_token', 'mock_jwt_token_123');
              setCitizenToken('mock_jwt_token_123');
              navigate('/user/map');
            }}
            onBackToHome={() => { window.location.href = 'http://localhost:5173/'; }}
          />
        } 
      />

      {/* Routed App Container */}
      <Route 
        path="/user" 
        element={
          <RequireCitizenAuth token={citizenToken}>
            <UserLayout userReports={userReports} />
          </RequireCitizenAuth>
        }
      >
        <Route index element={<Navigate to="/user/map" replace />} />
        <Route 
          path="map" 
          element={
            <SnapMapView 
              gpsCoords={gpsCoords} 
              userReports={userReports} 
              onReportVideo={handleReportVideo}
              onOpenProfile={() => navigate('/user/profile')}
              onOpenLibrary={() => navigate('/user/library')}
            />
          } 
        />
        <Route path="services" element={<ServicesDirectoryView gpsCoords={gpsCoords} />} />
        <Route path="camera" element={<SecureCameraView onUploadComplete={handleNewUpload} gpsCoords={gpsCoords} />} />
        <Route path="chat" element={<AlertsChatView />} />
        <Route 
          path="feed" 
          element={
            <LocalReelsFeedView 
              gpsCoords={gpsCoords} 
              userReports={userReports} 
              onReportVideo={handleReportVideo}
              onOpenProfile={() => navigate('/user/profile')}
              onOpenLibrary={() => navigate('/user/library')}
            />
          } 
        />
        <Route 
          path="library" 
          element={
            <InteractiveLegalLibraryView 
              onBack={() => navigate(-1)}
              onToggleBookmark={handleToggleBookmark}
              bookmarkedLawIds={bookmarkedLawIds}
            />
          } 
        />
        <Route 
          path="profile" 
          element={
            <UserProfileView 
              onBack={() => navigate(-1)}
              bookmarkedLaws={ALL_FLASHCARDS.filter(c => bookmarkedLawIds.includes(c.id))}
              userReports={userReports}
              onRemoveBookmark={handleToggleBookmark}
              onSignOut={() => {
                sessionStorage.removeItem('citizen_token');
                setCitizenToken('');
                window.location.href = 'http://localhost:5173/';
              }}
            />
          } 
        />
      </Route>
      
      {/* Fallback to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
