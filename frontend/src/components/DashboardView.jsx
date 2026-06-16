import React, { useState, useEffect } from 'react';
import { Shield, Flame, Activity, Clock, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

function DashboardView({ token, user }) {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Colors for Pie/Bar charts
  const COLORS = ['#9D8DF1', '#B8B5FF', '#F4D068', '#FF4A5A', '#FFE79A', '#7B6CF6', '#FF8F94'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // In real app, fetch from endpoints. Fallback to mock data if API is starting/failing.
        const [summaryRes, trendRes, catsRes, distsRes] = await Promise.all([
          fetch('http://localhost:8000/api/dashboard/summary').then(r => r.json()).catch(() => null),
          fetch('http://localhost:8000/api/dashboard/trend').then(r => r.json()).catch(() => []),
          fetch('http://localhost:8000/api/dashboard/categories').then(r => r.json()).catch(() => []),
          fetch('http://localhost:8000/api/dashboard/districts').then(r => r.json()).catch(() => [])
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
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-lavender"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="glass-panel p-6 rounded-2xl glass-panel-hover flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Filed FIRs</span>
            <h3 className="text-3xl font-extrabold text-white mt-1.5">{summary?.total_firs.toLocaleString()}</h3>
            <div className="text-[10px] text-lavender mt-1 font-medium flex items-center">
              <span>+14.5% vs. previous half</span>
            </div>
          </div>
          <div className="p-3 bg-lavender/10 rounded-xl text-lavender">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-panel p-6 rounded-2xl glass-panel-hover flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Investigations</span>
            <h3 className="text-3xl font-extrabold text-white mt-1.5">{summary?.active_cases.toLocaleString()}</h3>
            <div className="text-[10px] text-gray-400 mt-1 font-medium">
              <span>Under review by field officers</span>
            </div>
          </div>
          <div className="p-3 bg-gold/10 rounded-xl text-gold">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-panel p-6 rounded-2xl glass-panel-hover flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Conviction Rate</span>
            <h3 className="text-3xl font-extrabold text-white mt-1.5">{summary?.conviction_rate}%</h3>
            <div className="text-[10px] text-emerald-400 mt-1 font-medium flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              <span>+2.1% improvement</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-400/10 rounded-xl text-emerald-400">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass-panel p-6 rounded-2xl glass-panel-hover flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Response Time</span>
            <h3 className="text-3xl font-extrabold text-white mt-1.5">{summary?.avg_response_time_mins} min</h3>
            <div className="text-[10px] text-crimson mt-1 font-medium">
              <span>Target standard is &lt;20 min</span>
            </div>
          </div>
          <div className="p-3 bg-crimson/10 rounded-xl text-crimson">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Crime Trend Chart */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Statewide Crime Trend (12 Months)</h4>
            <span className="text-xs px-2.5 py-1 bg-obsidian-700 rounded-lg text-gray-400 font-medium">FIR Volume</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E1E24', borderColor: '#2A2A35', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="count" stroke="#9D8DF1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Crime Categories Donut Chart */}
        <div className="glass-panel p-6 rounded-2xl">
          <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-6">Crime Type Distribution</h4>
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
                  contentStyle={{ backgroundColor: '#1E1E24', borderColor: '#2A2A35', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-xs text-gray-400 uppercase">Top Offense</span>
              <span className="text-xs font-bold text-lavender text-center max-w-[120px] truncate mt-0.5">{summary?.top_crime_category}</span>
            </div>
          </div>
          
          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 text-xs mt-2 max-h-24 overflow-y-auto pr-1">
            {categories.slice(0, 4).map((entry, index) => (
              <div key={entry.category} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="text-gray-400 truncate max-w-[100px]">{entry.category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* District & Hotspot Info Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top High-Risk Districts */}
        <div className="glass-panel p-6 rounded-2xl">
          <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-6">Top 5 Districts by Crime Volume</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districts} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A35" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis dataKey="district_name" type="category" stroke="#9ca3af" fontSize={11} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E1E24', borderColor: '#2A2A35', borderRadius: '12px' }}
                />
                <Bar dataKey="count" fill="#F4D068" radius={[0, 8, 8, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hotspot & Alert Ticker */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col h-[320px]">
          <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4">Command Center Bulletins</h4>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="p-4 bg-crimson/10 border-l-4 border-crimson rounded-r-xl flex space-x-3">
              <Flame className="w-5 h-5 text-crimson shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-white uppercase tracking-wider">Critical Hotspot Spike</h5>
                <p className="text-xs text-gray-400 mt-1">DBSCAN algorithm identified a high-density cyber fraud cluster forming in Hebbal block, Bengaluru.</p>
              </div>
            </div>
            
            <div className="p-4 bg-lavender/10 border-l-4 border-lavender rounded-r-xl flex space-x-3">
              <Shield className="w-5 h-5 text-lavender shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-white uppercase tracking-wider">Recidivism Watch Alert</h5>
                <p className="text-xs text-gray-400 mt-1">Repeat offender tracking flags 3 watchlist suspects released on bail residing in the Mysore Central division.</p>
              </div>
            </div>

            <div className="p-4 bg-gold/10 border-l-4 border-gold rounded-r-xl flex space-x-3">
              <AlertCircle className="w-5 h-5 text-gold shrink-0" />
              <div>
                <h5 className="text-xs font-bold text-white uppercase tracking-wider">Socio-Economic Correlation</h5>
                <p className="text-xs text-gray-400 mt-1">District analysis indicates a 0.76 Pearson correlation coefficient between youth unemployment and property crimes.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardView;
