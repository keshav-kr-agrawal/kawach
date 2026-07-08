import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { User, BookOpen, ArrowLeft, Shield } from 'lucide-react';
import { supabase } from './supabaseClient';

// Citizen components
import BottomNav from './components/user/BottomNav';
import SnapMapView from './components/user/SnapMapView';
import ServicesDirectoryView from './components/user/ServicesDirectoryView';
import SecureCameraView from './components/user/SecureCameraView';
import AlertsChatView from './components/user/AlertsChatView';
import LocalReelsFeedView from './components/user/LocalReelsFeedView';
import LandingPageView from './components/LandingPageView';
import CitizenLoginView from './components/CitizenLoginView';
import InteractiveLegalLibraryView from './components/user/InteractiveLegalLibraryView';
import UserProfileView from './components/user/UserProfileView';

// Police & Department components
import PoliceAppLayout from './components/department/police/PoliceAppLayout';
import DashboardView from './components/department/police/DashboardView';
import GeoMapView from './components/department/police/GeoMapView';
import NetworkView from './components/department/police/NetworkView';
import OffendersView from './components/department/police/OffendersView';
import SocioEconomicView from './components/department/police/SocioEconomicView';
import PredictiveView from './components/department/police/PredictiveView';
import AlertsView from './components/department/police/AlertsView';
import InvestigationsView from './components/department/police/InvestigationsView';
import AICopilotView from './components/department/police/AICopilotView';
import ReportsView from './components/department/police/ReportsView';
import CitizenFraudShieldView from './components/department/police/CitizenFraudShieldView';
import CounterfeitScannerView from './components/department/police/CounterfeitScannerView';
import FaceAnalyticsView from './components/department/police/FaceAnalyticsView';
import DistrictPerformanceView from './components/department/police/DistrictPerformanceView';
import MobileFieldSimulatorView from './components/department/police/MobileFieldSimulatorView';
import IngestionExplorerView from './components/department/police/IngestionExplorerView';
import SentinelMapView from './components/department/police/SentinelMapView';
import DistrictAnalyticsView from './components/department/police/DistrictAnalyticsView';
import CCTVAnalyticsSimulator from './components/department/police/CCTVAnalyticsSimulator';
import SentinelCitizenApp from './components/department/police/SentinelCitizenApp';
import ExecutiveDashboardView from './components/department/police/ExecutiveDashboardView';

// General & wrapper department views
import MultiDepartmentView from './components/department/MultiDepartmentView';
import FireDashboardView from './components/department/fire/FireDashboardView';
import HealthDashboardView from './components/department/health/HealthDashboardView';
import DisasterDashboardView from './components/department/disaster/DisasterDashboardView';
import AdminView from './components/admin/AdminView';

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

