import React, { useState } from 'react';
import { Smartphone, Wifi, WifiOff, MapPin, ClipboardList, Send, RotateCw, CheckCircle, Database } from 'lucide-react';

function MobileFieldSimulatorView({ token, user }) {
  // Mobile Phone state
  const [isOnline, setIsOnline] = useState(true);
  const [category, setCategory] = useState('Theft / Robbery');
  const [description, setDescription] = useState('');
  const [gpsPing, setGpsPing] = useState('lat: 12.9716, lng: 77.5946');
  const [cachedQueue, setCachedQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleGeoPing = () => {
    // Generate slight offset coords to simulate movement
    const jitterLat = 12.9716 + (Math.random() - 0.5) * 0.08;
    const jitterLng = 77.5946 + (Math.random() - 0.5) * 0.08;
    setGpsPing(`lat: ${jitterLat.toFixed(5)}, lng: ${jitterLng.toFixed(5)}`);
    setStatusMsg('📍 GPS Location refreshed.');
    setTimeout(() => setStatusMsg(''), 2000);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    const newTicket = {
      id: `MOB-${Date.now().toString().slice(-5)}`,
      category,
      gps: gpsPing,
      description,
      timestamp: new Date().toLocaleTimeString()
    };

    if (isOnline) {
      // Simulate direct server submission
      setStatusMsg(`✅ Direct Upload: Ticket ${newTicket.id} ingested successfully in Data Lake.`);
      setDescription('');
    } else {
      // Cache local in queue
      setCachedQueue(prev => [...prev, newTicket]);
      setStatusMsg(`⚠️ Mode: Offline. Ticket ${newTicket.id} cached locally in SQLite.`);
      setDescription('');
    }

    setTimeout(() => setStatusMsg(''), 3500);
  };

  const handleToggleOnline = (onlineVal) => {
    setIsOnline(onlineVal);
    if (onlineVal && cachedQueue.length > 0) {
      // Trigger sync
      setSyncing(true);
      setStatusMsg('🔄 Syncing cached tickets with FastAPI Data Lake...');
      setTimeout(() => {
        setSyncing(false);
        setCachedQueue([]);
        setStatusMsg(`✅ Sync Complete: ${cachedQueue.length} offline tickets synced successfully.`);
        setTimeout(() => setStatusMsg(''), 3000);
      }, 2000);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-auto lg:h-[calc(100vh-12rem)]">
      {/* Instructions & System Logs Pane */}
      <div className="lg:col-span-3 flex flex-col space-y-6 h-full overflow-y-auto pr-1">
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center space-x-2.5">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Officer Mobile Beat Simulator</h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            This module simulates a field officer's mobile beat application. Officers on patrol use the field app to report emergency incidents, upload geo-tagged evidence files, and query priorities.
          </p>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3.5 text-xs text-slate-600">
            <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">How to demonstrate offline-first resilience:</h5>
            <ol className="list-decimal pl-4 space-y-2 leading-relaxed">
              <li>Toggle network status to <strong>OFFLINE</strong> in the mobile device simulator.</li>
              <li>Submit a new incident report (e.g. "Property theft reported near corner store").</li>
              <li>Observe that the ticket gets safely cached locally and increments the <strong>Local cached Registry Queue</strong>.</li>
              <li>Toggle network status back to <strong>ONLINE</strong>. Observe the automatic background sync sequence trigger, dumping SQLite records to the core FastAPI backend.</li>
            </ol>
          </div>
        </div>

        {/* Sync logs queue */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm flex-1 min-h-[220px] flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
              <Database className="w-4 h-4 text-indigo-600" />
              <span>SQLite Cached Sync Registry</span>
            </h4>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
              {cachedQueue.length} Pending
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[220px]">
            {cachedQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-6 text-xs">
                <span>No local offline cache records pending.</span>
              </div>
            ) : (
              cachedQueue.map(t => (
                <div key={t.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs animate-fade-in">
                  <div>
                    <span className="font-mono font-bold text-indigo-600">{t.id}</span>
                    <span className="text-slate-800 font-bold ml-2">[{t.category}]</span>
                    <p className="text-[10px] text-slate-500 mt-1 truncate max-w-[280px]" title={t.description}>{t.description}</p>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400">{t.timestamp}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Phone Simulator Frame Layout */}
      <div className="lg:col-span-2 flex flex-col items-center justify-center h-full">
        {/* Device Container */}
        <div className="w-[310px] h-[550px] bg-slate-950 rounded-[40px] border-4 border-slate-800 shadow-2xl overflow-hidden relative flex flex-col p-2.5">
          {/* Internal Mobile Interface */}
          <div className="w-full h-full bg-slate-50 rounded-[30px] overflow-hidden flex flex-col text-slate-700">
            {/* Status bar */}
            <div className="bg-indigo-900 px-4 py-2 flex justify-between items-center text-white text-[9px] font-bold">
              <span>9:41 AM</span>
              <div className="flex items-center space-x-2">
                <span>GPS Active</span>
                {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 text-rose-300" />}
              </div>
            </div>

            {/* Application Banner */}
            <div className="bg-indigo-800 px-4 py-3 text-white flex items-center justify-between shadow">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Beat App v1.2</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => handleToggleOnline(true)}
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold transition-all ${
                    isOnline ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'
                  }`}
                  title="Force Online"
                >
                  On
                </button>
                <button
                  onClick={() => handleToggleOnline(false)}
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold transition-all ${
                    !isOnline ? 'bg-rose-500 text-white' : 'bg-slate-300 text-slate-600'
                  }`}
                  title="Force Offline"
                >
                  Off
                </button>
              </div>
            </div>

            {/* Mobile Body Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between">
              {/* Form incident report */}
              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs flex-1">
                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Crime Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none"
                  >
                    <option value="Theft / Robbery">Theft / Robbery</option>
                    <option value="Assault / Grievous Hurt">Assault / Hurt</option>
                    <option value="Cybercrime / Phishing">Cybercrime</option>
                    <option value="Drug Trafficking (NDPS)">Drug NDPS</option>
                    <option value="Riot / Public Mischief">Public Riot</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">GeoTag Coordinates</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={gpsPing}
                      readOnly
                      className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-2 text-[10px] font-mono text-slate-600 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleGeoPing}
                      className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg"
                      title="Ping coordinates"
                    >
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Incident Narrative</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Enter witness statements, suspect escape routes, evidence files collected..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={syncing}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition-all flex items-center justify-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Report Field Incident</span>
                </button>
              </form>

              {/* Status alerts panel */}
              {statusMsg && (
                <div className="p-2.5 bg-indigo-950 border border-indigo-900 rounded-lg text-white text-[9px] leading-relaxed font-semibold mt-3 animate-fade-in flex items-center space-x-1.5">
                  <div className="shrink-0 animate-pulse text-indigo-400">
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <span>{statusMsg}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileFieldSimulatorView;
