import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Award, AlertTriangle, Users, BarChart3, Clock, Lock, Sparkles, Flame, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

function ExecutiveDashboardView({ token, user }) {
  const [executiveSummary, setExecutiveSummary] = useState(null);
  const [backlogRanking, setBacklogRanking] = useState([]);
  const [resourceDeficit, setResourceDeficit] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching executive statistics (DGP / State level analytics)
    setTimeout(() => {
      setExecutiveSummary({
        total_backlog: 3982,
        pending_resolutions: 3,
        allocation_deficit: 145,
        active_gangs: 9,
        last_updated: new Date().toLocaleTimeString()
      });
      setBacklogRanking([
        { name: 'Bengaluru Urban', backlog: 1840 },
        { name: 'Mysuru', count: 480, backlog: 520 },
        { name: 'Dakshina Kannada', backlog: 410 },
        { name: 'Belagavi', backlog: 380 },
        { name: 'Kalaburagi', backlog: 340 }
      ]);
      setResourceDeficit([
        { subject: 'Central Zone', deficit: 45, fullMark: 100 },
        { subject: 'Western Range', deficit: 60, fullMark: 100 },
        { subject: 'Northern Range', deficit: 80, fullMark: 100 },
        { subject: 'Southern Range', deficit: 35, fullMark: 100 },
        { subject: 'Eastern Zone', deficit: 50, fullMark: 100 }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Scope banner */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pillar 17: DGP/SP Executive Console</span>
          <h4 className="text-xs font-bold text-indigo-700 mt-1">Statewide Crime & Resource Command Platform</h4>
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase">Executive Security Cleared</div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">State Case Backlog</span>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{executiveSummary?.total_backlog.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Cases in active investigation</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Officer Deficit Ratio</span>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">+{executiveSummary?.allocation_deficit}</h3>
            <p className="text-[10px] text-rose-600 font-semibold mt-1">Unassigned beat vacancies</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Active Gang Syndicates</span>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{executiveSummary?.active_gangs}</h3>
            <p className="text-[10px] text-amber-600 font-semibold mt-1">Monitored link analysis nodes</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Pending Match Reviews</span>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{executiveSummary?.pending_resolutions}</h3>
            <p className="text-[10px] text-indigo-600 font-semibold mt-1">Duplicates awaiting validation</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* District backlogs bar chart */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-6 font-semibold">Statewide Investigation Backlog by District</h4>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={backlogRanking} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="backlog" name="Backlog (cases)" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Officer allocation gaps radar */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-6 font-semibold font-bold">Officer Deficit Index by Range Zone</h4>
          <div className="h-72 w-full flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={resourceDeficit}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={11} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={9} />
                <Radar name="Deficit Score" dataKey="deficit" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* State Directives and emerging threat bulletins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4 font-semibold">AI Executive Synthesis & Threat Briefing</h4>
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3.5 text-xs text-slate-600 leading-relaxed font-semibold">
            <div className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full shrink-0 mt-1.5" />
              <p><strong>District Backlog Warning:</strong> Bengaluru Urban shows a 24.8% increase in unresolved cyber fraud files. Immediate reassignment of 15 case inspectors is advised.</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0 mt-1.5" />
              <p><strong>Syndicate Alert:</strong> KGF Syndicate nodes show high co-location calls with phone numbers registered in coastal warehouses. Monitor smuggling routes.</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 mt-1.5" />
              <p><strong>Patrol Efficacy:</strong> Resource redistribution in Mysuru has successfully improved average emergency response times by 3.2 minutes.</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-center space-x-2 text-xs font-bold shadow-sm">
              <Lock className="w-4.5 h-4.5 animate-pulse" />
              <span>DGP Cleared Executive View</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">Lower officer roles (Constable, SHO) are restricted from accessing these statewide backlog leaderboards and resource deficit indexes to enforce data governance standards.</p>
          </div>
          <div className="text-[10px] text-slate-500 font-bold uppercase">Compliance Node: Active</div>
        </div>
      </div>
    </div>
  );
}

export default ExecutiveDashboardView;
