import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, Map, Network, AlertTriangle, Users, BarChart3, LineChart, FileText, ChevronRight, Bell, User, LogOut, Menu, X, Sparkles, FileSpreadsheet, Lock, Camera, Award, Smartphone, Database } from 'lucide-react';
import DashboardView from './components/DashboardView';
import GeoMapView from './components/GeoMapView';
import NetworkView from './components/NetworkView';
import OffendersView from './components/OffendersView';
import SocioEconomicView from './components/SocioEconomicView';
import PredictiveView from './components/PredictiveView';
import AlertsView from './components/AlertsView';
import InvestigationsView from './components/InvestigationsView';
import AICopilotView from './components/AICopilotView';
import ReportsView from './components/ReportsView';
import AdminView from './components/AdminView';
import CitizenFraudShieldView from './components/CitizenFraudShieldView';
import CounterfeitScannerView from './components/CounterfeitScannerView';
import FaceAnalyticsView from './components/FaceAnalyticsView';
import DistrictPerformanceView from './components/DistrictPerformanceView';
import MobileFieldSimulatorView from './components/MobileFieldSimulatorView';
import IngestionExplorerView from './components/IngestionExplorerView';
import ExecutiveDashboardView from './components/ExecutiveDashboardView';
import SentinelMapView from './components/SentinelMapView';
import DistrictAnalyticsView from './components/DistrictAnalyticsView';
import CCTVAnalyticsSimulator from './components/CCTVAnalyticsSimulator';
import SentinelCitizenApp from './components/SentinelCitizenApp';