function TopBar({ onOpenProfile, onOpenLibrary }) {
  const location = useLocation();
  const navigate = useNavigate();

  const getPageMeta = () => {
    const path = location.pathname;
    if (path.startsWith('/user/map')) return { title: 'SENTINEL GHOST MAP', subtitle: 'PII-Free Safety Grid' };
    if (path.startsWith('/user/feed')) return { title: 'LOCAL INCIDENT FEED', subtitle: 'Peer-to-Peer Broadcasts' };
    if (path.startsWith('/user/services')) return { title: 'CIVIC DIRECTORY', subtitle: 'Verified Helplines & Contacts' };
    if (path.startsWith('/user/chat')) return { title: 'EMERGENCY SHIELD', subtitle: 'Warnings & Live Alerts' };
    if (path.startsWith('/user/camera')) return { title: 'SECURE CAPTURE', subtitle: 'Anonymous Incident Camera' };
    if (path.startsWith('/user/library')) return { title: 'CITIZEN LAW LIBRARY', subtitle: 'Know Your Rights' };
    if (path.startsWith('/user/profile')) return { title: 'CITIZEN PROFILE', subtitle: 'Sentinel Privacy Settings' };
    return { title: 'KAWACH SENTINEL', subtitle: 'Public Threat Intelligence' };
  };

  const { title, subtitle } = getPageMeta();
  const isProfileOrLibrary = location.pathname.includes('/profile') || location.pathname.includes('/library');

  return (
    <div className="glass-panel flex-none" style={{
      width: '100%',
      padding: '12px 16px',
      borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#ffffff',
      zIndex: 1000,
      position: 'relative',
      boxSizing: 'border-box'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {!isProfileOrLibrary ? (
          <Link
            to="/user/profile"
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
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
              textDecoration: 'none'
            }}
            title="Open User Profile"
          >
            <User size={15} color="#000000" strokeWidth={2.5} />
          </Link>
        ) : (
          <button
            onClick={() => navigate(-1)}
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
            title="Go Back"
          >
            <ArrowLeft size={15} strokeWidth={2.5} />
          </button>
        )}

        <div>
          <h3 style={{ margin: 0, fontSize: '11px', fontWeight: '900', fontFamily: 'Outfit, sans-serif', color: '#000000', letterSpacing: '0.02em' }}>
            {title}
          </h3>
          <p style={{ margin: 0, fontSize: '9px', color: '#64748B', fontWeight: '600' }}>
            {subtitle}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {!isProfileOrLibrary && (
          <button
            onClick={onOpenLibrary}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#333333'
            }}
            title="Open Legal Library"
          >
            <BookOpen size={15} strokeWidth={2.5} />
          </button>
        )}

        <div style={{
          backgroundColor: 'rgba(255, 217, 0, 0.15)',
          color: '#000000',
          padding: '4px 8px',
          borderRadius: '10px',
          fontSize: '9px',
          fontWeight: '800',
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          border: '1px solid rgba(255, 217, 0, 0.4)'
        }}>
          <span style={{ display: 'inline-block', width: '5px', height: '5px', backgroundColor: '#ff3b30', borderRadius: '50%' }} />
          <span>LIVE</span>
        </div>
      </div>
    </div>
  );
}

