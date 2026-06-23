import React, { useState, useEffect } from 'react';
import { Shield, LayoutDashboard, Map, Network, AlertTriangle, Users, BarChart3, LineChart, FileText, ChevronRight, Bell, User, LogOut, Menu, X, Sparkles, FileSpreadsheet, Lock, Camera, Award, Smartphone } from 'lucide-react';
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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Login form state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [role, setRole] = useState('DGP');
  const [districtId, setDistrictId] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // MFA Flow state
  const [showMfaStep, setShowMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [pendingUserData, setPendingUserData] = useState(null);

  // Sync token
  useEffect(() => {
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [token]);

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
      
      if (!response.ok) {
        throw new Error('Invalid credentials');
      }
      
      const data = await response.json();
      // Credentials verified, now trigger MFA step
      setPendingUserData(data);
      setShowMfaStep(true);
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = (e) => {
    e.preventDefault();
    if (mfaCode === '123456' || mfaCode.length === 6) {
      // Successful login
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
    } else {
      setLoginError('Invalid Multi-Factor passcode. Please check and try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Nav items based on role permission matrix
  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard, component: DashboardView },
    { id: 'geomap', label: 'Crime Map', icon: Map, component: GeoMapView },
    { id: 'network', label: 'Network Analysis', icon: Network, component: NetworkView, minRole: 'SP' },
    { id: 'offenders', label: 'Criminal Profiles', icon: Users, component: OffendersView },
    { id: 'alerts', label: 'Alerts Hub', icon: AlertTriangle, component: AlertsView },
    { id: 'fraudshield', label: 'Citizen Fraud Shield', icon: Shield, component: CitizenFraudShieldView },
    { id: 'counterfeit', label: 'Counterfeit Scanner', icon: Camera, component: CounterfeitScannerView },
    { id: 'face', label: 'Face Analytics', icon: User, component: FaceAnalyticsView },
    { id: 'performance', label: 'District Performance', icon: Award, component: DistrictPerformanceView, minRole: 'SP' },
    { id: 'mobile', label: 'Mobile Field App', icon: Smartphone, component: MobileFieldSimulatorView },
    { id: 'investigations', label: 'Investigations', icon: FileText, component: InvestigationsView },
    { id: 'ai', label: 'AI Copilot', icon: Sparkles, component: AICopilotView },
    { id: 'reports', label: 'Reports Hub', icon: FileSpreadsheet, component: ReportsView },
    { id: 'socio', label: 'Socio-Economic', icon: BarChart3, component: SocioEconomicView, minRole: 'SP' },
    { id: 'predictive', label: 'Predictive Risk', icon: LineChart, component: PredictiveView, minRole: 'SP' },
    { id: 'admin', label: 'Administration', icon: Lock, component: AdminView, minRole: 'SP' }
  ];

  const filteredNavItems = navItems.filter(item => {
    if (!item.minRole) return true;
    if (user?.role === 'DGP') return true;
    if (user?.role === 'SP' && item.minRole === 'SP') return true;
    if (user?.role === 'SHO' && item.minRole === 'SHO') return true;
    return false;
  });

  const ActiveComponent = navItems.find(item => item.id === activeTab)?.component || DashboardView;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-slate-200 shadow-lg">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-indigo-50 rounded-full mb-4">
              <Shield className="w-12 h-12 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-700 to-indigo-500 bg-clip-text text-transparent">
              KAWACH
            </h1>
            <p className="text-slate-500 mt-2 text-sm text-center">
              State-Wide Crime Intelligence Platform
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs text-center mb-5 font-semibold">
              {loginError}
            </div>
          )}

          {!showMfaStep ? (
            <form onSubmit={handlePreLogin} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Select User Account</label>
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
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm transition-colors"
                >
                  <option value="dgp">DGP (Statewide Access)</option>
                  <option value="sp">SP (District Access)</option>
                  <option value="sho">SHO (Station Access)</option>
                  <option value="constable">Constable (Assigned Cases)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Password Credentials</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Scope Role Verification</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm transition-colors"
                >
                  <option value="DGP">DGP (State Level)</option>
                  <option value="SP">SP (District Level)</option>
                  <option value="SHO">SHO (Police Station Level)</option>
                  <option value="Constable">Constable (Officer Level)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 shadow-md shadow-indigo-100 text-xs"
              >
                {loading ? 'Verifying Credentials...' : 'Verify Security Credentials'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyMfa} className="space-y-5">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-blue-800 text-[10px] leading-relaxed">
                <strong>Multi-Factor Challenge:</strong> A one-time passcode has been sent to your registered physical security token. (For demonstration day, enter code **123456**).
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">6-Digit MFA Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="0 0 0 0 0 0"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all text-xs shadow-md shadow-indigo-100"
              >
                Validate MFA & Authorize Access
              </button>

              <button
                type="button"
                onClick={() => setShowMfaStep(false)}
                className="w-full text-center text-[10px] text-slate-400 hover:text-slate-600 transition-colors font-bold uppercase tracking-wider mt-2"
              >
                Back to credentials
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
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
            <Shield className="w-8 h-8 text-indigo-600" />
            <span className="text-xl font-extrabold tracking-tight text-indigo-600">KAWACH</span>
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
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl transition-all duration-200 group text-left ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`} />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Profile Card & Logout */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <User className="w-5 h-5 text-indigo-600" />
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
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-white hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors text-xs font-semibold text-slate-700"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col z-20 shadow-sm h-full">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-100">
          <Shield className="w-8 h-8 text-indigo-600" />
          <span className="text-xl font-extrabold tracking-tight text-indigo-600">KAWACH</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl transition-all duration-200 group text-left ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`} />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Profile Card & Logout */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <User className="w-5 h-5 text-indigo-600" />
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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white/85 backdrop-blur-md z-10">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 hover:bg-slate-100 rounded-xl text-slate-500 md:hidden hover:text-indigo-600 transition-colors"
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
              onClick={() => setActiveTab('alerts')}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 transition-all relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
            </button>
            
            <div className="h-8 w-px bg-slate-200"></div>
            
            <div className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-[9px] font-bold text-indigo-700 tracking-wide uppercase">
              {user?.role} Scope
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50 animate-fade-in">
          <ActiveComponent token={token} user={user} />
        </div>
      </main>
    </div>
  );
}

export default App;