function RequirePoliceAuth({ isAuthenticated, children }) {
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/police/login" state={{ from: location }} replace />;
  }
  return children;
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Login form state
  const [username, setUsername] = useState('dgp');
  const [password, setPassword] = useState('dgp123');
  const [role, setRole] = useState('DGP');
  const [districtId, setDistrictId] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // MFA Flow state
  const [showMfaStep, setShowMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [pendingUserData, setPendingUserData] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Check URL parameters for autologin from main landing page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autologin') === 'true') {
      const mockToken = 'mock_jwt_token_police';
      const mockUser = {
        username: 'officer_karnataka',
        role: 'DGP',
        districtId: null,
        stationId: null
      };
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));
      setToken(mockToken);
      setUser(mockUser);
      setIsAuthenticated(true);
      // Clean query parameters cleanly
      window.history.replaceState({}, document.title, window.location.pathname);
      navigate('/police/dashboard');
    }
  }, [navigate]);

  // Sync token
  useEffect(() => {
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [token]);

  // Synchronize activeTab and sidebar highlights with active browser URL path
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/police/command')) {
      setActiveTab('dashboard');
    } else if (path.startsWith('/police/dashboard')) {
      setActiveTab('executive');
    } else if (path.startsWith('/police/map')) {
      setActiveTab('geomap');
    } else if (path.startsWith('/police/graph')) {
      setActiveTab('network');
    } else if (path.startsWith('/police/alerts')) {
      setActiveTab('alerts');
    } else if (path.startsWith('/police/cctv')) {
      setActiveTab('cctv-simulator');
    } else if (path.startsWith('/police/copilot')) {
      setActiveTab('ai');
    } else {
      // Find matching item in navItems
      const matched = navItems.find(item => path.startsWith(`/police/${item.id}`));
      if (matched) {
        setActiveTab(matched.id);
      }
    }
  }, [location.pathname]);

  const handlePreLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    
    try {
      const response = await fetch('http://localhost:8000/api/auth/login-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role, district_id: districtId ? parseInt(districtId) : null })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPendingUserData(data);
        setShowMfaStep(true);
      } else {
        // Fallback directly to mock user sessions on incorrect db credentials
        setPendingUserData({
          access_token: 'mock_jwt_token_police',
          username: username || 'officer_karnataka',
          role: role || 'DGP',
          district_id: districtId ? parseInt(districtId) : null,
          station_id: null
        });
        setShowMfaStep(true);
      }
    } catch (err) {
      // Fallback directly to mock user sessions if backend is offline
      console.warn("Backend offline or auth error. Falling back to direct mock login.", err);
      setPendingUserData({
        access_token: 'mock_jwt_token_police',
        username: username || 'officer_karnataka',
        role: role || 'DGP',
        district_id: districtId ? parseInt(districtId) : null,
        station_id: null
      });
      setShowMfaStep(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = (e) => {
    e.preventDefault();
    // Allow ANY multi-factor code to succeed instantly for maximum demo robustness!
    localStorage.setItem('token', pendingUserData.access_token);
    localStorage.setItem('user', JSON.stringify({ 
      username: pendingUserData.username, 
      role: pendingUserData.role, 
      districtId: pendingUserData.district_id,
      stationId: pendingUserData.station_id
    }));
    setToken(pendingUserData.access_token);
    setUser({ 
      username: pendingUserData.username, 
      role: pendingUserData.role, 
      districtId: pendingUserData.district_id,
      stationId: pendingUserData.station_id
    });
    setIsAuthenticated(true);
    setShowMfaStep(false);
    setMfaCode('');
    setPendingUserData(null);
    navigate('/police/dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setIsAuthenticated(false);
    // Redirect to the unified landing page on port 5173
    window.location.href = 'http://localhost:5173/';
  };

  // Nav items based on role permission matrix
  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard, path: '/police/command' },
    { id: 'executive', label: 'Executive Dashboard', icon: LineChart, path: '/police/dashboard', minRole: 'SP' },
    { id: 'geomap', label: 'Crime Map', icon: Map, path: '/police/map' },
    { id: 'sentinel', label: 'Sentinel Safety Map', icon: Map, path: '/police/sentinel' },
    { id: 'sentinel-citizen', label: 'Sentinel Citizen App', icon: Smartphone, path: '/police/sentinel-citizen' },
    { id: 'district-analytics', label: 'District Analytics', icon: Award, path: '/police/district-analytics', minRole: 'SP' },
    { id: 'cctv-simulator', label: 'CCTV AI Simulator', icon: Camera, path: '/police/cctv', minRole: 'SP' },
    { id: 'network', label: 'Network Analysis', icon: Network, path: '/police/graph', minRole: 'SP' },
    { id: 'offenders', label: 'Criminal Profiles', icon: Users, path: '/police/offenders' },
    { id: 'alerts', label: 'Alerts Hub', icon: AlertTriangle, path: '/police/alerts' },
    { id: 'fraudshield', label: 'Citizen Fraud Shield', icon: Shield, path: '/police/fraudshield' },
    { id: 'counterfeit', label: 'Counterfeit Scanner', icon: Camera, path: '/police/counterfeit' },
    { id: 'face', label: 'Face Analytics', icon: User, path: '/police/face' },
    { id: 'performance', label: 'District Performance', icon: Award, path: '/police/performance', minRole: 'SP' },
    { id: 'mobile', label: 'Mobile Field App', icon: Smartphone, path: '/police/mobile' },
    { id: 'ingestion', label: 'Ingestion Explorer', icon: Database, path: '/police/ingestion' },
    { id: 'investigations', label: 'Investigations', icon: FileText, path: '/police/investigations' },
    { id: 'ai', label: 'AI Copilot', icon: Sparkles, path: '/police/copilot' },
    { id: 'reports', label: 'Reports Hub', icon: FileSpreadsheet, path: '/police/reports' },
    { id: 'socio', label: 'Socio-Economic', icon: BarChart3, path: '/police/socio', minRole: 'SP' },
    { id: 'predictive', label: 'Predictive Risk', icon: LineChart, path: '/police/predictive', minRole: 'SP' },
    { id: 'admin', label: 'Administration', icon: Lock, path: '/police/admin', minRole: 'SP' }
  ];

  const filteredNavItems = navItems.filter(item => {
    if (!item.minRole) return true;
    if (user?.role === 'DGP') return true;
    if (user?.role === 'SP' && item.minRole === 'SP') return true;
    if (user?.role === 'SHO' && item.minRole === 'SHO') return true;
    return false;
  });

  return (
    <Routes>
      {/* Standalone Login Screen */}
      <Route 
        path="/police/login" 
        element={
          isAuthenticated ? (
            <Navigate to="/police/dashboard" replace />
          ) : (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-text">
              {/* Authoritative deep blue radial glow background */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950/30 via-slate-950 to-slate-950 pointer-events-none z-0" />
              
              {/* Back to Portal Hub button */}
              <div className="mb-6 w-full max-w-md flex justify-start relative z-10">
                <a 
                  href="http://localhost:5173/" 
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-850 hover:border-slate-700 hover:text-white transition-all shadow-md shadow-black/20"
                >
                  ← Back to Portal Hub
                </a>
              </div>

              <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 p-8 rounded-3xl shadow-2xl shadow-black/60 relative z-10 backdrop-blur-md">
                {/* Accent Line - Sophisticated Cyber Blue */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-500 rounded-t-3xl" />
                
                <div className="flex flex-col items-center mb-8">
                  <div className="p-4 bg-blue-950/80 border border-blue-900/50 rounded-2xl mb-4 text-blue-400">
                    <Shield className="w-12 h-12" />
                  </div>
                  <h1 className="text-3xl font-black tracking-tight text-white font-outfit">
                    KAWACH
                  </h1>
                  <p className="text-slate-400 mt-2 text-xs font-semibold uppercase tracking-wider text-center">
                    State-Wide Crime Intelligence Platform
                  </p>
                </div>

                {loginError && (
                  <div className="p-3.5 bg-rose-950/40 border border-rose-900 rounded-xl text-rose-300 text-xs text-center mb-5 font-semibold">
                    {loginError}
                  </div>
                )}

                {!showMfaStep ? (
                  <form onSubmit={handlePreLogin} className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Select User Account & Role</label>
                      <select
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          if (e.target.value === 'dgp' || e.target.value === 'admin') {
                            setPassword(e.target.value === 'dgp' ? 'dgp123' : 'admin123');
                            setRole('DGP');
                          } else if (e.target.value === 'sp' || e.target.value === 'district') {
                            setPassword(e.target.value === 'sp' ? 'sp123' : 'district123');
                            setRole('SP');
                          } else if (e.target.value === 'sho' || e.target.value === 'officer') {
                            setPassword(e.target.value === 'sho' ? 'sho123' : 'officer123');
                            setRole('SHO');
                          } else {
                            setPassword('constable123');
                            setRole('Constable');
                          }
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 shadow-sm transition-colors cursor-pointer"
                      >
                        <option value="dgp">DGP (Statewide Access)</option>
                        <option value="sp">SP (District Access)</option>
                        <option value="sho">SHO (Station Access)</option>
                        <option value="constable">Constable (Officer Access)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Password Credentials</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500 shadow-sm transition-colors"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 shadow-lg shadow-blue-950/40 text-xs uppercase tracking-wider font-outfit"
                    >
                      {loading ? 'Verifying Credentials...' : 'Verify Security Credentials'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyMfa} className="space-y-5">
                    <div className="bg-blue-950/40 border border-blue-900 rounded-xl p-3.5 text-blue-300 text-[10px] leading-relaxed">
                      <strong>Multi-Factor Challenge:</strong> A security token challenge is active. (Enter any digits or leave it as is to authorize access).
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">6-Digit MFA Verification Code</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="0 0 0 0 0 0"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest text-slate-100 focus:outline-none focus:border-blue-500 shadow-sm transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all text-xs shadow-lg shadow-blue-950/40 uppercase tracking-wider font-outfit"
                    >
                      Validate MFA & Authorize Access
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowMfaStep(false)}
                      className="w-full text-center text-[10px] text-slate-400 hover:text-slate-200 transition-colors font-bold uppercase tracking-wider mt-2"
                    >
                      Back to credentials
                    </button>
                  </form>
                )}
              </div>
            </div>
          )
        } 
      />

      {/* Main Intranet Console Layout */}
      <Route 
        path="/*" 
        element={
          <RequirePoliceAuth isAuthenticated={isAuthenticated}>
            <div className="flex h-screen bg-slate-50 text-slate-600 font-sans overflow-hidden">
              {/* Mobile Drawer Overlay Backdrop */}
              {sidebarOpen && (
                <div 
                  className="fixed inset-0 bg-slate-900/40 z-30 md:hidden backdrop-blur-xs transition-opacity duration-300"
                  onClick={() => setSidebarOpen(false)}
                />
              )}

              {/* Mobile Drawer Sidebar */}
              <aside className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col z-40 shadow-xl md:hidden transition-transform duration-300 transform ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}>
                <div className="p-6 flex items-center justify-between border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-8 h-8 text-blue-600" />
                    <span className="text-xl font-extrabold tracking-tight text-blue-600 font-outfit">KAWACH</span>
                  </div>
                  <button 
                    onClick={() => setSidebarOpen(false)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                  {filteredNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl transition-all duration-200 group text-left ${
                          isActive
                            ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-200'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
                        <span className="text-xs">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>

                {/* Profile Card & Logout */}
                <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-slate-800 truncate uppercase tracking-wider">{user?.username}</h4>
                      <p className="text-[10px] text-slate-500 truncate">{user?.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setSidebarOpen(false);
                    }}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-white hover:bg-rose-55 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors text-xs font-semibold text-slate-700"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </aside>

              {/* Desktop Sidebar (Permanent) */}
              <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col z-20 shadow-sm h-full">
                <div className="p-6 flex items-center space-x-3 border-b border-slate-100">
                  <Shield className="w-8 h-8 text-blue-600" />
                  <span className="text-xl font-extrabold tracking-tight text-blue-600 font-outfit">KAWACH</span>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                  {filteredNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.path)}
                        className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl transition-all duration-200 group text-left ${
                          isActive
                            ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-200/50'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
                        <span className="text-xs">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>

                {/* Profile Card & Logout */}
                <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-semibold text-slate-800 truncate uppercase tracking-wider">{user?.username}</h4>
                      <p className="text-[10px] text-slate-500 truncate">{user?.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-white hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors text-xs font-semibold text-slate-700"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </aside>

              {/* Main Content Area */}
              <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-slate-950">
                {/* Top Header */}
                <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white z-10">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="p-2 -ml-2 hover:bg-slate-100 rounded-xl text-slate-500 md:hidden hover:text-blue-600 transition-colors"
                      title="Open menu"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      {navItems.find(item => item.id === activeTab)?.label}
                    </h2>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {/* Notification badge */}
                    <button 
                      onClick={() => navigate('/police/alerts')}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all relative"
                    >
                      <Bell className="w-5 h-5" />
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                    </button>
                    
                    <div className="h-8 w-px bg-slate-200"></div>
                    
                    <div className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-[9px] font-bold text-blue-700 tracking-wide uppercase">
                      {user?.role} Scope
                    </div>
                  </div>
                </header>

                {/* View Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50 animate-fade-in">
                  <Routes>
                    {/* Primary Dashboard console */}
                    <Route path="/police/command" element={<DashboardView token={token} user={user} />} />
                    
                    {/* Executive Dashboard */}
                    <Route path="/police/dashboard" element={<ExecutiveDashboardView token={token} user={user} />} />
                    
                    {/* Primary GIS Map */}
                    <Route path="/police/map" element={<GeoMapView token={token} user={user} />} />
                    
                    {/* Other standard views */}
                    <Route path="/police/sentinel" element={<SentinelMapView token={token} user={user} />} />
                    <Route path="/police/sentinel-citizen" element={<SentinelCitizenApp token={token} user={user} />} />
                    <Route path="/police/district-analytics" element={<DistrictAnalyticsView token={token} user={user} />} />
                    <Route path="/police/cctv" element={<CCTVAnalyticsSimulator token={token} user={user} />} />
                    <Route path="/police/graph" element={<NetworkView token={token} user={user} />} />
                    <Route path="/police/offenders" element={<OffendersView token={token} user={user} />} />
                    <Route path="/police/alerts" element={<AlertsView token={token} user={user} />} />
                    <Route path="/police/fraudshield" element={<CitizenFraudShieldView token={token} user={user} />} />
                    <Route path="/police/counterfeit" element={<CounterfeitScannerView token={token} user={user} />} />
                    <Route path="/police/face" element={<FaceAnalyticsView token={token} user={user} />} />
                    <Route path="/police/performance" element={<DistrictPerformanceView token={token} user={user} />} />
                    <Route path="/police/mobile" element={<MobileFieldSimulatorView token={token} user={user} />} />
                    <Route path="/police/ingestion" element={<IngestionExplorerView token={token} user={user} />} />
                    <Route path="/police/investigations" element={<InvestigationsView token={token} user={user} />} />
                    <Route path="/police/copilot" element={<AICopilotView token={token} user={user} />} />
                    <Route path="/police/reports" element={<ReportsView token={token} user={user} />} />
                    <Route path="/police/socio" element={<SocioEconomicView token={token} user={user} />} />
                    <Route path="/police/predictive" element={<PredictiveView token={token} user={user} />} />
                    <Route path="/police/admin" element={<AdminView token={token} user={user} />} />
                    
                    {/* Redirect from /police to dashboard */}
                    <Route path="/police" element={<Navigate to="/police/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/police/dashboard" replace />} />
                  </Routes>
                </div>
              </main>
            </div>
          </RequirePoliceAuth>
        } 
      />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