function UserLayout({ userReports }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we are currently on map tab
  const isMapTab = location.pathname.startsWith('/user/map');

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto overflow-hidden relative bg-black">
      {/* Persistent Dynamic Top Bar */}
      <TopBar
        onOpenProfile={() => navigate('/user/profile')}
        onOpenLibrary={() => navigate('/user/library')}
      />

      {/* Scrollable Middle Content — each child view manages its own scroll */}
      <div className="flex-1 overflow-hidden relative w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="absolute inset-0 flex flex-col"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Persistent Upload Tracker Banners if active uploads are in progress (only shown on Map) */}
      {userReports.filter(r => r.status !== 'PUBLIC_APPROVED' && r.status !== 'REJECTED' && r.status !== 'RESOLVED').length > 0 && isMapTab && (
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
          {userReports
            .filter(r => r.status !== 'PUBLIC_APPROVED' && r.status !== 'REJECTED' && r.status !== 'RESOLVED')
            .slice(0, 2)
            .map((report) => (
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

function RequireCitizenAuth({ token, isLoadingSession, children }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isLoadingSession && !token) {
      const currentPath = window.location.pathname;
      if (currentPath && currentPath !== '/' && currentPath !== '/user/login') {
        sessionStorage.setItem('redirect_path', currentPath);
      }
      navigate('/');
    }
  }, [token, isLoadingSession, navigate]);

  if (isLoadingSession) {
    return (
      <div style={{ display: 'flex', height: '100dvh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', width: '100vw' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #ffd900', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return token ? children : null;
}

function RequirePoliceAuth({ token, children }) {
  const location = useLocation();
  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return children;
}

class ProfileErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('[ProfileErrorBoundary] Caught render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 gap-4 bg-slate-50">
          <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center text-2xl">⚠️</div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Profile Error</h3>
          <p className="text-xs text-slate-500 text-center">Something went wrong loading your profile.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-6 py-2.5 bg-yellow-400 text-black text-xs font-black rounded-full"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function CitizenAppWrapper({ children }) {
  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto overflow-hidden relative bg-black">
      {children}
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [gpsCoords, setGpsCoords] = useState([12.9285, 77.6245]); // Defaults to Koramangala, Bengaluru
  const [userReports, setUserReports] = useState([]);
  const [citizenToken, setCitizenToken] = useState('');
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [citizenUser, setCitizenUser] = useState(null);
  const [officialToken, setOfficialToken] = useState(() => {
    try {
      return localStorage.getItem('token') || '';
    } catch (e) {
      return '';
    }
  });
  const [officialUser, setOfficialUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const handleOfficialLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setOfficialToken('');
    setOfficialUser(null);
    navigate('/');
  };
  const [bookmarkedLawIds, setBookmarkedLawIds] = useState(() => {
    try {
      const saved = localStorage.getItem('kawach_bookmarked_laws');
      return saved ? JSON.parse(saved) : ['fc-1'];
    } catch (e) {
      return ['fc-1'];
    }
  });

  // Store dynamic Supabase URL and Anon key in localStorage for static sub-apps to read
  useEffect(() => {
    const defaultUrl = 'https://jlqelkrfeksixxfkulwf.supabase.co';
    const defaultAnonKey = 'sb_publishable_tG7DDMyStV7t-zrEbRKtrA_hFnPJQIb';
    const activeUrl = import.meta.env.VITE_SUPABASE_URL || defaultUrl;
    const activeAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultAnonKey;
    localStorage.setItem('VITE_SUPABASE_URL', activeUrl);
    localStorage.setItem('VITE_SUPABASE_ANON_KEY', activeAnonKey);
  }, []);

  // Sync bookmarks to localStorage
  useEffect(() => {
    localStorage.setItem('kawach_bookmarked_laws', JSON.stringify(bookmarkedLawIds));
  }, [bookmarkedLawIds]);

  // Fetch session on startup and listen to auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCitizenToken(session.access_token);
        setCitizenUser(session.user);
      }
      setIsLoadingSession(false);
    }).catch(() => {
      setIsLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setCitizenToken(session.access_token);
        setCitizenUser(session.user);
      } else {
        setCitizenToken('');
        setCitizenUser(null);
      }
      setIsLoadingSession(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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

  // Helper to format timestamps nicely in Snapchat relative format
  const formatRelativeTime = (timestampString) => {
    if (!timestampString) return 'Just now';
    try {
      const date = new Date(timestampString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch (e) {
      return 'Just now';
    }
  };

  const SEED_REPORTS = [
    {
      id: "seed-1",
      title: "Water Pipeline Leakage on 80ft Road",
      description: "Severe water wastage observed from the main pipeline. Immediate repair required.",
      category: "Infrastructure",
      uploaderUuid: "sys-seed-01",
      status: "PUBLIC_APPROVED",
      lat: 12.9302,
      lng: 77.6225,
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4",
      emergencyOverride: false,
      trimStart: 0,
      trimEnd: 12,
      views: 142,
      upvotes: 48,
      timestamp: "2 hours ago",
      routedDepartment: "WATER_BOARD",
      routingPriority: "HIGH",
      routingReason: "Main supply pipeline rupture causing local flooding.",
      trustScore: 94,
      civicUrgencyScore: 85,
      sceneDetected: true,
      detectedIssues: ["water_leakage", "flooded_street"]
    },
    {
      id: "seed-2",
      title: "Illegal Trash Dumping Near Park Entrance",
      description: "Large pile of garbage dumped overnight next to the children's park.",
      category: "Infrastructure",
      uploaderUuid: "sys-seed-02",
      status: "PUBLIC_APPROVED",
      lat: 12.9268,
      lng: 77.6258,
      videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
      emergencyOverride: false,
      trimStart: 0,
      trimEnd: 10,
      views: 89,
      upvotes: 21,
      timestamp: "5 hours ago",
      routedDepartment: "SANITATION",
      routingPriority: "NORMAL",
      routingReason: "Public space obstruction and sanitation hazard.",
      trustScore: 88,
      civicUrgencyScore: 60,
      sceneDetected: true,
      detectedIssues: ["waste_accumulation"]
    }
  ];

  // Fetch all reports from Supabase on load
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data, error } = await supabase
          .from('citizen_reports')
          .select('*')
          .order('timestamp', { ascending: false });

        if (error) {
          console.warn('[SUPABASE] Table "citizen_reports" might not be created yet. Please run the SQL setup script. Error:', error.message);
          setUserReports(SEED_REPORTS);
          return;
        }

        if (data) {
          // Map database snake_case to frontend camelCase expected by all views
          const mappedReports = data.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            category: item.category,
            uploaderUuid: item.uploader_uuid,
            status: item.status,
            lat: item.lat,
            lng: item.lng,
            videoUrl: item.video_url,
            emergencyOverride: item.emergency_override,
            trimStart: item.trim_start,
            trimEnd: item.trim_end,
            views: item.views || 0,
            upvotes: item.upvotes || 0,
            timestamp: formatRelativeTime(item.timestamp),
            routedDepartment: item.routed_department,
            routingPriority: item.routing_priority,
            routingReason: item.routing_reason,
            escalationRequired: item.escalation_required,
            aiVerdict: item.ai_verdict,
            fakeProb: item.fake_prob,
            confidenceLevel: item.confidence_level,
            facesDetected: item.faces_detected,
            subCategory: item.sub_category,
            estimatedResolutionDays: item.estimated_resolution_days,
            trustScore: item.trust_score,
            civicUrgencyScore: item.civic_urgency_score,
            sceneDetected: item.scene_detected,
            detectedIssues: item.detected_issues,
            temporalConsistency: item.temporal_consistency,
            dominantClass: item.dominant_class
          }));
          setUserReports(mappedReports);
          console.log('[SUPABASE] Loaded reports successfully:', mappedReports.length, 'records found.');

          // Resume simulated AI processing for any in-progress reports uploaded by this user
          const currentUserUuid = localStorage.getItem('kawach_uploader_uuid');
          mappedReports.forEach((report) => {
            const inProgressStatuses = [
              VIDEO_STATUS.AI_CHECK_1,
              VIDEO_STATUS.DEPT_ROUTING,
              VIDEO_STATUS.COHORT_TEST,
              VIDEO_STATUS.REPORTED_SUSPICIOUS,
              VIDEO_STATUS.AI_CHECK_2
            ];
            if (inProgressStatuses.includes(report.status) && report.uploaderUuid === currentUserUuid) {
              console.log(`[SUPABASE] Resuming verification simulation for report: ${report.id} (status: ${report.status})`);
              simulateWorkflowProgress(report, async (updatedReport) => {
                setUserReports((prev) =>
                  prev.map((r) => r.id === updatedReport.id ? { ...updatedReport, flagsCount: r.flagsCount } : r)
                );
                try {
                  await supabase
                    .from('citizen_reports')
                    .update({ status: updatedReport.status })
                    .eq('id', updatedReport.id);
                } catch (err) {
                  console.error('[SUPABASE] Error syncing resumed workflow status:', err);
                }
              });
            }
          });
        } else {
          setUserReports([]);
        }
      } catch (err) {
        console.error('[SUPABASE] Exception during load:', err);
        setUserReports([]);
      }
    };

    fetchReports();
  }, []);

  const handleNewUpload = async (newReport) => {
    const reportWithFlags = { ...newReport, flagsCount: 0 };

    // 1. Optimistic local state update for zero latency feel
    setUserReports((prev) => [reportWithFlags, ...prev]);

    // Automatically navigate back to the proximity feed
    navigate('/user/feed');

    // 2. Save the report to Supabase database
    try {
      const { error } = await supabase
        .from('citizen_reports')
        .insert([{
          id: newReport.id,
          title: newReport.title,
          description: newReport.description,
          category: newReport.category,
          uploader_uuid: newReport.uploaderUuid,
          status: newReport.status,
          lat: newReport.lat,
          lng: newReport.lng,
          video_url: newReport.videoUrl,
          emergency_override: newReport.emergencyOverride,
          trim_start: newReport.trimStart,
          trim_end: newReport.trimEnd,
          views: newReport.views || 0,
          upvotes: newReport.upvotes || 0,
          timestamp: new Date().toISOString(),
          routed_department: newReport.routedDepartment || null,
          routing_priority: newReport.routingPriority || null,
          routing_reason: newReport.routingReason || null,
          escalation_required: newReport.escalationRequired || false,
          ai_verdict: newReport.aiVerdict || null,
          fake_prob: newReport.fakeProb ?? null,
          confidence_level: newReport.confidenceLevel || null,
          faces_detected: newReport.facesDetected ?? null,
          sub_category: newReport.subCategory || null,
          estimated_resolution_days: newReport.estimatedResolutionDays ?? null,
          trust_score: newReport.trustScore ?? null,
          civic_urgency_score: newReport.civicUrgencyScore ?? null,
          scene_detected: newReport.sceneDetected ?? null,
          detected_issues: newReport.detectedIssues || null,
          temporal_consistency: newReport.temporalConsistency ?? null,
          dominant_class: newReport.dominantClass || null
        }]);

      if (error) {
        console.error('[SUPABASE] Error saving new report to database:', error.message);
      } else {
        console.log('[SUPABASE] Report successfully saved to cloud database!');
      }
    } catch (err) {
      console.error('[SUPABASE] Exception during insert:', err);
    }

    // 3. Sync the simulated AI processing pipeline to database
    if (!newReport.emergencyOverride) {
      simulateWorkflowProgress(reportWithFlags, async (updatedReport) => {
        setUserReports((prev) =>
          prev.map((r) => r.id === updatedReport.id ? { ...updatedReport, flagsCount: r.flagsCount } : r)
        );

        try {
          await supabase
            .from('citizen_reports')
            .update({ status: updatedReport.status })
            .eq('id', updatedReport.id);
        } catch (err) {
          console.error('[SUPABASE] Error syncing workflow status:', err);
        }
      });
    }
  };

  const handleDeleteReport = async (reportId) => {
    // Acknowledge mock records
    if (reportId.startsWith('m-dept-') || reportId.startsWith('act-')) {
      setUserReports((prev) => prev.filter((r) => r.id !== reportId));
      return;
    }

    try {
      // 1. Delete from Supabase first
      const { error } = await supabase
        .from('citizen_reports')
        .delete()
        .eq('id', reportId);

      if (error) {
        console.error('[SUPABASE] Error deleting report:', error.message);
      } else {
        console.log('[SUPABASE] Report successfully deleted from database!');
        // 2. State Sync: Update UI ONLY after successful DB confirmation
        setUserReports((prev) => prev.filter((r) => r.id !== reportId));
      }
    } catch (err) {
      console.error('[SUPABASE] Exception during delete:', err);
    }
  };

  const handleResolveReport = async (reportId) => {
    // 1. Optimistic UI update
    setUserReports((prev) =>
      prev.map((r) => r.id === reportId ? { ...r, status: 'RESOLVED' } : r)
    );

    // 2. Update in Supabase
    try {
      const { error } = await supabase
        .from('citizen_reports')
        .update({ status: 'RESOLVED' })
        .eq('id', reportId);

      if (error) {
        console.error('[SUPABASE] Error resolving report:', error.message);
      } else {
        console.log('[SUPABASE] Report successfully marked as resolved in database!');
      }
    } catch (err) {
      console.error('[SUPABASE] Exception during resolve:', err);
    }
  };

  const handleUpvoteReport = async (reportId) => {
    let liked = false;
    let nextUpvotes = 0;

    const likedList = JSON.parse(localStorage.getItem('kawach_liked_reports') || '[]');
    if (likedList.includes(reportId)) {
      const nextList = likedList.filter(id => id !== reportId);
      localStorage.setItem('kawach_liked_reports', JSON.stringify(nextList));
      liked = false;
    } else {
      likedList.push(reportId);
      localStorage.setItem('kawach_liked_reports', JSON.stringify(likedList));
      liked = true;
    }

    setUserReports((prev) =>
      prev.map((r) => {
        if (r.id === reportId) {
          nextUpvotes = Math.max(0, (r.upvotes || 0) + (liked ? 1 : -1));
          return { ...r, upvotes: nextUpvotes };
        }
        return r;
      })
    );

    try {
      const { error } = await supabase
        .from('citizen_reports')
        .update({ upvotes: nextUpvotes })
        .eq('id', reportId);

      if (error) {
        console.error('[SUPABASE] Error syncing upvotes:', error.message);
      } else {
        console.log('[SUPABASE] Upvote successfully synced to database!');
      }
    } catch (err) {
      console.error('[SUPABASE] Exception during upvote sync:', err);
    }
  };

  const handleReportVideo = async (videoId) => {
    setUserReports((prev) => {
      return prev.map((r) => {
        if (r.id === videoId) {
          const nextFlags = (r.flagsCount || 0) + 1;
          const isSuspicious = nextFlags >= 2;

          let nextStatus = r.status;
          if (isSuspicious) {
            nextStatus = VIDEO_STATUS.REPORTED_SUSPICIOUS;
            console.log(`[MODERATION] Video ${videoId} flagged as fake ${nextFlags} times. Shifting to REPORTED_SUSPICIOUS.`);

            setTimeout(async () => {
              const finalStatus = Math.random() > 0.4 ? VIDEO_STATUS.PUBLIC_APPROVED : VIDEO_STATUS.REJECTED;
              setUserReports((currentList) =>
                currentList.map((item) => {
                  if (item.id === videoId) {
                    return { ...item, status: finalStatus, flagsCount: 0 };
                  }
                  return item;
                })
              );

              try {
                await supabase
                  .from('citizen_reports')
                  .update({ status: finalStatus })
                  .eq('id', videoId);
              } catch (err) {
                console.error('[SUPABASE] Error syncing final moderation status:', err);
              }
            }, 6000);
          }

          // Sync immediate flag status to database
          supabase
            .from('citizen_reports')
            .update({ status: nextStatus })
            .eq('id', videoId)
            .catch((err) => console.error('[SUPABASE] Error syncing flag status:', err));

          return { ...r, flagsCount: nextFlags, status: nextStatus };
        }
        return r;
      });
    });
  };

  return (
    <Routes>
      {/* Standalone User Login Screen (Default Root Route) */}
      <Route
        path="/"
        element={
          citizenToken ? (
            <Navigate to="/user/map" replace />
          ) : (
            <CitizenAppWrapper>
              <CitizenLoginView
                onLoginSuccess={(token) => {
                  setCitizenToken(token);
                  const savedRedirect = sessionStorage.getItem('redirect_path');
                  if (savedRedirect) {
                    sessionStorage.removeItem('redirect_path');
                    navigate(savedRedirect);
                  } else {
                    navigate('/user/map');
                  }
                }}
                onBackToHome={() => navigate('/portals')}
              />
            </CitizenAppWrapper>
          )
        }
      />

      {/* Redirect old login path to root */}
      <Route path="/user/login" element={<Navigate to="/" replace />} />

      {/* Multi-portal Gateway Page (Moved from root) */}
      <Route
        path="/portals"
        element={
          <LandingPageView
            onEnterCitizen={() => navigate(citizenToken ? '/user/map' : '/')}
            onOfficialLogin={(token, user) => {
              setOfficialToken(token);
              setOfficialUser(user);
            }}
          />
        }
      />

      {/* Routed App Container */}
      <Route
        path="/user"
        element={
          <RequireCitizenAuth token={citizenToken} isLoadingSession={isLoadingSession}>
            <CitizenAppWrapper>
              <UserLayout userReports={userReports} />
            </CitizenAppWrapper>
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
              onUpvoteReport={handleUpvoteReport}
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
            <ProfileErrorBoundary>
              <UserProfileView
                onBack={() => navigate(-1)}
                bookmarkedLaws={ALL_FLASHCARDS.filter(c => bookmarkedLawIds.includes(c.id))}
                userReports={userReports}
                onRemoveBookmark={handleToggleBookmark}
                onDeleteReport={handleDeleteReport}
                onResolveReport={handleResolveReport}
                onSignOut={async () => {
                  await supabase.auth.signOut();
                  setCitizenToken('');
                  navigate('/');
                }}
                isLoading={isLoadingSession}
                user={citizenUser}
              />
            </ProfileErrorBoundary>
          }
        />
      </Route>

      {/* Official Portals Routing (Latency-Free SPA Routes) */}
      <Route
        path="/department/police"
        element={
          <RequirePoliceAuth token={officialToken}>
            <PoliceAppLayout user={officialUser} onLogout={handleOfficialLogout}>
              <Outlet />
            </PoliceAppLayout>
          </RequirePoliceAuth>
        }
      >
        <Route index element={<Navigate to="/department/police/command" replace />} />
        <Route path="command" element={<DashboardView token={officialToken} user={officialUser} />} />
        <Route path="dashboard" element={<ExecutiveDashboardView token={officialToken} user={officialUser} />} />
        <Route path="map" element={<GeoMapView token={officialToken} user={officialUser} />} />
        <Route path="sentinel" element={<SentinelMapView token={officialToken} user={officialUser} />} />
        <Route path="sentinel-citizen" element={<SentinelCitizenApp token={officialToken} user={officialUser} />} />
        <Route path="departments" element={<MultiDepartmentView />} />
        <Route path="district-analytics" element={<DistrictAnalyticsView token={officialToken} user={officialUser} />} />
        <Route path="cctv" element={<CCTVAnalyticsSimulator token={officialToken} user={officialUser} />} />
        <Route path="graph" element={<NetworkView token={officialToken} user={officialUser} />} />
        <Route path="offenders" element={<OffendersView token={officialToken} user={officialUser} />} />
        <Route path="alerts" element={<AlertsView token={officialToken} user={officialUser} />} />
        <Route path="fraudshield" element={<CitizenFraudShieldView token={officialToken} user={officialUser} />} />
        <Route path="counterfeit" element={<CounterfeitScannerView token={officialToken} user={officialUser} />} />
        <Route path="face" element={<FaceAnalyticsView token={officialToken} user={officialUser} />} />
        <Route path="performance" element={<DistrictPerformanceView token={officialToken} user={officialUser} />} />
        <Route path="mobile" element={<MobileFieldSimulatorView token={officialToken} user={officialUser} />} />
        <Route path="ingestion" element={<IngestionExplorerView token={officialToken} user={officialUser} />} />
        <Route path="investigations" element={<InvestigationsView token={officialToken} user={officialUser} />} />
        <Route path="copilot" element={<AICopilotView token={officialToken} user={officialUser} />} />
        <Route path="reports" element={<ReportsView token={officialToken} user={officialUser} />} />
        <Route path="socio" element={<SocioEconomicView token={officialToken} user={officialUser} />} />
        <Route path="predictive" element={<PredictiveView token={officialToken} user={officialUser} />} />
        <Route path="admin" element={<AdminView token={officialToken} user={officialUser} />} />
      </Route>

      <Route
        path="/department/fire"
        element={
          <RequirePoliceAuth token={officialToken}>
            <FireDashboardView />
          </RequirePoliceAuth>
        }
      />
      <Route
        path="/department/health"
        element={
          <RequirePoliceAuth token={officialToken}>
            <HealthDashboardView />
          </RequirePoliceAuth>
        }
      />
      <Route
        path="/department/disaster"
        element={
          <RequirePoliceAuth token={officialToken}>
            <DisasterDashboardView />
          </RequirePoliceAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequirePoliceAuth token={officialToken}>
            <div className="p-6 bg-slate-950 min-h-screen text-slate-100 flex flex-col gap-6 select-text">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-wider">Super Admin God-Mode Overview</h2>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Platform Administration Console</span>
                </div>
                <button
                  onClick={handleOfficialLogout}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              </div>
              <AdminView token={officialToken} user={officialUser} />
            </div>
          </RequirePoliceAuth>
        }
      />

      {/* Fallback to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
