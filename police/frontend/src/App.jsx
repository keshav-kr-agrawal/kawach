import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  HashRouter, Routes, Route, Navigate, NavLink, useNavigate, useLocation,
} from 'react-router-dom';
import {
  ShieldMark, DeckGlyph, MapGlyph, GraphGlyph, SirenGlyph, CaseGlyph,
  ProfileGlyph, RadarGlyph, RupeeGlyph, SealGlyph, TerminalGlyph, WaveGlyph,
  TraceGlyph, MenuGlyph, CloseGlyph,
} from './ui/glyphs.jsx';
import { getBackendStatus, subscribeBackendStatus } from './api/status.js';
import LoginView from './views/LoginView.jsx';
import CommandView from './views/CommandView.jsx';
import HotspotsView from './views/HotspotsView.jsx';
import NetworkView from './views/NetworkView.jsx';
import AlertsView from './views/AlertsView.jsx';
import InvestigationsView from './views/InvestigationsView.jsx';
import OffendersView from './views/OffendersView.jsx';
import FraudShieldView from './views/FraudShieldView.jsx';
import DigitalArrestView from './views/DigitalArrestView.jsx';
import PredictiveView from './views/PredictiveView.jsx';
import DossierView from './views/DossierView.jsx';
import TerminalView from './views/TerminalView.jsx';
import IpTracingView from './views/IpTracingView.jsx';

// Added modules from zoho_master_plan
import AICopilotView from './views/AICopilotView.jsx';
import DistrictPerformanceView from './views/DistrictPerformanceView.jsx';
import SocioEconomicView from './views/SocioEconomicView.jsx';
import CCTVAnalyticsSimulator from './views/CCTVAnalyticsSimulator.jsx';
import FaceAnalyticsView from './views/FaceAnalyticsView.jsx';
import MobileFieldSimulatorView from './views/MobileFieldSimulatorView.jsx';
import IngestionExplorerView from './views/IngestionExplorerView.jsx';
import CounterfeitScannerView from './views/CounterfeitScannerView.jsx';

/**
 * Navigation register — grouped by operational story, gated by role.
 * SP-and-above sees strategic surfaces; every officer sees the field surfaces.
 */
const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { path: '/command', label: 'Command Deck', Glyph: DeckGlyph },
      { path: '/map', label: 'Hotspot Map', Glyph: MapGlyph },
      { path: '/alerts', label: 'Anomaly Alerts', Glyph: SirenGlyph },
      { path: '/investigations', label: 'Investigations', Glyph: CaseGlyph },
      { path: '/performance', label: 'District Performance', Glyph: RadarGlyph },
      { path: '/data-lake', label: 'Unified Data Lake', Glyph: TerminalGlyph },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { path: '/network', label: 'Fraud Network', Glyph: GraphGlyph, minRole: 'SP' },
      { path: '/offenders', label: 'Offender Registry', Glyph: ProfileGlyph },
      { path: '/copilot', label: 'AI Investigation Copilot', Glyph: SirenGlyph },
      { path: '/ip-tracing', label: 'IP Tracing', Glyph: TraceGlyph },
      { path: '/risk', label: 'District Risk', Glyph: RadarGlyph, minRole: 'SP' },
      { path: '/socioeconomic', label: 'Socioeconomic Correlation', Glyph: RadarGlyph },
      { path: '/terminal', label: 'Case Terminal', Glyph: TerminalGlyph },
    ],
  },
  {
    label: 'Digital Safety',
    items: [
      { path: '/fraud-shield', label: 'Fraud Shield', Glyph: RupeeGlyph },
      { path: '/live-monitor', label: 'Live Arrest Monitor', Glyph: WaveGlyph },
      { path: '/counterfeit-scanner', label: 'Counterfeit Scanner', Glyph: RupeeGlyph },
    ],
  },
  {
    label: 'Advanced AI & Field',
    items: [
      { path: '/cctv-analytics', label: 'CCTV Video Analytics', Glyph: WaveGlyph },
      { path: '/face-analytics', label: 'Facial Recognition', Glyph: ProfileGlyph },
      { path: '/field-simulator', label: 'Officer Field App', Glyph: SirenGlyph },
    ],
  },
  {
    label: 'Records',
    items: [
      { path: '/dossiers', label: 'Evidence Dossiers', Glyph: SealGlyph, minRole: 'SP' },
    ],
  },
];

function roleAllows(userRole, minRole) {
  if (!minRole) return true;
  if (userRole === 'DGP') return true;
  return userRole === minRole;
}

