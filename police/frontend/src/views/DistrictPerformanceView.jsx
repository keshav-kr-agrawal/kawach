import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, Shield, Award, TrendingUp, Clock, UserCheck, Activity, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { api } from '../api/client.js';

function DistrictPerformanceView({ token, user }) {
  const [search, setSearch] = useState('');
  const [clearanceData, setClearanceData] = useState([]);
  const [cycleTimeData, setCycleTimeData] = useState([]);
  const [kpis, setKpis] = useState({});

  useEffect(() => {
    api.get('/analytics/district').then((data) => {
      setClearanceData(data.clearance_data || []);
      setCycleTimeData(data.cycle_time_data || []);
      setKpis(data.kpis || {});
    });
  }, [token]);

  // Merge clearance + cycle-time by district name — both real, both
  // derived from FIRRecord rows (see routes/analytics.py get_district_performance).
  const districts = useMemo(() => {
    const cycleByName = Object.fromEntries(cycleTimeData.map((c) => [c.name, c.avg_days]));
    return clearanceData.map((c) => ({
      name: c.name,
      clearance: c.rate,
      cycle_days: cycleByName[c.name] ?? null,
      sample_size: c.sample_size,
    }));
  }, [clearanceData, cycleTimeData]);

  const filteredDistricts = districts.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const topClearance = districts.length
    ? districts.reduce((a, b) => (b.clearance > a.clearance ? b : a))
    : null;
  const fastestCycle = districts.filter(d => d.cycle_days != null).length
    ? districts.filter(d => d.cycle_days != null).reduce((a, b) => (b.cycle_days < a.cycle_days ? b : a))
    : null;

  // Data formatted for Radar chart — only metrics with a real DB source
  // (no conviction/court-outcome or patrol-GPS table exists in the schema).
  const stateIndexData = [
    { subject: 'Clearance', value: parseFloat(kpis.overall_clearance_rate) || 0, fullMark: 100 },
    { subject: 'SLA Met', value: parseFloat(kpis.sla_met_rate) || 0, fullMark: 100 },
    { subject: 'Cycle Speed', value: kpis.avg_investigation_cycle_days != null ? Math.max(0, 100 - kpis.avg_investigation_cycle_days * 2) : 0, fullMark: 100 },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Directives */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">State Executive Command</span>
          <h4 className="text-xs font-bold text-blue-700 mt-1">District Performance Analytics Board (Karnataka SCRB)</h4>
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase">Updated: Live Sync</div>
      </div>

      {/* Overview Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Top Clearance District</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1.5">{topClearance?.name || '—'}</h3>
            <p className="text-[10px] text-emerald-600 font-semibold mt-1">{topClearance ? `${topClearance.clearance}% case solved ratio` : 'No data'}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Fastest Investigation Cycle</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1.5">{fastestCycle?.name || '—'}</h3>
            <p className="text-[10px] text-blue-600 font-semibold mt-1">{fastestCycle ? `${fastestCycle.cycle_days}d filed → closed` : 'No data'}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">State SLA Met Rate</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1.5">{kpis.sla_met_rate || '—'}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Resolved before priority-tier deadline</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl text-slate-600">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* District rankings bar chart */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-3">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">District Clearance Rate</h4>
            <div className="flex items-center space-x-3 max-w-xs w-full lg:w-48">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search district..."
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredDistricts} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="clearance" name="Clearance Rate (%)" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* State overall Radar Index */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-6">Overall State Policing Index</h4>
          <div className="h-72 w-full flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stateIndexData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={11} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={9} />
                <Radar name="State Metric" dataKey="value" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed metrics listings board */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-6">District Performance Ledger</h4>
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
                <th className="p-4">District</th>
                <th className="p-4 text-center">Case Clearance Rate</th>
                <th className="p-4 text-center">Avg Investigation Cycle Time</th>
                <th className="p-4 text-center">FIR Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredDistricts.map(d => (
                <tr key={d.name} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{d.name}</td>
                  <td className="p-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-lg border border-blue-100 bg-blue-50 text-blue-600 font-bold">{d.clearance}%</span>
                  </td>
                  <td className="p-4 text-center font-mono">{d.cycle_days != null ? `${d.cycle_days}d` : 'N/A'}</td>
                  <td className="p-4 text-center font-mono text-slate-500">{d.sample_size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DistrictPerformanceView;
