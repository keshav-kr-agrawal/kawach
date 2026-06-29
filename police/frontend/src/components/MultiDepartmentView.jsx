import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, Flame, Activity, ShieldAlert, CheckCircle, Navigation, Radio, RefreshCw, LogOut, FileText, ArrowRight, Play, Eye } from 'lucide-react';

const DEPARTMENTS = {
  POLICE: {
    id: 'POLICE',
    title: 'Police Department',
    icon: Shield,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10 border-blue-500/20',
    categories: ['Violence & Assault', 'Theft & Break-in', 'Suspicious Activity']
  },
  FIRE: {
    id: 'FIRE',
    title: 'Fire & Rescue',
    icon: Flame,
    colorClass: 'text-rose-500',
    bgClass: 'bg-rose-500/10 border-rose-500/20',
    categories: ['Fire & Smoke Hazard', 'Structural Collapse']
  },
  HEALTH: {
    id: 'HEALTH',
    title: 'Health & Ambulance',
    icon: Activity,
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10 border-emerald-500/20',
    categories: ['Medical Emergency', 'Road Accident']
  },
  DISASTER: {
    id: 'DISASTER',
    title: 'Disaster Management',
    icon: ShieldAlert,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10 border-amber-500/20',
    categories: ['Flooding & Water Log', 'Landslide & Blockage']
  }
};

const MOCK_REPORTS = [
  {
    id: 'm-dept-1',
    title: 'Bank Robbery & Vault Breach',
    description: 'Armed suspect broke into central ATM vault and fled on a red motorcycle. Captured on CCTV.',
    category: 'Theft & Break-in',
    status: 'DEPT_ROUTING',
    lat: 12.9348,
    lng: 77.6212,
    video_url: 'https://res.cloudinary.com/kijqhnss/video/upload/v1719602497/j99v3ykwxomvptqoxnvy.mp4',
    upvotes: 41,
    views: 120,
    timestamp: new Date(Date.now() - 1000 * 600).toISOString()
  },
  {
    id: 'm-dept-2',
    title: 'Street Fight & Assault',
    description: 'Aggressive group altercation occurring outside the food street market. Public safety hazard.',
    category: 'Violence & Assault',
    status: 'COHORT_TEST',
    lat: 12.9255,
    lng: 77.6288,
    video_url: 'https://res.cloudinary.com/kijqhnss/video/upload/v1719602497/j99v3ykwxomvptqoxnvy.mp4',
    upvotes: 18,
    views: 45,
    timestamp: new Date(Date.now() - 1000 * 1500).toISOString()
  },
  {
    id: 'm-dept-3',
    title: 'Transformer Fire & Sparking',
    description: 'Electric transformer caught fire on the poles near the residential sector. Severe smoke.',
    category: 'Fire & Smoke Hazard',
    status: 'DEPT_ROUTING',
    lat: 12.9298,
    lng: 77.6241,
    video_url: 'https://res.cloudinary.com/kijqhnss/video/upload/v1719602497/j99v3ykwxomvptqoxnvy.mp4',
    upvotes: 35,
    views: 190,
    timestamp: new Date(Date.now() - 1000 * 240).toISOString()
  },
  {
    id: 'm-dept-4',
    title: 'Motorcycle Collision with Pedestrian',
    description: 'A speeding motorcycle hit a pedestrian crossing the road. Victim has leg fractures and needs ambulance.',
    category: 'Road Accident',
    status: 'AI_CHECK_2',
    lat: 12.9312,
    lng: 77.6295,
    video_url: 'https://res.cloudinary.com/kijqhnss/video/upload/v1719602497/j99v3ykwxomvptqoxnvy.mp4',
    upvotes: 12,
    views: 64,
    timestamp: new Date(Date.now() - 1000 * 900).toISOString()
  },
  {
    id: 'm-dept-5',
    title: 'Severe Waterlogging & Overflow',
    description: 'Heavy rain caused drainage system blockage. Water depth is up to 2 feet on main junction.',
    category: 'Flooding & Water Log',
    status: 'DEPT_ROUTING',
    lat: 12.9212,
    lng: 77.6185,
    video_url: 'https://res.cloudinary.com/kijqhnss/video/upload/v1719602497/j99v3ykwxomvptqoxnvy.mp4',
    upvotes: 27,
    views: 89,
    timestamp: new Date(Date.now() - 1000 * 1800).toISOString()
  }
];

