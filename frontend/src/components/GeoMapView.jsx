import React, { useState, useEffect } from 'react';
import { Shield, MapPin, ZoomIn, ZoomOut, Layers, AlertTriangle, Filter } from 'lucide-react';

function GeoMapView({ token, user }) {
  const [points, setPoints] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [selectedCrime, setSelectedCrime] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        setLoading(true);
        const [pointsRes, hotspotsRes] = await Promise.all([
          fetch('http://localhost:8000/api/geo/points').then(r => r.json()).catch(() => []),
          fetch('http://localhost:8000/api/geo/hotspots').then(r => r.json()).catch(() => [])
        ]);

        if (hotspotsRes.length > 0) {
          setPoints(pointsRes);
          setHotspots(hotspotsRes);
        } else {
          // Mock geo fallback
          setHotspots([
            { cluster_id: 1, lat: 12.9716, lng: 77.5946, radius_km: 2.1, fir_count: 124, dominant_crime: 'Cybercrime / Phishing', heat_score: 92 },
            { cluster_id: 2, lat: 12.2958, lng: 76.6394, radius_km: 1.5, fir_count: 54, dominant_crime: 'Theft / Robbery', heat_score: 74 },
            { cluster_id: 3, lat: 12.8703, lng: 74.8827, radius_km: 3.2, fir_count: 42, dominant_crime: 'Riot / Public Mischief', heat_score: 65 },
            { cluster_id: 4, lat: 15.4589, lng: 75.0078, radius_km: 1.8, fir_count: 38, dominant_crime: 'Assault / Hurt', heat_score: 58 }
          ]);
        }
      } catch (err) {
        console.error('Failed to load geo data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGeoData();
  }, [token]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
      {/* Left panel: Filters & Hotspot List */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col xl:col-span-1 h-full overflow-hidden">
        <div className="flex items-center space-x-2 mb-6">
          <Filter className="w-4 h-4 text-lavender" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">Interactive Filters</h4>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Crime Category</label>
            <select 
              value={selectedCrime}
              onChange={(e) => setSelectedCrime(e.target.value)}
              className="w-full bg-obsidian-700 border border-obsidian-600 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lavender"
            >
              <option value="All">All Crime Types</option>
              <option value="Cybercrime / Phishing">Cybercrime</option>
              <option value="Theft / Robbery">Theft / Robbery</option>
              <option value="Assault / Hurt">Assault</option>
              <option value="Riot / Public Mischief">Riots</option>
            </select>
          </div>
        </div>

        <div className="border-t border-obsidian-750 my-4"></div>

        <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Detected Hotspots (DBSCAN)</h4>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {hotspots.map(h => (
            <button
              key={h.cluster_id}
              onClick={() => setSelectedHotspot(h)}
              className={`w-full p-4 rounded-xl text-left border transition-all duration-200 ${
                selectedHotspot?.cluster_id === h.cluster_id
                  ? 'bg-lavender/10 border-lavender/50 glow-border'
                  : 'bg-obsidian-800/40 border-obsidian-700 hover:border-obsidian-600'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-lavender uppercase tracking-wider">ZONE {h.cluster_id}</span>
                <span className="text-[10px] px-2 py-0.5 bg-crimson/10 text-crimson border border-crimson/20 rounded font-semibold">{h.heat_score}% Heat</span>
              </div>
              <h5 className="text-xs font-semibold text-white">{h.dominant_crime}</h5>
              <div className="flex items-center space-x-3 text-[10px] text-gray-400 mt-2">
                <span>{h.fir_count} FIRs</span>
                <span>•</span>
                <span>{h.radius_km} km radius</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel: Geospatial Map Canvas Simulation */}
      <div className="glass-panel p-6 rounded-2xl xl:col-span-3 flex flex-col h-full relative overflow-hidden">
        {/* Interactive Controls Overlay */}
        <div className="absolute top-8 left-8 bg-obsidian-900/90 border border-obsidian-700 p-2 rounded-xl flex space-x-1 shadow-2xl z-10">
          <button className="p-2 hover:bg-obsidian-700 rounded-lg text-gray-400 hover:text-white transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-obsidian-700 rounded-lg text-gray-400 hover:text-white transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-obsidian-700 rounded-lg text-gray-400 hover:text-white transition-colors">
            <Layers className="w-4 h-4" />
          </button>
        </div>

        {/* Map Canvas Background (Simulating rich Deck.gl visual map) */}
        <div className="flex-1 w-full bg-obsidian-950 rounded-xl border border-obsidian-800 relative flex items-center justify-center overflow-hidden">
          {/* Custom SVG Drawing Karnataka District Heatmap blobs */}
          <svg className="w-full h-full max-h-[500px]" viewBox="0 0 800 500">
            {/* Karnataka Coast & boundaries simulated */}
            <path d="M 280 80 Q 250 120 230 180 T 220 280 T 260 380 Q 290 420 330 450 L 380 430 L 400 370 Q 420 310 440 250 T 420 120 Z" fill="#16161A" stroke="#2A2A35" strokeWidth={1.5} />
            
            {/* Pulsating Hotspot Centroid Blobs */}
            {hotspots.map((h, i) => {
              // Custom placements corresponding roughly to Bengaluru, Mysuru, Mangaluru, Hubli
              const x_coords = [350, 310, 250, 270];
              const y_coords = [380, 420, 360, 220];
              const cx = x_coords[i % 4];
              const cy = y_coords[i % 4];
              
              const isSelected = selectedHotspot?.cluster_id === h.cluster_id;

              return (
                <g key={h.cluster_id} className="cursor-pointer" onClick={() => setSelectedHotspot(h)}>
                  {/* Outer glow aura */}
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={isSelected ? 35 : 20} 
                    fill="#FF4A5A" 
                    fillOpacity={0.15} 
                    className="animate-ping" 
                    style={{ animationDuration: `${2 + i}s` }}
                  />
                  {/* Solid core */}
                  <circle 
                    cx={cx} 
                    cy={cy} 
                    r={isSelected ? 10 : 6} 
                    fill={isSelected ? '#FF4A5A' : '#F4D068'} 
                    stroke="#1E1E24" 
                    strokeWidth={2}
                  />
                  
                  {/* Hotspot centroid text label */}
                  {isSelected && (
                    <g>
                      <rect x={cx + 15} y={cy - 20} width={130} height={40} rx={6} fill="#1E1E24" stroke="#FF4A5A" strokeWidth={1} />
                      <text x={cx + 25} y={cy - 5} fill="#fff" fontSize={10} fontWeight="bold">ZONE {h.cluster_id} CENTROID</text>
                      <text x={cx + 25} y={cy + 10} fill="#FF4A5A" fontSize={9}>{h.fir_count} Cases Spiked</text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Map details box */}
          {selectedHotspot && (
            <div className="absolute bottom-6 right-6 glass-panel p-5 rounded-2xl border-l-4 border-l-crimson max-w-sm glow-border z-10">
              <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Zone Analysis Detail</h5>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-gray-400">Centroid Coordinates:</span><span className="text-white font-mono">{selectedHotspot.lat.toFixed(4)}, {selectedHotspot.lng.toFixed(4)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Total Incidents:</span><span className="text-white font-semibold">{selectedHotspot.fir_count} FIRs</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Cluster Density:</span><span className="text-crimson font-bold">{selectedHotspot.heat_score}% High</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Dominant IPC Section:</span><span className="text-white font-mono">Sec 66D IT Act</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GeoMapView;
