import React, { useState, useEffect } from 'react';
import { Shield, LayoutDashboard, Map, Network, AlertTriangle, Users, BarChart3, LineChart, FileText, ChevronRight, Bell, User, LogOut } from 'lucide-react';
import DashboardView from './components/DashboardView';
import GeoMapView from './components/GeoMapView';
import NetworkView from './components/NetworkView';
import OffendersView from './components/OffendersView';
import SocioEconomicView from './components/SocioEconomicView';
import PredictiveView from './components/PredictiveView';
import AlertsView from './components/AlertsView';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Login form state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [role, setRole] = useState('State Admin');
  const [districtId, setDistrictId] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync token
  useEffect(() => {
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [token]);

  const handleLogin = async (e) => {
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
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify({ username: data.username, role: data.role, districtId: data.district_id }));
      setToken(data.access_token);
      setUser({ username: data.username, role: data.role, districtId: data.district_id });
      setIsAuthenticated(true);
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Nav items based on role (Field Officer can't access Network graph)
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, component: DashboardView },
    { id: 'geomap', label: 'Geospatial Map', icon: Map, component: GeoMapView },
    { id: 'network', label: 'Criminal Network', icon: Network, component: NetworkView, minRole: 'District Head' },
    { id: 'offenders', label: 'Repeat Offenders', icon: Users, component: OffendersView },
    { id: 'socio', label: 'Socio-Economic', icon: BarChart3, component: SocioEconomicView },
    { id: 'predictive', label: 'Predictive Risk', icon: LineChart, component: PredictiveView },
    { id: 'alerts', label: 'Spike Alerts', icon: AlertTriangle, component: AlertsView }
  ];

  const filteredNavItems = navItems.filter(item => {
    if (!item.minRole) return true;
    if (user?.role === 'State Admin') return true;
    if (user?.role === 'District Head' && item.minRole === 'District Head') return true;
    return false;
  });

  const ActiveComponent = navItems.find(item => item.id === activeTab)?.component || DashboardView;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-obsidian-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-panel p-8 rounded-2xl glow-border">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-lavender/10 rounded-full mb-4">
              <Shield className="w-12 h-12 text-lavender" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-lavender-light to-lavender bg-clip-text text-transparent">
              KAWACH
            </h1>
            <p className="text-gray-400 mt-2 text-sm text-center">
              AI-Driven Crime Analytics & Command Platform
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {loginError && (
              <div className="p-3 bg-crimson/10 border border-crimson/30 rounded-lg text-crimson text-sm text-center">
                {loginError}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Username</label>
              <select
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  // Auto-fill password for ease of testing on Demo Day
                  if (e.target.value === 'admin') {
                    setPassword('admin123');
                    setRole('State Admin');
                  } else if (e.target.value === 'district') {
                    setPassword('district123');
                    setRole('District Head');
                  } else {
                    setPassword('officer123');
                    setRole('Field Officer');
                  }
                }}
                className="w-full bg-obsidian-700 border border-obsidian-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lavender transition-colors"
              >
                <option value="admin">admin (State Admin)</option>
                <option value="district">district (District Head)</option>
                <option value="officer">officer (Field Officer)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-obsidian-700 border border-obsidian-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lavender transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Demo Role Assignment</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-obsidian-700 border border-obsidian-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lavender transition-colors"
              >
                <option value="State Admin">State Admin (Full Access)</option>
                <option value="District Head">District Head (District Scope)</option>
                <option value="Field Officer">Field Officer (Station Scope)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-lavender to-lavender-dark text-obsidian-900 font-bold py-3.5 px-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-lavender/20"
            >
              {loading ? 'Authenticating...' : 'Access Command Center'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-obsidian-900 text-gray-300 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-obsidian-800 border-r border-obsidian-700 flex flex-col z-20">
        <div className="p-6 flex items-center space-x-3 border-b border-obsidian-700">
          <Shield className="w-8 h-8 text-lavender" />
          <span className="text-xl font-extrabold tracking-tight text-white glow-text-lavender">KAWACH</span>
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
                    ? 'bg-lavender text-obsidian-900 font-semibold shadow-md shadow-lavender/10'
                    : 'text-gray-400 hover:bg-obsidian-700/50 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-obsidian-900' : 'text-gray-400 group-hover:text-lavender'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Profile Card & Logout */}
        <div className="p-4 border-t border-obsidian-700 bg-obsidian-850/50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-obsidian-700 rounded-lg">
              <User className="w-5 h-5 text-lavender" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-semibold text-white truncate uppercase tracking-wider">{user?.username}</h4>
              <p className="text-[10px] text-gray-400 truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-obsidian-700 hover:bg-crimson/10 hover:text-crimson border border-obsidian-600 hover:border-crimson/30 rounded-xl transition-colors text-xs font-semibold text-gray-300"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 border-b border-obsidian-700 flex items-center justify-between px-8 bg-obsidian-900/50 backdrop-blur-md z-10">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              {navItems.find(item => item.id === activeTab)?.label}
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notification badge */}
            <button 
              onClick={() => setActiveTab('alerts')}
              className="p-2 hover:bg-obsidian-800 rounded-xl text-gray-400 hover:text-lavender transition-all relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-crimson rounded-full animate-ping"></span>
            </button>
            
            <div className="h-8 w-px bg-obsidian-700"></div>
            
            <div className="px-3.5 py-1.5 bg-lavender/10 border border-lavender/25 rounded-full text-xs font-semibold text-lavender tracking-wide uppercase">
              {user?.role} Scope
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-obsidian-900/80">
          <ActiveComponent token={token} user={user} />
        </div>
      </main>
    </div>
  );
}

export default App;
