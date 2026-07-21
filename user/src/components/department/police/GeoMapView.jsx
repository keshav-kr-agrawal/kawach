import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Popup, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Shield, MapPin, Layers, AlertTriangle, Filter, Eye, RefreshCw } from 'lucide-react';

// Subcomponent to smoothly pan map to selected hotspot coordinates
function MapCenterUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13, { animate: true });
    }
  }, [center, map]);
  return null;
}

function GeoMapView({ token, user }) {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedCrime, setSelectedCrime] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pillar 28 Socio-Economic Choropleth states
  const [choropleth, setChoropleth] = useState('none'); // 'none', 'unemployment', 'income', 'streetlights'
  const [correlationAlpha, setCorrelationAlpha] = useState(0.4);

  // Mock polygons for socio-economic overlays
  const unemploymentPolygon = [
    [12.9400, 77.6000],
    [12.9500, 77.6300],
    [12.9100, 77.6200]
  ];

  const incomePolygon = [
    [12.9600, 77.6200],
    [12.9800, 77.6600],
    [12.9500, 77.6500]
  ];

  const streetlightPolygon = [
    [12.9100, 77.6600],
    [12.9300, 77.6900],
    [12.9000, 77.6800]
  ];

  const fetchGeoData = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const res = await fetch('http://localhost:8000/api/geo/hotspots', { headers });
      if (!res.ok) {
        throw new Error('Failed to retrieve geospatial hotspots from Neo4j');
      }
      const data = await res.json();
      setGeoJsonData(data);
      
      if (data.features && data.features.length > 0 && !selectedIncident) {
        setSelectedIncident(data.features[0]);
      }
    } catch (err) {
      console.error('Failed to load geo data:', err);
      setError(err.message || 'Error querying Neo4j coordinates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeoData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filter features based on crime selection dropdown
  const filteredFeatures = geoJsonData?.features?.filter(f => {
    if (selectedCrime === 'All') return true;
    return f.properties.type === selectedCrime;
  }) || [];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-auto xl:h-[calc(100vh-12rem)]">
      {/* Left panel: Filters & Hotspot List */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col xl:col-span-1 h-auto xl:h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Search Filters</h4>
          </div>
          <button 
            onClick={fetchGeoData}
            title="Reload from Graph"
            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-4 flex-1">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Select Crime Category</label>
            <select 
              value={selectedCrime}
              onChange={(e) => setSelectedCrime(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
            >
              <option value="All">All Categories</option>
              <option value="ANPR Spotting">ANPR Spotting</option>
              <option value="CCTV Crowd Alert">CCTV Crowd Alert</option>
              <option value="Restricted Entry">Restricted Entry</option>
              <option value="Cyber Fraud">Cyber Fraud</option>
              <option value="Burglary Spike">Burglary Spike</option>
            </select>
          </div>

          <div className="border-t border-slate-200 my-2"></div>

          {/* Pillar 28 Socio-Economic Choropleth Panel */}
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1 flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Socio-Economic Choropleths</span>
          </h4>
          <p className="text-[9px] text-slate-400 leading-normal mb-3">Overlay mock census dataset blocks to correlate crime root causes (Pillar 28).</p>

          <div className="space-y-2">
            {[
              { id: 'none', label: 'Disable Choropleth' },
              { id: 'unemployment', label: 'Unemployment Density' },
              { id: 'income', label: 'Average Income' },
              { id: 'streetlights', label: 'Streetlight Coverage Deficit' }
            ].map(layer => (
              <label key={layer.id} className="flex items-center space-x-2 text-xs text-slate-700 font-semibold cursor-pointer">
                <input
                  type="radio"
                  name="choropleth"
                  checked={choropleth === layer.id}
                  onChange={() => setChoropleth(layer.id)}
                  className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500"
                />
                <span>{layer.label}</span>
              </label>
            ))}
          </div>

          {choropleth !== 'none' && (
            <div className="pt-2">
              <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold mb-1.5 uppercase">
                <span>Correlation Opacity</span>
                <span>{(correlationAlpha * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={correlationAlpha}
                onChange={(e) => setCorrelationAlpha(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-[10px] font-semibold leading-relaxed">
            {error}
          </div>
        )}

        <div className="border-t border-slate-200 my-4"></div>

        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">Graph-Sourced Incidents</h4>
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {filteredFeatures.map(f => {
            const isSelected = selectedIncident?.properties?.id === f.properties.id;
            return (
              <button
                key={f.properties.id}
                onClick={() => setSelectedIncident(f)}
                className={`w-full p-3 rounded-xl text-left border transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-50 border-blue-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">{f.properties.id}</span>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                    f.properties.threat_level === 'Critical' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>{f.properties.threat_level}</span>
                </div>
                <h5 className="text-[11px] font-bold text-slate-800 truncate">{f.properties.type}</h5>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel: Geospatial Map Canvas - CartoDB Dark Matter */}
      <div className="glass-panel p-2 sm:p-4 rounded-2xl xl:col-span-3 flex flex-col h-[500px] xl:h-full relative overflow-hidden">
        <div className="flex-1 w-full rounded-xl border border-slate-200 relative overflow-hidden z-0">
          <MapContainer 
            center={[12.9500, 77.6200]} 
            zoom={11} 
            zoomControl={true}
            scrollWheelZoom={true}
            doubleClickZoom={true}
            dragging={true}
            touchZoom={true}
            keyboard={true}
            style={{ height: "100%", width: "100%" }}
          >
            {/* Standard CartoDB Dark Matter premium tiles */}
            <TileLayer
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* Map center panner */}
            {selectedIncident && (
              <MapCenterUpdater 
                center={[
                  selectedIncident.geometry.coordinates[1],
                  selectedIncident.geometry.coordinates[0]
                ]} 
              />
            )}

            {/* Socio-Economic Choropleth Polygons */}
            {choropleth === 'unemployment' && (
              <Polygon 
                positions={unemploymentPolygon} 
                pathOptions={{ color: '#3b82f6', fillColor: '#1e3a8a', fillOpacity: correlationAlpha }}
              >
                <Popup>
                  <span className="text-xs font-bold">Unemployment Census Sector</span>
                </Popup>
              </Polygon>
            )}

            {choropleth === 'income' && (
              <Polygon 
                positions={incomePolygon} 
                pathOptions={{ color: '#10b981', fillColor: '#065f46', fillOpacity: correlationAlpha }}
              >
                <Popup>
                  <span className="text-xs font-bold">High Income Ward Buffer</span>
                </Popup>
              </Polygon>
            )}

            {choropleth === 'streetlights' && (
              <Polygon 
                positions={streetlightPolygon} 
                pathOptions={{ color: '#f59e0b', fillColor: '#111827', fillOpacity: correlationAlpha }}
              >
                <Popup>
                  <span className="text-xs font-bold">Dark Streetlight Outage Sector</span>
                </Popup>
              </Polygon>
            )}

            {/* Render Incidents as markers/circles */}
            {filteredFeatures.map(f => {
              const lat = f.geometry.coordinates[1];
              const lng = f.geometry.coordinates[0];
              const isSelected = selectedIncident?.properties?.id === f.properties.id;

              return (
                <Circle
                  key={f.properties.id}
                  center={[lat, lng]}
                  radius={isSelected ? 600 : 350}
                  pathOptions={{
                    color: f.properties.threat_level === 'Critical' ? '#ef4444' : '#f59e0b',
                    fillColor: f.properties.threat_level === 'Critical' ? '#f43f5e' : '#fbbf24',
                    fillOpacity: isSelected ? 0.7 : 0.4,
                    weight: isSelected ? 3 : 1
                  }}
                  eventHandlers={{
                    click: () => {
                      setSelectedIncident(f);
                    }
                  }}
                >
                  <Popup>
                    <div className="space-y-1.5 p-1 text-slate-800">
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-[10px] font-bold text-blue-600 uppercase font-mono">{f.properties.id}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded font-bold uppercase">{f.properties.threat_level}</span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 leading-normal">{f.properties.type}</h5>
                      <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">{f.properties.description}</p>
                      <div className="text-[9px] text-slate-400 mt-2 font-medium flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{f.properties.location_name}</span>
                      </div>
                    </div>
                  </Popup>
                </Circle>
              );
            })}
          </MapContainer>

          {/* Choropleth disclaimer card overlay */}
          {choropleth !== 'none' && (
            <div className="absolute top-6 right-6 bg-blue-950/95 text-white p-3 sm:p-4 rounded-xl border border-blue-900 text-[10px] space-y-1 max-w-xs shadow-md z-[1000] backdrop-blur-xs">
              <div className="font-bold flex items-center space-x-1"><Eye className="w-3.5 h-3.5 text-blue-400" /><span>Correlation Dashboard</span></div>
              <p className="text-blue-200 leading-normal">Overlaying mock census metrics against crime hotspots centers to establish root causes and dispatch beat patrols (Pillar 28).</p>
            </div>
          )}

          {/* Incident Info Detail Panel */}
          {selectedIncident && (
            <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 border-l-4 border-l-rose-500 max-w-xs sm:max-w-sm shadow-lg z-[1000]">
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Geospatial Graph Node Detail</h5>
              <h4 className="text-xs font-extrabold text-slate-900 leading-tight mb-2">{selectedIncident.properties.type}</h4>
              <div className="space-y-1 text-xs text-slate-700 font-semibold">
                <p className="text-[11px] text-slate-600 font-medium bg-slate-50 p-2 rounded-lg leading-relaxed mb-2">{selectedIncident.properties.description}</p>
                <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase text-[9px]">Coordinates:</span><span className="text-slate-800 font-mono text-[10px]">{selectedIncident.geometry.coordinates[1].toFixed(4)}, {selectedIncident.geometry.coordinates[0].toFixed(4)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase text-[9px]">Zone Site:</span><span className="text-slate-800 text-[10px]">{selectedIncident.properties.location_name}</span></div>
                <div className="flex justify-between"><span className="text-slate-400 font-bold uppercase text-[9px]">Registered:</span><span className="text-slate-800 text-[10px]">{new Date(selectedIncident.properties.timestamp).toLocaleString()}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GeoMapView;
