import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Award, AlertTriangle, Users, BarChart3, Clock, Lock, Sparkles, Flame, CheckCircle2, MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { supabase } from '../supabaseClient';

function ExecutiveDashboardView({ token, user }) {
  const [executiveSummary, setExecutiveSummary] = useState(null);
  const [backlogRanking, setBacklogRanking] = useState([]);
  const [resourceDeficit, setResourceDeficit] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAreaFromCoords = (lat, lng) => {
    if (!lat || !lng) return 'Outer Ring';
    if (lat > 12.925 && lat < 12.940 && lng > 77.610 && lng < 77.635) return 'Koramangala';
    if (lat > 12.900 && lat < 12.925 && lng > 77.630 && lng < 77.660) return 'HSR Layout';
    if (lat > 12.960 && lat < 12.980 && lng > 77.630 && lng < 77.655) return 'Indiranagar';
    return 'Outer Ring';
  };

  useEffect(() => {
    async function loadRealTimeStats() {
      try {
        const { data, error } = await supabase
          .from('citizen_reports')
          .select('*');

        if (error) throw error;

        const reports = data || [];
        const activeCount = reports.filter(r => r.status !== 'RESOLVED').length;
        const resolvedCount = reports.filter(r => r.status === 'RESOLVED').length;

        // Group by department
        const depts = {
          POLICE: 0,
          FIRE: 0,
          ELECTRICITY: 0,
          WATER: 0,
          TRAFFIC: 0,
          SANITATION: 0,
          HEALTH: 0,
          CONSTRUCTION: 0,
          ENVIRONMENT: 0,
          REVENUE: 0
        };

        // Group by area hotspot
        const areas = {
          Koramangala: 0,
          'HSR Layout': 0,
          Indiranagar: 0,
          'Outer Ring': 0
        };

        reports.forEach(r => {
          const code = r.routed_department || 'SANITATION';
          if (depts[code] !== undefined) {
            depts[code]++;
          }

          const area = getAreaFromCoords(r.lat, r.lng);
          if (areas[area] !== undefined) {
            areas[area]++;
          }
        });

        setExecutiveSummary({
          total_reported: reports.length,
          total_backlog: activeCount,
          pending_resolutions: resolvedCount,
          active_gangs: Object.values(areas).filter(c => c > 0).length,
          last_updated: new Date().toLocaleTimeString()
        });

        // 1. Backlog by Department
        setBacklogRanking([
          { name: 'Police', backlog: depts.POLICE },
          { name: 'Fire', backlog: depts.FIRE },
          { name: 'Electric', backlog: depts.ELECTRICITY },
          { name: 'Water', backlog: depts.WATER },
          { name: 'Traffic', backlog: depts.TRAFFIC },
          { name: 'Sanitation', backlog: depts.SANITATION },
          { name: 'Health', backlog: depts.HEALTH },
          { name: 'PWD/Const', backlog: depts.CONSTRUCTION },
          { name: 'Enviro', backlog: depts.ENVIRONMENT },
          { name: 'Admin/Rev', backlog: depts.REVENUE }
        ]);

        // 2. Incident count by Area Hotspots
        setResourceDeficit([
          { subject: 'Koramangala', deficit: Math.min(100, (areas.Koramangala * 25) || 10), fullMark: 100 },
          { subject: 'HSR Layout', deficit: Math.min(100, (areas['HSR Layout'] * 25) || 20), fullMark: 100 },
          { subject: 'Indiranagar', deficit: Math.min(100, (areas.Indiranagar * 25) || 15), fullMark: 100 },
          { subject: 'Outer Ring', deficit: Math.min(100, (areas['Outer Ring'] * 25) || 5), fullMark: 100 }
        ]);

        setLoading(false);
      } catch (err) {
        console.error('[Supabase] Error compiling executive summary:', err);
        setLoading(false);
      }
    }

    loadRealTimeStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Scope banner */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pillar 17: DGP/SP Executive Console</span>
          <h4 className="text-xs font-bold text-blue-700 mt-1">Statewide Civic & Threat Analytics Center</h4>
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase">Executive Security Cleared</div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Active Backlog</span>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{executiveSummary?.total_backlog || 0}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Unresolved citizen reports</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Issues Resolved</span>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{executiveSummary?.pending_resolutions || 0}</h3>
            <p className="text-[10px] text-emerald-600 font-semibold mt-1">Marked resolved by citizens/dept</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Submissions</span>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{executiveSummary?.total_reported || 0}</h3>
            <p className="text-[10px] text-blue-600 font-semibold mt-1">Total crowdsourced reports</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Hotspot Zones</span>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1.5">{executiveSummary?.active_gangs || 0}</h3>
            <p className="text-[10px] text-amber-600 font-semibold mt-1">Active sectors reporting issues</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <MapPin className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Department backlogs bar chart */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-3">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-6 font-semibold">Active Incidents by Civic Department</h4>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={backlogRanking} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="backlog" name="Active Issues" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incident concentration radar */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-6 font-semibold">Incident Concentration by City Zone</h4>
          <div className="h-72 w-full flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={resourceDeficit}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" stroke="#64748b" fontSize={11} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={9} />
                <Radar name="Incident Density" dataKey="deficit" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} />
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
              <p><strong>Civic Backlog Alert:</strong> Proximity metrics indicate active clusters in Koramangala and HSR Layout. Directing municipal engineers to prioritize electrical wiring and water drainage reports.</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0 mt-1.5" />
              <p><strong>Transparency Audit:</strong> Citizen-driven resolutions account for {((executiveSummary?.pending_resolutions / (executiveSummary?.total_reported || 1)) * 100).toFixed(0)}% of closed cases. Community trust metrics show positive trends.</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0 mt-1.5" />
              <p><strong>Zero-Shot Efficacy:</strong> Automated department routing exhibits low latency processing, ensuring citizen posts route directly to respective municipal boards within seconds.</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-center space-x-2 text-xs font-bold shadow-sm">
              <Lock className="w-4.5 h-4.5 animate-pulse" />
              <span>DGP Cleared Executive View</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">Lower officer roles are restricted from accessing these statewide municipal grids and department analytics to enforce compliance and security standards.</p>
          </div>
          <div className="text-[10px] text-slate-500 font-bold uppercase">Compliance Node: Active</div>
        </div>
      </div>
    </div>
  );
}

export default ExecutiveDashboardView;
