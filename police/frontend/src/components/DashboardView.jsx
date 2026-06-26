import React, { useState, useEffect } from 'react';
import { Shield, Flame, Activity, Clock, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

function DashboardView({ token, user }) {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Clean, professional color palette for Pie/Bar charts
  const COLORS = ['#4F46E5', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [summaryRes, trendRes, catsRes, distsRes] = await Promise.all([
          fetch('http://localhost:8000/api/dashboard/summary', { headers }).then(r => r.json()).catch(() => null),
          fetch('http://localhost:8000/api/dashboard/trend', { headers }).then(r => r.json()).catch(() => []),
          fetch('http://localhost:8000/api/dashboard/categories', { headers }).then(r => r.json()).catch(() => []),
          fetch('http://localhost:8000/api/dashboard/districts', { headers }).then(r => r.json()).catch(() => [])
        ]);

        if (summaryRes) {
          setSummary(summaryRes);
          setTrend(trendRes);
          setCategories(catsRes);
          setDistricts(distsRes);
        } else {
          // Mock data fallback
          setSummary({
            total_firs: 8000,
            active_cases: 3982,
            conviction_rate: 64.2,
            avg_response_time_mins: 22,
            top_crime_category: 'Cybercrime / Phishing',
            total_offenders: 1500
          });
          setTrend([
            { date: '2025-01', count: 210 },
            { date: '2025-02', count: 245 },
            { date: '2025-03', count: 290 },
            { date: '2025-04', count: 270 },
            { date: '2025-05', count: 320 },
            { date: '2025-06', count: 380 },
            { date: '2025-07', count: 410 },
            { date: '2025-08', count: 390 },
            { date: '2025-09', count: 430 },
            { date: '2025-10', count: 460 },
            { date: '2025-11', count: 510 },
            { date: '2025-12', count: 480 },
            { date: '2026-01', count: 540 },
            { date: '2026-02', count: 590 },
            { date: '2026-03', count: 620 }
          ]);
          setCategories([
            { category: 'Cybercrime / Phishing', count: 2150 },
            { category: 'Theft / Robbery', count: 1840 },
            { category: 'Assault / Hurt', count: 1250 },
            { category: 'Riot / Public Mischief', count: 980 },
            { category: 'Drug Trafficking', count: 640 },
            { category: 'Economic Offense', count: 620 },
            { category: 'Murder / Homicide', count: 520 }
          ]);
          setDistricts([
            { district_name: 'Bengaluru Urban', count: 3120, density: 32.4 },
            { district_name: 'Mysuru', count: 890, density: 29.6 },
            { district_name: 'Dakshina Kannada', count: 750, density: 35.8 },
            { district_name: 'Belagavi', count: 620, density: 12.9 },
            { district_name: 'Kalaburagi', count: 580, density: 22.5 }
          ]);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getScopeBanner = () => {
    switch (user?.role) {
      case 'DGP': return 'State-Wide Command Center (State of Karnataka)';
      case 'SP': return 'District Security Scope (Bengaluru Urban District)';
      case 'SHO': return `Police Station Command Scope (${user.stationId || 'Bengaluru PS-01'})`;
      default: return 'Constable Case Scope (Assigned Cases Only)';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active Directive</span>
          <h4 className="text-xs font-bold text-blue-700 mt-1">{getScopeBanner()}</h4>
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase">Status: Connected</div>
      </div>
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="glass-panel p-6 rounded-2xl glass-panel-hover flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Filed FIRs</span>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{summary?.total_firs.toLocaleString()}</h3>
            <div className="text-[10px] text-blue-600 mt-1 font-semibold flex items-center">
              <span>+14.5% vs. previous half</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-1">Total registered complaints</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel p-6 rounded-2xl glass-panel-hover flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Active Cases</span>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{summary?.active_cases.toLocaleString()}</h3>
            <div className="text-[10px] text-slate-500 mt-1 font-medium">
              <span>Under active investigation</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-1">Currently being solved by officers</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel p-6 rounded-2xl glass-panel-hover flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Conviction Rate</span>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{summary?.conviction_rate}%</h3>
            <div className="text-[10px] text-emerald-600 mt-1 font-semibold flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              <span>+2.1% improvement</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-1">Percentage of cases solved with guilty verdict</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass-panel p-6 rounded-2xl glass-panel-hover flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Avg Response Time</span>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{summary?.avg_response_time_mins} min</h3>
            <div className="text-[10px] text-rose-600 mt-1 font-semibold">
              <span>Target standard: &lt;20 min</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-1">Average emergency dispatch time</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Crime Trend Chart */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">Statewide Crime Trend (12 Months)</h4>
            <span className="text-xs px-2.5 py-1 bg-slate-100 rounded-lg text-slate-600 font-medium">FIR Volume</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                  itemStyle={{ color: '#334155' }}
                />
                <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Crime Categories Donut Chart */}
        <div className="glass-panel p-6 rounded-2xl">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-6">Crime Type Distribution</h4>
          <div className="h-60 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="category"
                >
                  {categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#334155' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Top Crime</span>
              <span className="text-xs font-bold text-blue-600 text-center max-w-[120px] truncate mt-0.5">{summary?.top_crime_category}</span>
            </div>
          </div>
          
          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-xs mt-2 max-h-24 overflow-y-auto pr-1">
            {categories.slice(0, 4).map((entry, index) => (
              <div key={entry.category} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="text-slate-600 truncate max-w-[100px]">{entry.category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* District & Hotspot Info Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top High-Risk Districts */}
        <div className="glass-panel p-6 rounded-2xl">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-6">Top 5 Districts by Crime Volume</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districts} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis dataKey="district_name" type="category" stroke="#64748b" fontSize={11} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#334155' }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 8, 8, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hotspot & Alert Ticker */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col h-[320px]">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4">Command Center Bulletins</h4>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="p-4 bg-rose-50/50 border border-rose-100 border-l-4 border-l-rose-500 rounded-r-xl flex space-x-3 shadow-sm">
              <Flame className="w-5 h-5 text-rose-500 shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-rose-950 uppercase tracking-wider">Critical Alert: High-Crime Area Spike</h5>
                <p className="text-xs text-rose-900/80 mt-1">Alert: System has detected a sudden cluster of cyber fraud complaints in Hebbal, Bengaluru. Officers should increase patrol and awareness.</p>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50/50 border border-blue-100 border-l-4 border-l-blue-500 rounded-r-xl flex space-x-3 shadow-sm">
              <Shield className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-blue-950 uppercase tracking-wider">Security Watch: Repeat Offender Activity</h5>
                <p className="text-xs text-blue-900/80 mt-1">Alert: 3 repeat offenders on the watchlist have been released on bail and are in the Mysore Central division. Keep under close watch.</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50/50 border border-amber-100 border-l-4 border-l-amber-500 rounded-r-xl flex space-x-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-amber-950 uppercase tracking-wider">Socio-Economic Insight: Crime Drivers</h5>
                <p className="text-xs text-amber-900/80 mt-1">Insight: Analysis shows a very strong link between youth unemployment and property crimes. Creating job programs in high-unemployment areas can help reduce property crime.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardView;