/** Data-link dot: green = live backend, red = simulation fallback. */
function LinkDot() {
  const status = useSyncExternalStore(subscribeBackendStatus, getBackendStatus);
  const color =
    status === 'live' ? '#16A34A' : status === 'offline' ? '#DC2626' : '#C9990F';
  const label =
    status === 'live' ? 'Data link: live backend'
    : status === 'offline' ? 'Data link: down — running local simulation'
    : 'Data link: connecting…';
  return (
    <span className="relative flex h-2.5 w-2.5 items-center justify-center" title={label} aria-label={label}>
      {status !== 'live' && (
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40"
          style={{ background: color }}
        />
      )}
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: color }} />
    </span>
  );
}

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-[0.68rem] tracking-tag text-amber-700 tabular-nums">
      {now
        .toLocaleString('en-IN', {
          day: '2-digit', month: 'short', hour: '2-digit',
          minute: '2-digit', second: '2-digit', hour12: false,
        })
        .toUpperCase()}
    </span>
  );
}

function SideNav({ user, onLogout, open, onClose }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-amber-950/30 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-amber-200 bg-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-amber-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <img src="/kawach.png" alt="KAWACH Logo" className="h-8 w-8 object-contain" />
            <div>
              <p className="font-display text-lg font-semibold tracking-wide text-ink">KAWACH</p>
              <p className="tag">Command Console</p>
            </div>
          </div>
          <button className="text-ink-faint hover:text-ink lg:hidden" onClick={onClose} aria-label="Close menu">
            <CloseGlyph className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((i) => roleAllows(user?.role, i.minRole));
            if (!items.length) return null;
            return (
              <div key={group.label}>
                <p className="tag mb-2 px-3">{group.label}</p>
                <div className="space-y-0.5">
                  {items.map(({ path, label, Glyph }) => (
                    <NavLink
                      key={path}
                      to={path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 rounded-ledger px-3 py-2.5 text-[0.8rem] font-medium transition ${
                          isActive
                            ? 'bg-amber-950 text-amber-50'
                            : 'text-ink-soft hover:bg-amber-50 hover:text-ink'
                        }`
                      }
                    >
                      <Glyph className="h-4 w-4 flex-none" />
                      {label}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-amber-100 px-6 py-4">
          <p className="font-mono text-[0.7rem] uppercase tracking-tag text-ink">{user?.username}</p>
          <p className="tag mt-0.5">{user?.role} scope</p>
          <button onClick={onLogout} className="btn-line mt-3 w-full">
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

function Console({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const current = useMemo(() => {
    for (const g of NAV_GROUPS)
      for (const i of g.items) if (location.pathname.startsWith(i.path)) return i;
    return null;
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-paper-warm">
      <SideNav user={user} onLogout={onLogout} open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 flex-none items-center justify-between border-b border-amber-200 bg-white px-5">
          <div className="flex items-center gap-3">
            <button
              className="text-ink-soft hover:text-ink lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <MenuGlyph className="h-5 w-5" />
            </button>
            <span className="tag">{current?.label || 'Console'}</span>
          </div>
          <div className="flex items-center gap-5">
            <Clock />
            <span className="chip chip-medium">{user?.role}</span>
            <LinkDot />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 py-8 md:px-10">
          <div className="mx-auto max-w-6xl">
            <Routes>
              <Route path="/command" element={<CommandView user={user} />} />
              <Route path="/map" element={<HotspotsView />} />
              <Route path="/alerts" element={<AlertsView />} />
              <Route path="/investigations" element={<InvestigationsView />} />
              <Route path="/performance" element={<DistrictPerformanceView user={user} />} />
              <Route path="/data-lake" element={<IngestionExplorerView user={user} />} />
              <Route path="/network" element={<NetworkView />} />
              <Route path="/offenders" element={<OffendersView />} />
              <Route path="/copilot" element={<AICopilotView user={user} />} />
              <Route path="/ip-tracing" element={<IpTracingView />} />
              <Route path="/risk" element={<PredictiveView />} />
              <Route path="/socioeconomic" element={<SocioEconomicView user={user} />} />
              <Route path="/terminal" element={<TerminalView />} />
              <Route path="/fraud-shield" element={<FraudShieldView />} />
              <Route path="/live-monitor" element={<DigitalArrestView />} />
              <Route path="/counterfeit-scanner" element={<CounterfeitScannerView user={user} />} />
              <Route path="/cctv-analytics" element={<CCTVAnalyticsSimulator user={user} />} />
              <Route path="/face-analytics" element={<FaceAnalyticsView user={user} />} />
              <Route path="/field-simulator" element={<MobileFieldSimulatorView user={user} />} />
              <Route path="/dossiers" element={<DossierView />} />
              <Route path="*" element={<Navigate to="/command" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('kawach_user'));
    } catch {
      return null;
    }
  });
  const navigate = useNavigate();

  const handleLogin = (session) => {
    localStorage.setItem('kawach_token', session.access_token);
    const u = {
      username: session.username,
      role: session.role,
      districtId: session.district_id,
      stationId: session.station_id,
    };
    localStorage.setItem('kawach_user', JSON.stringify(u));
    setUser(u);
    navigate('/command');
  };

  const handleLogout = () => {
    localStorage.removeItem('kawach_token');
    localStorage.removeItem('kawach_user');
    setUser(null);
    navigate('/login');
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/command" replace /> : <LoginView onLogin={handleLogin} />}
      />
      <Route
        path="/*"
        element={user ? <Console user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
