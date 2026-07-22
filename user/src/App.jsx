import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, Outlet, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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

import { simulateWorkflowProgress, reclassifyVideoUrl, VIDEO_STATUS } from './api/videoService';
import { createReport, REPORT_SOURCES } from './api/reportService';
import { routeReport } from './api/routingService';

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
  const [alertsOpen, setAlertsOpen] = useState(false);

  const getPageMeta = () => {
    const path = location.pathname;
    if (path.startsWith('/user/map')) return { title: 'SENTINEL GHOST MAP', subtitle: 'PII-Free Safety Grid' };
    if (path.startsWith('/user/feed')) return { title: 'LOCAL INCIDENT FEED', subtitle: 'Peer-to-Peer Safety Broadcasts' };
    if (path.startsWith('/user/services')) return { title: 'CIVIC DIRECTORY', subtitle: 'Verified Helplines & Contacts' };
    if (path.startsWith('/user/nayak') || path.startsWith('/user/chat') || path.startsWith('/nayak')) return { title: 'NAYAK AI COUNSEL', subtitle: 'Law-Backed Threat Counsel' };
    if (path.startsWith('/user/camera')) return { title: 'SECURE CAPTURE', subtitle: 'Anonymous Incident Camera' };
    if (path.startsWith('/user/library')) return { title: 'CITIZEN LAW LIBRARY', subtitle: 'Know Your Legal Rights' };
    if (path.startsWith('/user/profile')) return { title: 'CITIZEN PROFILE', subtitle: 'Sentinel Privacy & History' };
    return { title: 'KAWACH SENTINEL', subtitle: 'Public Threat Intelligence' };
  };

  const { title, subtitle } = getPageMeta();
  const isProfileOrLibrary = location.pathname.includes('/profile') || location.pathname.includes('/library');

  return (
    <>
      <header className="glass-panel flex-none select-none" style={{
        width: '100%',
        padding: '8px 12px',
        borderBottom: '1px solid rgba(255, 217, 0, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        zIndex: 1000,
        position: 'relative',
        boxSizing: 'border-box',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          {!isProfileOrLibrary ? (
            <button
              type="button"
              onClick={() => {
                if (onOpenProfile) onOpenProfile();
                else navigate('/user/profile');
              }}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#E9BA26',
                border: '1.5px solid #000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                outline: 'none',
                flexShrink: 0
              }}
              title="Open User Profile"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" className="w-4 h-4"><path d="M20 21v-2a4 4 0 0 4-4H8a4 4 0 0 4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(-1)}
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
                color: '#333333',
                flexShrink: 0
              }}
              title="Go Back"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
          )}

          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 style={{
              margin: 0,
              fontSize: '11px',
              fontWeight: '900',
              fontFamily: 'Sora, sans-serif',
              color: '#09090b',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {title}
            </h3>
            <p style={{
              margin: 0,
              fontSize: '9px',
              color: '#64748B',
              fontWeight: '600',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {subtitle}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* Notification Bell Icon Button for Proximity Alerts */}
          <button
            type="button"
            onClick={() => setAlertsOpen(true)}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '10px',
              backgroundColor: '#fffbeb',
              border: '1px solid rgba(255, 217, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#b08850',
              position: 'relative'
            }}
            title="View Main Proximity Alerts"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '13px',
              height: '13px',
              backgroundColor: '#ff3b30',
              color: '#ffffff',
              borderRadius: '50%',
              fontSize: '8px',
              fontWeight: '900',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #ffffff'
            }}>
              3
            </span>
          </button>

          {!isProfileOrLibrary && (
            <button
              type="button"
              onClick={() => {
                if (onOpenLibrary) onOpenLibrary();
                else navigate('/user/library');
              }}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '10px',
                backgroundColor: '#fffbeb',
                border: '1px solid rgba(255, 217, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#b08850'
              }}
              title="Open Legal Library"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            </button>
          )}

          <div style={{
            backgroundColor: 'rgba(255, 217, 0, 0.18)',
            color: '#000000',
            padding: '4px 7px',
            borderRadius: '8px',
            fontSize: '9px',
            fontWeight: '800',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            border: '1px solid rgba(255, 217, 0, 0.5)',
            fontFamily: 'Sora, sans-serif'
          }}>
            <span style={{ display: 'inline-block', width: '5px', height: '5px', backgroundColor: '#ff3b30', borderRadius: '50%' }} />
            <span>LIVE</span>
          </div>
        </div>
      </header>

      {/* Main Proximity Alerts Popup Modal */}
      {alertsOpen && (
        <div className="fixed inset-0 z-50 bg-amber-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#E9BA26] rounded-3xl p-5 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-amber-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-red-100 text-red-600 rounded-xl font-black text-sm">🔔</span>
                <div>
                  <h3 className="font-black text-ink text-sm font-sora uppercase tracking-wider">
                    Main Proximity Alerts
                  </h3>
                  <span className="text-[9px] font-bold text-amber-700 font-mono">
                    2km Ward Sphere • Real-Time Safety Feed
                  </span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setAlertsOpen(false)} 
                className="w-7 h-7 rounded-lg bg-amber-50 text-ink-soft hover:text-ink font-bold flex items-center justify-center border border-amber-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-3.5 bg-red-50/90 border border-red-200 rounded-2xl flex flex-col gap-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-wider text-red-700 bg-red-100 px-2 py-0.5 rounded-md font-mono">
                    🔴 CRITICAL • 250m AWAY
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 font-mono">3m ago</span>
                </div>
                <h4 className="font-black text-ink text-xs font-sora mt-1">Armed Robbery Logged</h4>
                <p className="text-ink-soft text-[10px] font-semibold leading-relaxed">
                  Citizen recorded footage uploaded. Police patrol vehicle dispatched to Koramangala 5th Block.
                </p>
              </div>

              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl flex flex-col gap-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md font-mono">
                    ⚠️ HAZARD • 600m AWAY
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 font-mono">12m ago</span>
                </div>
                <h4 className="font-black text-ink text-xs font-sora mt-1">Waterlogging &amp; Fallen Tree</h4>
                <p className="text-ink-soft text-[10px] font-semibold leading-relaxed">
                  Hosur Road underpass blocked. Traffic divert active towards Silk Board flyover.
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/90 border border-blue-200 rounded-2xl flex flex-col gap-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md font-mono">
                    🛡️ FRAUD ALERT • 1.2km AWAY
                  </span>
                  <span className="text-[9px] font-bold text-slate-500 font-mono">28m ago</span>
                </div>
                <h4 className="font-black text-ink text-xs font-sora mt-1">Digital Arrest WhatsApp Scam</h4>
                <p className="text-ink-soft text-[10px] font-semibold leading-relaxed">
                  Fake CBI video call extortion reported in ward. Disconnect immediately; do not transfer money.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-100">
              <button
                type="button"
                onClick={() => {
                  setAlertsOpen(false);
                  navigate('/user/map');
                }}
                className="w-full py-2.5 bg-[#E9BA26] hover:bg-amber-400 text-ink font-black rounded-xl text-xs flex items-center justify-center gap-2 border border-amber-950/10 uppercase tracking-wider font-sora shadow-xs"
              >
                🗺️ View Incident Locations on Safety Map
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function UserLayout({ userReports }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getPageMeta = () => {
    const path = location.pathname;
    if (path.startsWith('/user/map')) return { title: 'SENTINEL GHOST MAP', subtitle: 'PII-Free Safety Grid' };
    if (path.startsWith('/user/feed')) return { title: 'LOCAL INCIDENT FEED', subtitle: 'Peer-to-Peer Broadcasts' };
    if (path.startsWith('/user/services')) return { title: 'CIVIC DIRECTORY', subtitle: 'Verified Helplines & Contacts' };
    if (path.startsWith('/user/nayak') || path.startsWith('/user/chat') || path.startsWith('/nayak')) return { title: 'NAYAK AI COUNSEL', subtitle: 'Law-Backed Counsel & Threat Verification' };
    if (path.startsWith('/user/camera')) return { title: 'SECURE CAPTURE', subtitle: 'Anonymous Incident Camera' };
    if (path.startsWith('/user/library')) return { title: 'CITIZEN LAW LIBRARY', subtitle: 'Know Your Rights' };
    if (path.startsWith('/user/profile')) return { title: 'CITIZEN PROFILE', subtitle: 'Sentinel Privacy Settings' };
    return { title: 'KAWACH SENTINEL', subtitle: 'Public Threat Intelligence' };
  };

  // Check if we are currently on map tab
  const isMapTab = location.pathname.startsWith('/user/map');

  if (isDesktop) {
    return (
      <div className="flex flex-row h-full w-full overflow-hidden relative bg-white select-text">
        {/* Desktop Left Sidebar */}
        <div className="flex flex-col w-64 bg-white border-r border-amber-200 h-full p-6 select-none flex-none overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <img src="/kawach.png" alt="KAWACH Logo" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-lg font-black tracking-tight text-ink font-sora">KAWACH</h1>
              <span className="text-[9px] font-bold text-ink-soft uppercase tracking-widest block -mt-1">Citizen Sentinel</span>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 space-y-2">
            {[
              { id: 'map', label: 'Safety Map', path: '/user/map', icon: '🗺️' },
              { id: 'services', label: 'Civic Directory', path: '/user/services', icon: '📞' },
              { id: 'camera', label: 'Incident Capture', path: '/user/camera', icon: '📸' },
              { id: 'chat', label: 'Nayak AI Counsel', path: '/user/nayak', icon: '⚖️' },
              { id: 'feed', label: 'Incident Feed', path: '/user/feed', icon: '🧭' },
              { id: 'library', label: 'Law Library', path: '/user/library', icon: '📖' },
              { id: 'profile', label: 'My Profile', path: '/user/profile', icon: '👤' },
            ].map((item) => {
              const isActive = location.pathname.startsWith(item.path) || (item.id === 'chat' && (location.pathname.startsWith('/user/chat') || location.pathname.startsWith('/nayak')));
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    isActive 
                      ? 'bg-[#E9BA26] text-ink shadow-sm border border-amber-950/10' 
                      : 'text-ink-soft hover:bg-amber-50 hover:text-ink'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Footer Sign Out */}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all mt-auto"
          >
            <span className="text-base">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>

        {/* Desktop Workspace */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <div className="flex-1 overflow-hidden relative w-full bg-white">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex flex-col"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  // Mobile View
  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden relative bg-white">
      {/* Top Header Bar with Brand, Profile, Library & Live Status */}
      <TopBar 
        onOpenProfile={() => navigate('/user/profile')}
        onOpenLibrary={() => navigate('/user/library')}
      />

      {/* Scrollable Middle Content — takes exactly remaining space above BottomNav */}
      <main className="flex-1 min-h-0 w-full overflow-hidden relative bg-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="w-full h-full flex flex-col overflow-hidden"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

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
                  <span style={{ color: '#E9BA26', fontWeight: '700' }}>📹 Processing Report:</span>
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
                  color: report.status === 'PUBLIC_APPROVED' ? '#22c55e' : (report.status === 'REPORTED_SUSPICIOUS' ? '#ff3b30' : '#E9BA26'),
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
      <div style={{ display: 'flex', height: '100dvh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', width: '100vw' }}>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #E9BA26', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
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
        <div className="flex flex-col items-center justify-center h-full p-8 gap-4 bg-white">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-2xl">⚠️</div>
          <h3 className="text-sm font-black text-ink uppercase tracking-wider">Profile Error</h3>
          <p className="text-xs text-ink-soft text-center">Something went wrong loading your profile.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-6 py-2.5 bg-amber-400 text-black text-xs font-black rounded-full"
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
    <div className="flex flex-col h-full w-full md:max-w-none max-w-md mx-auto overflow-hidden relative bg-white">
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

    // 2. Save the report via the single shared creation path
    await createReport({ ...newReport, source: newReport.source || REPORT_SOURCES.CAMERA });

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

  // Community escalation: at this many upvotes, an approved feed post is
  // AI-checked and flagged to its department (escalation on the SAME row —
  // never a second report; the single-insert invariant stays intact).
  const COMMUNITY_ESCALATION_THRESHOLD = 5;

  const handleUpvoteReport = async (reportId) => {
    let liked = false;
    let nextUpvotes = 0;
    let target = null;

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
          target = { ...r, upvotes: nextUpvotes };
          return target;
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

    // Threshold crossed on an approved, not-yet-escalated post → AI
    // reportability check (real classifier, keyword fallback inside
    // routeReport) → flag the existing row for department attention.
    if (
      liked && target &&
      nextUpvotes >= COMMUNITY_ESCALATION_THRESHOLD &&
      !target.escalationRequired &&
      target.status === VIDEO_STATUS.PUBLIC_APPROVED
    ) {
      try {
        const routed = await routeReport(target.title, target.description, target.category);
        const priorityRank = { CRITICAL: 3, HIGH: 2, NORMAL: 1, LOW: 0 };
        const current = priorityRank[target.routingPriority] ?? 1;
        const upgraded = Math.max(current, priorityRank[routed?.priority] ?? 0, priorityRank.HIGH);
        const newPriority = Object.keys(priorityRank).find(k => priorityRank[k] === upgraded) || 'HIGH';
        const escalationNote = `Community-escalated: ${nextUpvotes} upvotes. ${routed?.routing_reason || ''}`.trim();

        setUserReports((prev) =>
          prev.map((r) => r.id === reportId
            ? { ...r, escalationRequired: true, routingPriority: newPriority, routingReason: escalationNote }
            : r)
        );
        const { error } = await supabase
          .from('citizen_reports')
          .update({
            escalation_required: true,
            routing_priority: newPriority,
            routing_reason: escalationNote,
            routed_department: routed?.department || target.routedDepartment || null
          })
          .eq('id', reportId);
        if (error) {
          console.error('[ESCALATION] Sync failed:', error.message);
        } else {
          console.log(`[ESCALATION] Report ${reportId} community-escalated at ${nextUpvotes} upvotes → ${routed?.department || target.routedDepartment} (${newPriority})`);
        }
      } catch (err) {
        console.error('[ESCALATION] Community escalation failed:', err);
      }
    }
  };

  const handleReportVideo = async (videoId) => {
    let flaggedReport = null;

    setUserReports((prev) => {
      return prev.map((r) => {
        if (r.id === videoId) {
          const nextFlags = (r.flagsCount || 0) + 1;
          const isSuspicious = nextFlags >= 2;

          let nextStatus = r.status;
          if (isSuspicious) {
            nextStatus = VIDEO_STATUS.REPORTED_SUSPICIOUS;
            flaggedReport = { ...r, flagsCount: nextFlags };
            console.log(`[MODERATION] Video ${videoId} flagged as fake ${nextFlags} times. Re-running real forensic classification.`);
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

    // Threshold crossed: re-run the REAL deepfake classifier on the stored
    // video as an ADVISORY signal for the human moderator. The video stays
    // REPORTED_SUSPICIOUS (temp-removed from feed/map) until an admin decides
    // in the Content Moderation queue — AI never issues the final verdict on
    // community-flagged content.
    if (flaggedReport?.videoUrl) {
      const result = await reclassifyVideoUrl(flaggedReport.videoUrl);
      if (!result) return; // classifier unreachable — admin reviews without the advisory

      setUserReports((currentList) =>
        currentList.map((item) => {
          if (item.id === videoId) {
            return {
              ...item,
              aiVerdict: result.verdict,
              fakeProb: result.fake_probability,
              confidenceLevel: result.confidence_level,
              trustScore: result.trust_score ?? item.trustScore
            };
          }
          return item;
        })
      );

      try {
        await supabase
          .from('citizen_reports')
          .update({
            ai_verdict: result.verdict,
            fake_prob: result.fake_probability,
            confidence_level: result.confidence_level,
            trust_score: result.trust_score ?? null
          })
          .eq('id', videoId);
        console.log(`[MODERATION] Advisory AI verdict stored for ${videoId} (${result.verdict}) — awaiting human review.`);
      } catch (err) {
        console.error('[SUPABASE] Error syncing advisory verdict:', err);
      }
    }
  };

  return (
    <Routes>
      {/* Standalone User Login Screen (Default Root Route) */}
      <Route
        path="/"
        element={
          citizenToken ? (
            <Navigate to="/user/nayak" replace />
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
                    navigate('/user/nayak');
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
            onEnterCitizen={() => navigate(citizenToken ? '/user/nayak' : '/')}
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
        <Route index element={<Navigate to="/user/nayak" replace />} />
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
        <Route path="nayak" element={<AlertsChatView />} />
        <Route path="chat" element={<Navigate to="/user/nayak" replace />} />
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
            <div className="p-6 bg-amber-950 min-h-screen text-amber-50 flex flex-col gap-6 select-text">
              <div className="flex justify-between items-center border-b border-amber-800 pb-4">
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-wider">Super Admin God-Mode Overview</h2>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Platform Administration Console</span>
                </div>
                <button
                  onClick={handleOfficialLogout}
                  className="px-4 py-2 bg-amber-950 border border-amber-800 rounded-xl text-xs font-bold text-ink-faint hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              </div>
              <AdminView token={officialToken} user={officialUser} />
            </div>
          </RequirePoliceAuth>
        }
      />

      {/* Direct Nayak Short-Links */}
      <Route path="/nayak" element={<Navigate to="/user/nayak" replace />} />
      <Route path="/chat" element={<Navigate to="/user/nayak" replace />} />

      {/* Fallback to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
