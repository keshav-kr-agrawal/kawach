import React, { useState, useEffect } from 'react';
import { Award, ShieldAlert, BarChart3, Clock, TrendingUp, Users, CheckCircle, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api/client.js';

function DistrictAnalyticsView({ token, user }) {
  const [loading, setLoading] = useState(true);
  const [clearanceData, setClearanceData] = useState([]);
  const [cycleTimeData, setCycleTimeData] = useState([]);
  const [sampleSize, setSampleSize] = useState(0);
  const [kpis, setKpis] = useState({
    overall_clearance_rate: '—',
    avg_investigation_cycle_days: null,
    sla_met_rate: '—'
  });

  const fetchMetrics = async () => {
    setLoading(true);
    const data = await api.get('/analytics/district');
    setClearanceData(data.clearance_data || []);
    setCycleTimeData(data.cycle_time_data || []);
    setKpis(data.kpis || {});
    setSampleSize(data.sample_size || 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchMetrics();
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title section */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pillar 15: District Performance Analytics</span>
          <h4 className="text-xs font-bold text-blue-700 mt-1">SHO & SP Command KPI Workspace</h4>
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase">n={sampleSize} FIRs</div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Clearance rate */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overall Clearance Rate</span>
            <h3 className="text-2xl font-extrabold text-slate-900">{kpis.overall_clearance_rate}</h3>
            <p className="text-[9px] text-emerald-600 font-bold flex items-center space-x-1">
              <span>Charge-sheeted + closed / total FIRs</span>
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Avg investigation cycle time */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Investigation Cycle Time</span>
            <h3 className="text-2xl font-extrabold text-slate-900">{kpis.avg_investigation_cycle_days != null ? `${kpis.avg_investigation_cycle_days}d` : 'N/A'}</h3>
            <p className="text-[9px] text-blue-600 font-bold flex items-center space-x-1">
              <span>Filed → last timeline event, cleared cases only</span>
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* SLA met rate */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SLA Met Rate</span>
            <h3 className="text-2xl font-extrabold text-slate-900">{kpis.sla_met_rate}</h3>
            <p className="text-[9px] text-slate-500 font-bold flex items-center space-x-1">
              <span>Resolved before priority-tier sla_deadline</span>
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
            <BarChart3 className="w-4.5 h-4.5 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Clearance Rate by District</h4>
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

        {/* Investigation cycle time by district */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center space-x-2.5 mb-5">
            <Clock className="w-4.5 h-4.5 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Avg Investigation Cycle Time by District</h4>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cycleTimeData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                <Bar dataKey="avg_days" name="Avg Cycle Time (days)" fill="#10B981" radius={[4, 4, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Analytics context warning */}
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start space-x-3 text-xs">
        <ShieldAlert className="w-4.5 h-4.5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <h6 className="font-bold text-blue-950 uppercase tracking-wider text-[10px]">Data Disclaimer</h6>
          <p className="text-blue-900/80 mt-1 leading-relaxed text-[11px]">
            All metrics above are computed directly from FIRRecord status/timeline rows — no conviction, patrol-GPS, or court-outcome table exists in the schema yet, so those figures are intentionally not shown rather than fabricated.
          </p>
        </div>
      </div>
    </div>
  );
}

export default DistrictAnalyticsView;
