import React, { useState } from 'react';
import { Smartphone, Shield, EyeOff, Camera, MapPin, Award, CheckCircle, Wifi, Battery, Volume2, AlertTriangle } from 'lucide-react';

function SentinelCitizenApp({ token, user }) {
  const [recording, setRecording] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [trustScore, setTrustScore] = useState(92);

  const handleRecordClick = () => {
    setRecording(true);
    setUploaded(false);
    
    // Simulate recording for 2 seconds, then parse & upload
    setTimeout(() => {
      setRecording(false);
      setUploaded(true);
      // Increment trust score for verified submission!
      setTrustScore(prev => Math.min(100, prev + 1));
    }, 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 sm:p-4 min-h-[500px] animate-fade-in">
      <div className="w-full max-w-[360px] bg-slate-950 text-slate-300 rounded-[32px] sm:rounded-[40px] p-3 sm:p-4 border-4 sm:border-8 border-slate-900 shadow-2xl relative overflow-hidden flex flex-col justify-between h-[540px] sm:h-[620px]">
        {/* Notch and Status Bar */}
        <div className="flex justify-between items-center px-4 pt-1 pb-3 text-slate-500 z-10">
          <span className="text-[10px] font-bold">9:41 AM</span>
          <div className="w-16 sm:w-20 h-4 sm:h-4.5 bg-slate-900 rounded-full absolute left-1/2 transform -translate-x-1/2 top-2.5 sm:top-3 shadow-inner" />
          <div className="flex items-center space-x-1.5 text-[10px]">
            <Wifi className="w-3 h-3" />
            <span className="font-bold">5G</span>
            <Battery className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Top Civic Trust Badge */}
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-center justify-between mx-1.5 shadow-sm z-10">
          <div className="flex items-center space-x-2.5">
            <Award className="w-5 h-5 text-blue-500" />
            <div>
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Civic Safety Rating</h5>
              <span className="text-xs font-extrabold text-white">Trust Score: {trustScore}/100</span>
            </div>
          </div>
          <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase">
            Verified
          </span>
        </div>

        {/* Mock Map Workspace inside Phone */}
        <div className="flex-1 bg-slate-900 border border-slate-850 rounded-3xl my-3 relative overflow-hidden flex items-center justify-center shadow-inner">
          {/* Mock Leaflet/Mappls map path */}
          <svg className="w-full h-full" viewBox="0 0 300 350">
            {/* Map Roads representation */}
            <path d="M 0,150 L 300,150 M 150,0 L 150,350 M 0,50 L 300,250" stroke="#334155" strokeWidth={1.5} opacity={0.6} />
            
            {/* Verified Safe Zones Polygons (green buffers) */}
            <circle cx={150} cy={150} r={45} fill="#10b981" fillOpacity={0.07} stroke="#10b981" strokeWidth={1.2} strokeDasharray="3 3" />
            <circle cx={50} cy={80} r={25} fill="#10b981" fillOpacity={0.05} stroke="#10b981" strokeWidth={1} strokeDasharray="3 3" />
            
            {/* Local News Pins */}
            <g className="cursor-pointer">
              <circle cx={140} cy={120} r={4} fill="#3b82f6" stroke="#ffffff" strokeWidth={1} />
              <text x={140} y={112} fill="#94a3b8" fontSize={7} textAnchor="middle">Traffic Alert</text>
            </g>
            
            <g className="cursor-pointer">
              <circle cx={220} cy={200} r={4} fill="#ef4444" stroke="#ffffff" strokeWidth={1} />
              <text x={220} y={192} fill="#94a3b8" fontSize={7} textAnchor="middle">Safe Buffer</text>
            </g>
          </svg>

          {/* Floating overlays on Map */}
          <div className="absolute top-3 left-3 bg-slate-950/85 border border-slate-800 p-2.5 rounded-xl text-[9px] text-slate-300">
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span>Safe Zone Buffers: Active</span>
            </div>
          </div>

          {/* Upload Status Card */}
          {uploaded && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 p-4 rounded-2xl max-w-[240px] text-center shadow-lg space-y-2.5 animate-fade-in z-20">
              <CheckCircle className="w-7 h-7 text-emerald-500 mx-auto" />
              <h5 className="text-[10px] font-bold text-white uppercase tracking-wider">Report Dispatched</h5>
              <p className="text-[9px] text-slate-400 leading-normal">Incident geocoded, EXIF metadata validated, and identity masked successfully.</p>
            </div>
          )}

          {recording && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-rose-950/90 border border-rose-500/30 p-4 rounded-2xl text-center shadow-lg space-y-2.5 animate-pulse z-20">
              <Camera className="w-7 h-7 text-rose-500 mx-auto" />
              <h5 className="text-[10px] font-bold text-white uppercase tracking-wider">Recording Feed</h5>
              <p className="text-[9px] text-rose-300 leading-normal">Parsing live EXIF GPS lock coordinates...</p>
            </div>
          )}
        </div>

        {/* Large Prominent Record Incident Button */}
        <div className="px-1.5 pb-2 z-10 space-y-2">
          <button
            onClick={handleRecordClick}
            disabled={recording}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs shadow-md shadow-rose-950 transition-all flex items-center justify-center space-x-2 animate-pulse"
          >
            <EyeOff className="w-4 h-4" />
            <span>{recording ? "Locking GPS Coordinates..." : "Record Incident (Ghost Mode)"}</span>
          </button>
          
          <span className="text-[8px] text-center text-slate-500 block">
            *Patrol cars will be dispatched upon verified EXIF proof-of-location sync.
          </span>
        </div>
      </div>
    </div>
  );
}

export default SentinelCitizenApp;
