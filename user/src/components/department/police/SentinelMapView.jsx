import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, MapPin, Camera, Video, AlertTriangle, RefreshCw, FileText, CheckCircle, Activity, Globe } from 'lucide-react';

function SentinelMapView({ token, user }) {
  const [viewMode, setViewMode] = useState('citizen'); // 'citizen' or 'police'
  const [newsPins, setNewsPins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Simulated citizen uploads
  const [uploads, setUploads] = useState([
    {
      id: "UPL-9821",
      threat_score: 87,
      category: "Violence",
      location: "Indiranagar Met Station",
      timestamp: "5 mins ago",
      ghost_mode: true,
      exif_locked: true,
      trust_score: 95,
      description: "Coordinated altercation between 4 youths near the entrance ticket counter."
    },
    {
      id: "UPL-1022",
      threat_score: 42,
      category: "Traffic Violation",
      location: "Richmond Circle Flyover",
      timestamp: "12 mins ago",
      ghost_mode: false,
      exif_locked: true,
      trust_score: 88,
      description: "Two motorbikes racing in opposite direction lanes of flyover exit."
    }
  ]);

  const [newIncidentText, setNewIncidentText] = useState('');
  const [reporting, setReporting] = useState(false);
  const [successReportMsg, setSuccessReportMsg] = useState('');

  const fetchNewsPins = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('http://localhost:8000/api/osint/news-pins', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load OSINT news streams');
      const data = await res.json();
      setNewsPins(data);
    } catch (err) {
      setErrorMsg(err.message || 'Error loading OSINT map layers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsPins();
  }, [token]);

  const handleCreateReport = (e) => {
    e.preventDefault();
    if (!newIncidentText.trim()) return;

    setReporting(true);
    setSuccessReportMsg('');

    // Simulate proof of location EXIF lock parsing & upload
    setTimeout(() => {
      const mockNewUpload = {
        id: `UPL-${Math.floor(randomJitter(Date.now()) * 1000) + 9000}`,
        threat_score: Math.floor(Math.random() * 50) + 40,
        category: "Safety Hazard",
        location: "Koramangala 4th Block",
        timestamp: "Just now",
        ghost_mode: true,
        exif_locked: true,
        trust_score: 98,
        description: newIncidentText
      };

      setUploads(prev => [mockNewUpload, ...prev]);
      setNewIncidentText('');
      setReporting(false);
      setSuccessReportMsg('Incident successfully parsed. Identity masked (Ghost Mode) and EXIF GPS metadata locked to Bengaluru City command center.');
    }, 1500);
  };

  const randomJitter = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const CATEGORY_COLORS = {
    Traffic: 'bg-blue-50 text-blue-700 border-blue-100',
    Fire: 'bg-amber-50 text-amber-700 border-amber-100',
    Violence: 'bg-rose-50 text-rose-700 border-rose-100',
    Safety: 'bg-teal-50 text-teal-700 border-teal-100'
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Scope banner */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pillar 26: The Sentinel Safety Grid</span>
          <h4 className="text-xs font-bold text-blue-700 mt-1">Dual-Lens Geospatial Crowd & OSINT Mapping Workspace</h4>
        </div>
        <div className="flex space-x-2.5">
          <button
            onClick={() => setViewMode('citizen')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              viewMode === 'citizen'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Citizen Mode (Snap Map)
          </button>
          <button
            onClick={() => setViewMode('police')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              viewMode === 'police'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Command View (Police Lens)
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl text-center">
          {errorMsg}
        </div>
      )}

      {/* Main split dashboard panel */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left Side: Map Visual Workdesk */}
        <div className="xl:col-span-3 glass-panel p-5 rounded-3xl min-h-[480px] flex flex-col justify-between relative overflow-hidden">
          {/* Map header info overlays */}
          <div className="flex justify-between items-center z-10 mb-4 bg-white/90 p-3 rounded-xl border border-slate-150 shadow-xs">
            <span className="text-[10px] font-bold text-slate-700 uppercase flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <span>Real-Time Geospatial Safe-Zone Overlays</span>
            </span>
            <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              GPS Lock active: Bengaluru Central
            </span>
          </div>

          {/* SVG Map Workspace */}
          <div className="flex-1 w-full bg-slate-900 rounded-2xl border border-slate-950 relative flex items-center justify-center overflow-hidden min-h-[340px] shadow-inner">
            <svg className="w-full h-full max-h-[380px]" viewBox="0 0 500 350">
              {/* Karnataka / Bengaluru District Grid representation */}
              <path d="M 50,80 Q 150,50 250,80 T 450,80 T 450,280 T 250,300 Z" fill="#1e293b" stroke="#334155" strokeWidth={2} />
              
              {/* Safe zone overlays (Glow Polygons) */}
              <circle cx={250} cy={180} r={75} fill="#10b981" fillOpacity={0.06} stroke="#10b981" strokeWidth={1.5} strokeDasharray="3 3" />
              <circle cx={140} cy={220} r={45} fill="#10b981" fillOpacity={0.04} stroke="#10b981" strokeWidth={1} strokeDasharray="3 3" />
              
              {/* Draw Citizen Upload threat icons */}
              {uploads.map((upl, idx) => {
                const x = 180 + (idx * 140);
                const y = 140 + (idx * 60);
                const isHigh = upl.threat_score > 60;
                return (
                  <g key={upl.id} className="cursor-pointer">
                    <circle cx={x} cy={y} r={18} fill={isHigh ? "#ef4444" : "#f59e0b"} fillOpacity={0.2} className="animate-ping" style={{ animationDuration: '3s' }} />
                    <circle cx={x} cy={y} r={10} fill={isHigh ? "#ef4444" : "#f59e0b"} stroke="#ffffff" strokeWidth={1.5} />
                    <text x={x} y={y - 14} fill="#ffffff" fontSize={8} fontWeight="bold" textAnchor="middle" className="bg-slate-950 px-1 rounded">
                      {viewMode === 'police' ? `Threat ${upl.threat_score}%` : `Alert`}
                    </text>
                  </g>
                );
              })}

              {/* Draw OSINT News pins */}
              {newsPins.map((pin, idx) => {
                const x = 120 + (idx * 90);
                const y = 90 + (idx * 50);
                return (
                  <g key={pin.id} className="cursor-pointer">
                    <circle cx={x} cy={y} r={6} fill="#3b82f6" stroke="#ffffff" strokeWidth={1.5} />
                    <text x={x} y={y + 14} fill="#94a3b8" fontSize={7} textAnchor="middle">
                      {pin.source}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Float Legend overlay */}
            <div className="absolute bottom-4 left-4 bg-slate-950/85 text-slate-300 p-3 rounded-xl border border-slate-800 text-[9px] space-y-1.5">
              <div className="flex items-center space-x-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" /><span>Verified Safe Zone Buffer</span></div>
              <div className="flex items-center space-x-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" /><span>High-Score Citizen Alert</span></div>
              <div className="flex items-center space-x-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 block" /><span>OSINT Scraped Alert Pin</span></div>
            </div>
          </div>
        </div>

        {/* Right Side: Feed Controls & Scraped Feed */}
        <div className="xl:col-span-2 flex flex-col space-y-6">
          {/* Citizen upload form */}
          {viewMode === 'citizen' ? (
            <div className="glass-panel p-5 rounded-3xl border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center space-x-2">
                <Camera className="w-4.5 h-4.5 text-blue-600" />
                <span>Snap Incident Report Console</span>
              </h4>
              <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                Direct encrypted connection to nearby patrolling beat cars. Uploads are strictly validated via GPS lock and local EXIF data.
              </p>

              {successReportMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] rounded-xl mb-4">
                  {successReportMsg}
                </div>
              )}

              <form onSubmit={handleCreateReport} className="space-y-4">
                <textarea
                  value={newIncidentText}
                  onChange={(e) => setNewIncidentText(e.target.value)}
                  placeholder="Explain the incident (e.g. Broken streetlight, road damage, public distress)..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-inner h-24 resize-none"
                  required
                />
                
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span className="flex items-center space-x-1.5 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold">
                    <EyeOff className="w-3 h-3" />
                    <span>Ghost Mode Enabled</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Video className="w-3 h-3" />
                    <span>EXIF Proof-of-Location Active</span>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={reporting}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>{reporting ? "Encrypting & Uploading..." : "Record & Submit Snap Incident"}</span>
                </button>
              </form>
            </div>
          ) : (
            /* Police Panel: Patrolling Command Feed */
            <div className="glass-panel p-5 rounded-3xl border border-slate-200 flex-1 flex flex-col">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center space-x-2">
                <Shield className="w-4.5 h-4.5 text-blue-700" />
                <span>patrol dispatch evaluations</span>
              </h4>

              <div className="space-y-3.5 flex-1 overflow-y-auto pr-1">
                {uploads.map(u => (
                  <div key={u.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-blue-600 font-bold">{u.id}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        u.threat_score > 60 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                      }`}>Threat: {u.threat_score}%</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-normal">{u.description}</p>
                    <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold border-t border-slate-100 pt-2 uppercase">
                      <span>GPS: {u.location}</span>
                      <span className="text-emerald-600">Trust Score: {u.trust_score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OSINT news updates list */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-200 h-64 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                <Globe className="w-4.5 h-4.5 text-blue-600 animate-pulse" />
                <span>OSINT Emergency Broadcast Feed</span>
              </h4>
              <button onClick={fetchNewsPins} className="p-1 hover:bg-slate-50 rounded text-slate-500">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {loading ? (
                <div className="flex justify-center items-center py-10"><RefreshCw className="w-4 h-4 animate-spin text-blue-600" /></div>
              ) : newsPins.length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-8">No current OSINT signals verified.</p>
              ) : (
                newsPins.map(pin => (
                  <div key={pin.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-blue-600">{pin.source}</span>
                      <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        pin.severity === 'Critical' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                      }`}>{pin.severity}</span>
                    </div>
                    <h5 className="text-[11px] text-slate-700 leading-normal font-medium">{pin.title}</h5>
                    <span className="text-[8px] text-slate-400 font-mono block">GPS: {pin.lat}, {pin.lng} • {pin.category}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SentinelMapView;
