import React, { useState, useEffect } from 'react';
import { Shield, MapPin, ZoomIn, ZoomOut, Layers, AlertTriangle, Filter } from 'lucide-react';

function GeoMapView({ token, user }) {
  const [points, setPoints] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [selectedCrime, setSelectedCrime] = useState('All');
  const [precision, setPrecision] = useState('exact'); // exact, blurred, masked
  const [maskSensitive, setMaskSensitive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        setLoading(true);
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // Build url query params
        let pointsUrl = `http://localhost:8000/api/geo/points?precision=${precision}&mask_sensitive=${maskSensitive}`;
        if (selectedCrime !== 'All') {
          pointsUrl += `&crime_type=${encodeURIComponent(selectedCrime)}`;
        }

        const [pointsRes, hotspotsRes] = await Promise.all([
          fetch(pointsUrl, { headers }).then(r => r.json()).catch(() => []),
          fetch('http://localhost:8000/api/geo/hotspots', { headers }).then(r => r.json()).catch(() => [])
        ]);

        setPoints(pointsRes);
        setHotspots(hotspotsRes);
        
        if (hotspotsRes.length > 0 && !selectedHotspot) {
          setSelectedHotspot(hotspotsRes[0]);
        }
      } catch (err) {
        console.error('Failed to load geo data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGeoData();
  }, [token, selectedCrime, precision, maskSensitive]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-auto xl:h-[calc(100vh-12rem)]">
      {/* Left panel: Filters & Hotspot List */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col xl:col-span-1 h-auto xl:h-full overflow-y-auto">
        <div className="flex items-center space-x-2 mb-6">
          <Filter className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Search Filters</h4>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Select Crime Type</label>
            <select 
              value={selectedCrime}
              onChange={(e) => setSelectedCrime(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
            >
              <option value="All">All Crime Types</option>
              <option value="Cybercrime / Phishing">Cybercrime</option>
              <option value="Theft / Robbery">Theft / Robbery</option>
              <option value="Assault / Grievous Hurt">Assault</option>
              <option value="Riot / Public Mischief">Riots</option>
            </select>
          </div>

          <div className="border-t border-slate-200 my-4"></div>

          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3">Privacy & Compliance</h4>
          
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Location Precision</label>
            <select 
              value={precision}
              onChange={(e) => setPrecision(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
            >
              <option value="exact">Exact (Authorized Only)</option>
              <option value="blurred">Blurred (Jitter 500m-1km)</option>
              <option value="masked">Masked (Snap to Station)</option>
            </select>
          </div>

          <div className="flex items-center space-x-2.5 pt-2">
            <input
              type="checkbox"
              id="maskSensitive"
              checked={maskSensitive}
              onChange={(e) => setMaskSensitive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="maskSensitive" className="text-xs text-slate-700 font-semibold cursor-pointer">
              Mask Sensitive Sites
            </label>
          </div>
        </div>

        <div className="border-t border-slate-200 my-6"></div>

        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">High Crime Areas (Hotspots)</h4>
        <div className="space-y-3">
          {hotspots.map(h => (
            <button
              key={h.cluster_id}
              onClick={() => setSelectedHotspot(h)}
              className={`w-full p-4 rounded-xl text-left border transition-all duration-200 ${
                selectedHotspot?.cluster_id === h.cluster_id
                  ? 'bg-indigo-50/50 border-indigo-500 shadow-sm'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">ZONE {h.cluster_id}</span>
                <span className="text-[10px] px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded font-semibold">{h.heat_score}% Heat</span>
              </div>
              <h5 className="text-xs font-bold text-slate-800">{h.dominant_crime}</h5>
              <div className="flex items-center space-x-3 text-[10px] text-slate-500 mt-2">
                <span>{h.fir_count} FIRs</span>
                <span>•</span>
                <span>{h.radius_km} km radius</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel: Geospatial Map Canvas Simulation */}
      <div className="glass-panel p-6 rounded-2xl xl:col-span-3 flex flex-col h-[500px] xl:h-full relative overflow-hidden">
        {/* Interactive Controls Overlay */}
        <div className="absolute top-8 left-8 bg-white/95 border border-slate-200 p-2 rounded-xl flex space-x-1 shadow-md z-10">
          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors">
            <Layers className="w-4 h-4" />
          </button>
        </div>

        {/* Map Canvas Background (Simulating rich Deck.gl visual map) */}
        <div className="flex-1 w-full bg-blue-50/20 rounded-xl border border-slate-200 relative flex items-center justify-center overflow-hidden shadow-inner">
          <svg className="w-full h-full max-h-[500px]" viewBox="0 0 800 500">
            {/* Landmass outline */}
            <path d="M 280 80 Q 250 120 230 180 T 220 280 T 260 380 Q 290 420 330 450 L 380 430 L 400 370 Q 420 310 440 250 T 420 120 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth={1.5} />
            
            {/* Render FIR Points */}
            {points.map((p, idx) => {
              // Map lat/lng within bounds
              const x = 300 + (p.lng - 77.5946) * 1200;
              const y = 350 - (p.lat - 12.9716) * 1200;
              
              if (x < 150 || x > 650 || y < 100 || y > 450) return null;
              
              return (
                <circle 
                  key={p.id}
                  cx={x}
                  cy={y}
                  r={4}
                  fill={p.crime_type.includes('Cyber') ? '#4F46E5' : p.crime_type.includes('Theft') ? '#3B82F6' : '#EF4444'}
                  opacity={0.7}
                  title={`${p.id}: ${p.crime_type}`}
                />
              );
            })}

            {/* Pulsating Hotspot Centroid Blobs */}
            {hotspots.slice(0, 4).map((h, i) => {
              const x_coords = [350, 310, 250, 270];
              const y_coords = [380, 420, 360, 220];
              const cx = x_coords[i % 4];
              const cy = y_coords[i % 4];
              
              const isSelected = selectedHotspot?.cluster_id === h.cluster_id;

              return (
                <g key={h.cluster_id} className="cursor-pointer" onClick={() => setSelectedHotspot(h)}>
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={isSelected ? 35 : 20} 
                    fill="#ef4444" 
                    fillOpacity={0.15} 
                    className="animate-ping" 
                    style={{ animationDuration: `${2 + i}s` }}
                  />
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={isSelected ? 10 : 6} 
                    fill={isSelected ? '#ef4444' : '#f59e0b'} 
                    stroke="#ffffff" 
                    strokeWidth={2}
                  />
                  
                  {isSelected && (
                    <g>
                      <rect x={cx + 15} y={cy - 20} width={130} height={40} rx={6} fill="#ffffff" stroke="#ef4444" strokeWidth={1} filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.1))" />
                      <text x={cx + 25} y={cy - 5} fill="#0f172a" fontSize={10} fontWeight="bold">ZONE {h.cluster_id} CENTROID</text>
                      <text x={cx + 25} y={cy + 10} fill="#ef4444" fontSize={9}>{h.fir_count} Cases Spiked</text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {selectedHotspot && (
            <div className="absolute bottom-6 right-6 bg-white p-5 rounded-2xl border border-slate-200 border-l-4 border-l-rose-500 max-w-sm shadow-lg z-10">
              <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Zone Analysis Detail</h5>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between"><span className="text-slate-500">Centroid Coordinates:</span><span className="text-slate-800 font-mono">{selectedHotspot.lat.toFixed(4)}, {selectedHotspot.lng.toFixed(4)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Total Incidents:</span><span className="text-slate-800 font-semibold">{selectedHotspot.fir_count} FIRs</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Cluster Density:</span><span className="text-rose-600 font-bold">{selectedHotspot.heat_score}% High</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Primary Crime:</span><span className="text-slate-800 font-mono">{selectedHotspot.dominant_crime}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GeoMapView;
