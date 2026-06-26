import React, { useState, useEffect } from 'react';
import { Camera, AlertTriangle, ShieldCheck, ShieldAlert, Play, RotateCcw, Volume2, Shield } from 'lucide-react';

function CCTVAnalyticsSimulator({ token, user }) {
  const [logs, setLogs] = useState([
    { id: 1, time: "Just now", type: "Weapon Detected", camera: "CAM-01: Koramangala 80ft Ring Rd", status: "Critical Escalation" },
    { id: 2, time: "2 mins ago", type: "Crowd Formation - 15+ people", camera: "CAM-02: Town Hall Entrance", status: "Patrol Dispatched" },
    { id: 3, time: "5 mins ago", type: "Trespassing - Restricted Zone", camera: "CAM-03: Coastal Warehouse Zone", status: "Alarm Sounded" }
  ]);

  const [activeFeeds, setActiveFeeds] = useState(true);

  const handleSimulateNewFeedTrigger = () => {
    const categories = [
      { type: "Weapon Detected", camera: "CAM-01: Koramangala 80ft Ring Rd", status: "Critical Escalation" },
      { type: "Crowd Formation - 15+ people", camera: "CAM-02: Town Hall Entrance", status: "Patrol Dispatched" },
      { type: "Trespassing - Restricted Zone", camera: "CAM-03: Coastal Warehouse Zone", status: "Alarm Sounded" }
    ];
    const picked = categories[Math.floor(Math.random() * categories.length)];
    
    const newLog = {
      id: Date.now(),
      time: "Just now",
      type: picked.type,
      camera: picked.camera,
      status: "Analyzing Stream..."
    };

    setLogs(prev => [newLog, ...prev]);

    setTimeout(() => {
      setLogs(prev => prev.map(l => l.id === newLog.id ? { ...l, status: picked.status } : l));
    }, 1500);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-auto xl:h-[calc(100vh-12rem)]">
      {/* Live Video Feeds Grid */}
      <div className="xl:col-span-3 flex flex-col space-y-6">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pillar 13: Video Analytics & CV</span>
            <h4 className="text-xs font-bold text-blue-700 mt-1">CCTV AI Detection Feed Analyzer</h4>
          </div>
          <button
            onClick={handleSimulateNewFeedTrigger}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow"
          >
            Simulate Alert Trigger
          </button>
        </div>

        {/* 4 feeds grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
          {/* Feed 1: Weapon */}
          <div className="relative bg-slate-900 border border-slate-950 rounded-2xl overflow-hidden flex flex-col justify-between p-4 shadow-md group aspect-video min-h-[185px] sm:min-h-[220px]">
            <div className="flex justify-between items-center z-10">
              <span className="text-[9px] text-white bg-rose-600 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">CAM-01 (Koramangala 80ft Rd)</span>
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            </div>

            {/* Bounding Box Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-10">
              <div className="border-2 border-rose-500 w-36 h-28 relative flex flex-col justify-start">
                <span className="absolute top-0 left-0 bg-rose-600 text-white text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-br">
                  [Weapon Detected]
                </span>
              </div>
            </div>

            <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors pointer-events-none" />

            <div className="flex justify-between items-center z-10 text-[9px] text-slate-400 font-bold mt-auto">
              <span>FPS: 30 • Latency: 12ms</span>
              <span>Detection Confidence: 94.2%</span>
            </div>
          </div>

          {/* Feed 2: Crowd */}
          <div className="relative bg-slate-900 border border-slate-950 rounded-2xl overflow-hidden flex flex-col justify-between p-4 shadow-md group aspect-video min-h-[185px] sm:min-h-[220px]">
            <div className="flex justify-between items-center z-10">
              <span className="text-[9px] text-white bg-amber-600 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">CAM-02 (Town Hall Entrance)</span>
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            </div>

            {/* Bounding Box Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
              <div className="border-2 border-amber-500 w-44 h-36 relative flex flex-col justify-start">
                <span className="absolute top-0 left-0 bg-amber-600 text-white text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-br">
                  [Crowd Formation - 15+ people]
                </span>
              </div>
            </div>

            <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors pointer-events-none" />

            <div className="flex justify-between items-center z-10 text-[9px] text-slate-400 font-bold mt-auto">
              <span>FPS: 30 • Latency: 15ms</span>
              <span>Detection Confidence: 89.1%</span>
            </div>
          </div>

          {/* Feed 3: Trespassing */}
          <div className="relative bg-slate-900 border border-slate-950 rounded-2xl overflow-hidden flex flex-col justify-between p-4 shadow-md group aspect-video min-h-[185px] sm:min-h-[220px]">
            <div className="flex justify-between items-center z-10">
              <span className="text-[9px] text-white bg-rose-600 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">CAM-03 (Restricted Zone)</span>
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            </div>

            {/* Bounding Box Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-12">
              <div className="border-2 border-rose-500 w-40 h-28 relative flex flex-col justify-start">
                <span className="absolute top-0 left-0 bg-rose-600 text-white text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-br">
                  [Trespassing - Restricted Zone]
                </span>
              </div>
            </div>

            <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors pointer-events-none" />

            <div className="flex justify-between items-center z-10 text-[9px] text-slate-400 font-bold mt-auto">
              <span>FPS: 30 • Latency: 9ms</span>
              <span>Detection Confidence: 97.5%</span>
            </div>
          </div>

          {/* Feed 4: Normal */}
          <div className="relative bg-slate-900 border border-slate-950 rounded-2xl overflow-hidden flex flex-col justify-between p-4 shadow-md group aspect-video min-h-[185px] sm:min-h-[220px]">
            <div className="flex justify-between items-center z-10">
              <span className="text-[9px] text-white bg-slate-800 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">CAM-04 (Station Perimeter)</span>
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            </div>

            {/* No Threat Bounding Box */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[10px] text-emerald-500 font-bold tracking-wider uppercase bg-emerald-950/80 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                [Normal Activity]
              </span>
            </div>

            <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-slate-950/40 transition-colors pointer-events-none" />

            <div className="flex justify-between items-center z-10 text-[9px] text-slate-400 font-bold mt-auto">
              <span>FPS: 30 • Latency: 11ms</span>
              <span>Patrol Status: Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Live Logs list */}
      <div className="xl:col-span-1 glass-panel p-6 rounded-2xl flex flex-col h-[450px] xl:h-full overflow-hidden">
        <div className="flex items-center space-x-2.5 mb-4">
          <Camera className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Live Detection Logs</h4>
        </div>
        <p className="text-[9px] text-slate-400 mb-4 leading-relaxed">
          CV streams are processed locally before dispatching triggers to officers.
        </p>

        <div className="border-t border-slate-200 my-2" />

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {logs.map(log => (
            <div key={log.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-rose-600 uppercase">{log.type}</span>
                <span className="text-[8px] font-mono text-slate-400">{log.time}</span>
              </div>
              <h5 className="text-[10px] font-semibold text-slate-700 leading-normal">{log.camera}</h5>
              <span className={`text-[8px] font-bold px-2 py-0.5 rounded inline-block ${
                log.status.includes('Escalation') ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                log.status.includes('Patrol') ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>{log.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CCTVAnalyticsSimulator;