export default function MultiDepartmentView() {
  const [activeDept, setActiveDept] = useState('POLICE');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);
  const [dispatchStatus, setDispatchStatus] = useState({});

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('citizen_reports')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;

      // Merge user uploaded data with pre-seeded mock records to ensure a robust feed
      const databaseReports = data || [];
      const merged = [
        ...databaseReports,
        ...MOCK_REPORTS.filter(m => !databaseReports.some(d => d.id === m.id))
      ];
      setReports(merged);
    } catch (err) {
      console.warn('[Departments Console] Supabase error, fallback to mock dataset:', err.message);
      setReports(MOCK_REPORTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDispatch = (reportId) => {
    setDispatchStatus(prev => ({ ...prev, [reportId]: 'DISPATCHED' }));
    setTimeout(() => {
      setDispatchStatus(prev => ({ ...prev, [reportId]: 'ON_ROUTE' }));
    }, 3000);
  };

  const handleResolve = async (reportId) => {
    try {
      // 1. Optimistic local state update
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'RESOLVED' } : r));

      // 2. Suppress database updates for mock IDs
      if (reportId.startsWith('m-dept-')) return;

      const { error } = await supabase
        .from('citizen_reports')
        .update({ status: 'RESOLVED' })
        .eq('id', reportId);

      if (error) console.error('[Supabase Update] Fail:', error.message);
    } catch (err) {
      console.error('[Supabase Exception] Fail:', err);
    }
  };

  const deptConfig = DEPARTMENTS[activeDept];
  const DeptIcon = deptConfig.icon;

  // Filter video queue based on active department categories
  const filteredQueue = reports.filter(r => 
    deptConfig.categories.includes(r.category) && r.status !== 'RESOLVED'
  );

  const resolvedQueue = reports.filter(r => 
    deptConfig.categories.includes(r.category) && r.status === 'RESOLVED'
  );

  return (
    <div className="flex flex-col xl:flex-row gap-6 text-slate-100 select-text">
      
      {/* 1. Tactical Side Navigation for Departments */}
      <div className="w-full xl:w-72 flex flex-col gap-4 flex-shrink-0">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
            CIVIC DEPARTMENTS GATEWAY
          </h3>
          
          <div className="flex flex-col gap-2">
            {Object.values(DEPARTMENTS).map((dept) => {
              const IconComponent = dept.icon;
              const isActive = activeDept === dept.id;
              return (
                <button
                  key={dept.id}
                  onClick={() => {
                    setActiveDept(dept.id);
                    setActiveVideo(null);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border text-left transition-all ${
                    isActive 
                      ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-md shadow-blue-900/30' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className={`w-5 h-5 ${isActive ? 'text-white' : dept.colorClass}`} />
                    <span className="text-xs">{dept.title}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-blue-700 text-white' : 'bg-slate-900 text-slate-500'
                  }`}>
                    {reports.filter(r => dept.categories.includes(r.category) && r.status !== 'RESOLVED').length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live System Triage Status Info Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[8px] font-bold text-emerald-400 uppercase tracking-wider">
            <Radio className="w-2.5 h-2.5 animate-pulse" /> Live
          </div>
          
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-2">AI Dispatch Status</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
            All citizen reports are automatically scanned via Hugging Face zero-shot classification model endpoints. Verified media uploads trigger dynamic department routing matrices.
          </p>
        </div>
      </div>

      {/* 2. Main Dashboard & Data Ingest Table */}
      <div className="flex-1 flex flex-col gap-6">
        
        {/* Stat metrics summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Incoming Active Queue</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{filteredQueue.length}</span>
              <span className="text-xs text-slate-500 font-semibold">Reports Pending Action</span>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Resolved Reports</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{resolvedQueue.length}</span>
              <span className="text-xs text-slate-500 font-semibold">Cases Closed</span>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Department Scope</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl font-extrabold uppercase ${deptConfig.colorClass}`}>
                {activeDept}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Terminal</span>
            </div>
          </div>
        </div>

        {/* Video Player Segment if a video is actively focused */}
        {activeVideo && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col gap-4 animate-fade-in">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider block mb-0.5">CITIZEN VIDEO INTEL PREVIEW</span>
                <h4 className="text-sm font-extrabold text-white">{activeVideo.title}</h4>
              </div>
              <button 
                onClick={() => setActiveVideo(null)} 
                className="text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors uppercase tracking-wider"
              >
                Close Player
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-black border border-slate-800 shadow-inner">
                <video src={activeVideo.video_url} controls className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-[9px] px-2.5 py-0.5 bg-slate-800 rounded-full font-bold text-slate-300">
                    Category: {activeVideo.category}
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed font-semibold pt-1">
                    {activeVideo.description}
                  </p>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleDispatch(activeVideo.id)}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Dispatch Rescue Unit</span>
                  </button>
                  <button
                    onClick={() => {
                      handleResolve(activeVideo.id);
                      setActiveVideo(null);
                    }}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-750 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mark Resolved</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Incoming queue data table */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-lg">
          <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <DeptIcon className={`w-4 h-4 ${deptConfig.colorClass}`} />
                Incoming Citizen Video Queue
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Real-time crowdsourced reports classified under {activeDept} scope</p>
            </div>
            
            <button 
              onClick={fetchReports} 
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-xl text-slate-300 hover:text-white transition-all disabled:opacity-50"
              title="Refresh queue"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  <th className="p-4 pl-6">Report details</th>
                  <th className="p-4">Coordinates</th>
                  <th className="p-4">AI Category</th>
                  <th className="p-4">Dispatch Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-semibold bg-slate-900/30">
                      No pending incident dispatches in the {activeDept} queue.
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-850/30 transition-colors">
                      <td className="p-4 pl-6">
                        <span className="font-extrabold text-white block truncate max-w-[200px]">
                          {report.title || 'Live Incident'}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block max-w-[220px] mt-0.5">
                          {report.description}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[10px] text-slate-400">
                        {report.lat?.toFixed(4)}, {report.lng?.toFixed(4)}
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-0.5 bg-slate-950 border border-slate-800 rounded-full font-bold text-slate-300 text-[10px]">
                          {report.category}
                        </span>
                      </td>
                      <td className="p-4">
                        {dispatchStatus[report.id] ? (
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
                            dispatchStatus[report.id] === 'ON_ROUTE' 
                              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' 
                              : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                          }`}>
                            {dispatchStatus[report.id].replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-bold uppercase text-[9px]">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex gap-2 justify-end">
                          {report.video_url && (
                            <button
                              onClick={() => setActiveVideo(report)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-blue-400 transition-colors"
                              title="Play Video"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDispatch(report.id)}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] tracking-wider uppercase transition-colors"
                          >
                            Dispatch
                          </button>
                          <button
                            onClick={() => handleResolve(report.id)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg text-emerald-400 hover:text-emerald-300 transition-colors"
                            title="Resolve Case"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
