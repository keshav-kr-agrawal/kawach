import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, LayoutDashboard, Map, Network, AlertTriangle, Users, BarChart3, LineChart, FileText, 
  ChevronRight, Bell, User, LogOut, Menu, X, Sparkles, FileSpreadsheet, Lock, Camera, Award, 
  Smartphone, Database 
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard, path: '/police/command' },
  { id: 'executive', label: 'Executive Dashboard', icon: LineChart, path: '/police/dashboard', minRole: 'SP' },
  { id: 'geomap', label: 'Crime Map', icon: Map, path: '/police/map' },
  { id: 'sentinel', label: 'Sentinel Safety Map', icon: Map, path: '/police/sentinel' },
  { id: 'sentinel-citizen', label: 'Sentinel Citizen App', icon: Smartphone, path: '/police/sentinel-citizen' },
  { id: 'departments', label: 'Civic Departments', icon: Shield, path: '/police/departments' },
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

export default function PoliceAppLayout({ user, onLogout, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filter items based on user role
  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (!item.minRole) return true;
    if (user?.role === 'DGP') return true;
    if (user?.role === 'SP' && item.minRole === 'SP') return true;
    if (user?.role === 'SHO' && item.minRole === 'SHO') return true;
    return false;
  });

  const activeTabId = NAV_ITEMS.find(item => location.pathname.startsWith(item.path))?.id || 'dashboard';

  return (
    <div className="flex h-full min-h-[100dvh] w-full overflow-hidden bg-slate-950 font-sans select-text relative">
      
      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/80 z-40 md:hidden backdrop-blur-xs transition-opacity duration-200"
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-50 md:hidden transition-transform duration-300 transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <img src="/kawach.png" alt="KAWACH Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-black text-blue-500 font-outfit uppercase tracking-wider">KAWACH</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTabId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group text-left ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/40'
                    : 'text-slate-400 hover:bg-slate-850 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'}`} />
                <span className="text-xs truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
              <User className="w-4 h-4 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-200 truncate uppercase tracking-wider">{user?.username}</h4>
              <p className="text-[10px] text-slate-400 truncate">{user?.role} Scope</p>
            </div>
          </div>
          <button
            onClick={() => {
              onLogout();
              setSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center space-x-2 px-3.5 py-2 bg-slate-900 hover:bg-rose-950 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 rounded-xl transition-colors text-xs font-bold text-slate-350"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar (Permanent) */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col z-20 shadow-lg h-full shrink-0">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-850">
          <img src="/kawach.png" alt="KAWACH Logo" className="w-8 h-8 object-contain" />
          <span className="text-xl font-black text-blue-500 font-outfit uppercase tracking-wider">KAWACH</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTabId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl transition-all duration-200 group text-left ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/40'
                    : 'text-slate-450 hover:bg-slate-850 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-white' : 'text-slate-450 group-hover:text-blue-500'}`} />
                <span className="text-xs truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-slate-200 truncate uppercase tracking-wider">{user?.username}</h4>
              <p className="text-[10px] text-slate-400 truncate">{user?.role} Scope</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-rose-950 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 rounded-xl transition-colors text-xs font-bold text-slate-350"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-slate-950 text-slate-100">
        
        {/* Top Header */}
        <header className="h-14 md:h-16 border-b border-slate-850 flex items-center justify-between px-4 md:px-6 bg-slate-900 z-10 shrink-0">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-1 hover:bg-slate-850 rounded-xl text-slate-400 md:hidden hover:text-blue-500 transition-colors shrink-0"
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-xs sm:text-sm font-bold text-slate-250 uppercase tracking-widest font-outfit truncate">
              {NAV_ITEMS.find(item => item.id === activeTabId)?.label || 'Dashboard'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
            <div className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[9px] font-bold text-blue-400 tracking-wide uppercase">
              {user?.role || 'OFFICER'} Node
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 md:hidden rounded-lg hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Main body content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-950 text-slate-100">
          {children}
        </div>
      </main>

    </div>
  );
}
