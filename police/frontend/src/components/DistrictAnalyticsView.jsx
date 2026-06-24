import React, { useState, useEffect } from 'react';
import { Award, ShieldAlert, BarChart3, Clock, TrendingUp, Users, CheckCircle, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

function DistrictAnalyticsView({ token, user }) {
  const [loading, setLoading] = useState(true);
  const [clearanceData, setClearanceData] = useState([]);
  const [responseTimeData, setResponseTimeData] = useState([]);
  const [kpis, setKpis] = useState({
    conviction_rate: "71.4%",
    patrol_effectiveness: "86.8%",
    resource_utilization: "92.1%"
  });

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch('http://localhost:8000/api/analytics/district', { headers });
      const data = await res.json();
      setClearanceData(data.clearance_data);
      setResponseTimeData(data.response_time_data);
      setKpis(data.kpis);
    } catch (err) {
      console.error("Failed to fetch analytics metrics:", err);
      // Fallback
      setClearanceData([
        { name: 'Koramangala', rate: 78 },
        { name: 'Indiranagar', rate: 84 },
        { name: 'Jayanagar', rate: 72 },
        { name: 'Whitefield', rate: 65 },
        { name: 'HSR Layout', rate: 81 },
        { name: 'Malleshwaram', rate: 75 }
      ]);
      setResponseTimeData([
        { day: 'Day 1', time: 24.5 },
        { day: 'Day 5', time: 22.1 },
        { day: 'Day 10', time: 19.8 },
        { day: 'Day 15', time: 23.4 },
        { day: 'Day 20', time: 18.2 },
        { day: 'Day 25', time: 15.6 },
        { day: 'Day 30', time: 14.2 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title section */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pillar 15: District Performance Analytics</span>
          <h4 className="text-xs font-bold text-indigo-700 mt-1">SHO & SP Command KPI Workspace</h4>
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase">Operational Cleared</div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Conviction Rate */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">State Conviction Rate</span>
            <h3 className="text-2xl font-extrabold text-slate-900">{kpis.conviction_rate}</h3>
            <p className="text-[9px] text-emerald-600 font-bold flex items-center space-x-1">
              <span>+3.2% vs previous quarter</span>
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Patrol Effectiveness */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Patrol Effectiveness Index</span>
            <h3 className="text-2xl font-extrabold text-slate-900">{kpis.patrol_effectiveness}</h3>
            <p className="text-[9px] text-indigo-600 font-bold flex items-center space-x-1">
              <span>Optimized beat distribution</span>
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Resource Utilization */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Resource Utilization</span>
            <h3 className="text-2xl font-extrabold text-slate-900">{kpis.resource_utilization}</h3>
            <p className="text-[9px] text-slate-500 font-bold flex items-center space-x-1">
              <span>patrol cars active in district zones</span>
            </p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Recharts Graphics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clearance rate bar chart */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center space-x-2.5 mb-5">
            <BarChart3 className="w-4.5 h-4.5 text-indigo-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Clearance Rate by Police Station</h4>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clearanceData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                <Bar dataKey="rate" name="Clearance Rate (%)" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Response time line chart */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center space-x-2.5 mb-5">
            <Clock className="w-4.5 h-4.5 text-indigo-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Average Response Time (Last 30 Days)</h4>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={responseTimeData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                <Line type="monotone" dataKey="time" name="Avg Response Time (mins)" stroke="#10B981" strokeWidth={2.5} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Analytics context warning */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start space-x-3 text-xs">
        <ShieldAlert className="w-4.5 h-4.5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <h6 className="font-bold text-blue-950 uppercase tracking-wider text-[10px]">Data Disclaimer & SLA Targets</h6>
          <p className="text-blue-900/80 mt-1 leading-relaxed text-[11px]">
            Response speed goals are locked at under 15 minutes for urban clusters and under 25 minutes for rural patrols. Underperforming stations are highlighted on the DGP command sync weekly scorecard.
          </p>
        </div>
      </div>
    </div>
  );
}

export default DistrictAnalyticsView;
