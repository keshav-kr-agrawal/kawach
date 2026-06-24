import React, { useState } from 'react';
import { BarChart3, Shield, Award, TrendingUp, Clock, UserCheck, Activity, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

function DistrictPerformanceView({ token, user }) {
  const [search, setSearch] = useState('');

  // Configured mock performance metrics per district
  const mockDistricts = [
    { name: "Bengaluru Urban", clearance: 78.4, response_time: 12.5, conviction: 68.2, resource_load: 86.5, patrol_score: 91.2 },
    { name: "Mysuru", clearance: 72.1, response_time: 18.2, conviction: 61.5, resource_load: 64.1, patrol_score: 79.5 },
    { name: "Dakshina Kannada", clearance: 82.5, response_time: 15.1, conviction: 74.0, resource_load: 72.8, patrol_score: 88.0 },
    { name: "Dharwad", clearance: 69.8, response_time: 21.4, conviction: 58.4, resource_load: 58.9, patrol_score: 72.1 },
    { name: "Belagavi", clearance: 64.2, response_time: 24.5, conviction: 52.1, resource_load: 51.2, patrol_score: 68.4 },
    { name: "Kalaburagi", clearance: 58.0, response_time: 28.1, conviction: 49.5, resource_load: 48.0, patrol_score: 61.0 },
    { name: "Shivamogga", clearance: 74.3, response_time: 19.8, conviction: 63.8, resource_load: 60.5, patrol_score: 82.3 }
  ];

  const filteredDistricts = mockDistricts.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  // Data formatted for Radar chart representing overall State performance index
  const stateIndexData = [
    { subject: 'Clearance', value: 71.3, fullMark: 100 },
    { subject: 'Response', value: 65.0, fullMark: 100 },
    { subject: 'Conviction', value: 59.8, fullMark: 100 },
    { subject: 'Workload', value: 81.2, fullMark: 100 },
    { subject: 'Patrolling', value: 77.5, fullMark: 100 }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Directives */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">State Executive Command</span>
          <h4 className="text-xs font-bold text-indigo-700 mt-1">District Performance Analytics Board (Karnataka SCRB)</h4>
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase">Updated: Live Sync</div>
      </div>

      {/* Overview Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Top Clearance District</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1.5">Dakshina Kannada</h3>
            <p className="text-[10px] text-emerald-600 font-semibold mt-1">82.5% Case Solved Ratio</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Fastest Response Dispatch</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1.5">Bengaluru Urban</h3>
            <p className="text-[10px] text-indigo-600 font-semibold mt-1">12.5 mins avg SLA</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">High Workload Stress</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1.5">Bengaluru Urban</h3>
            <p className="text-[10px] text-rose-600 font-semibold mt-1">86.5% Resource Stress Index</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">State Conviction Average</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1.5">61.1%</h3>
            <p className="text-[10px] text-slate-400 mt-1">Target benchmark: &gt;70%</p>
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
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">District Clearance vs. Conviction Indices</h4>
            <div className="flex items-center space-x-3 max-w-xs w-full lg:w-48">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search district..."
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
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
                <Bar dataKey="conviction" name="Conviction Rate (%)" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* State overall Radar Index */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-6">Overall State policing Index</h4>
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
                <th className="p-4 text-center">Avg Response Time</th>
                <th className="p-4 text-center">Case Clearance Rate</th>
                <th className="p-4 text-center">Conviction Rate</th>
                <th className="p-4 text-center">Patrol Score Index</th>
                <th className="p-4 text-center">Resource Load Stress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {filteredDistricts.map(d => (
                <tr key={d.name} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{d.name}</td>
                  <td className="p-4 text-center font-mono">{d.response_time} mins</td>
                  <td className="p-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600 font-bold">{d.clearance}%</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-600 font-bold">{d.conviction}%</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-lg border border-amber-100 bg-amber-50 text-amber-600 font-bold">{d.patrol_score} pts</span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-16 bg-slate-100 rounded-full h-1.5 shrink-0">
                        <div className={`h-1.5 rounded-full ${d.resource_load >= 80 ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${d.resource_load}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold w-10 text-right">{d.resource_load}%</span>
                    </div>
                  </td>
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
