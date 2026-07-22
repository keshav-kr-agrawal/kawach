import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api/client.js';
import { ViewFrame, Panel, LoadingLine, ErrorNote, Idx, SeverityChip } from '../ui/kit.jsx';

/**
 * DBSCAN hotspot map (backend /api/geo/hotspots — haversine clustering).
 * Encoding stays inside the two-hue system: cluster radius = incident count,
 * fill darkness = max threat level; isolated (noise) incidents are hollow.
 */

const THREAT_FILL = { CRITICAL: '#3E2F06', HIGH: '#7C5D09', MEDIUM: '#C9990F', LOW: '#E9BA26' };

export default function HotspotsView() {
  const [epsKm, setEpsKm] = useState(1.5);
  const [minSamples, setMinSamples] = useState(2);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (eps = epsKm, min = minSamples) => {
    setLoading(true);
    setError(null);
    try {
      setData(await api.get(`/geo/hotspots?eps_km=${eps}&min_samples=${min}`));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [epsKm, minSamples]);

  useEffect(() => { load(); /* initial */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clusters = useMemo(
    () => (data?.features || []).filter((f) => f.properties.is_hotspot)
      .sort((a, b) => b.properties.incident_count - a.properties.incident_count),
    [data],
  );
  const noise = useMemo(
    () => (data?.features || []).filter((f) => !f.properties.is_hotspot),
    [data],
  );

  return (
    <ViewFrame
      kicker={`DBSCAN · haversine metric · ${data?.metadata?.total_incidents ?? '—'} incidents`}
      title="Where crime"
      titleEm="condenses."
      lede="Density-based clustering over live incident coordinates. Tune the neighborhood radius and watch clusters form or dissolve — noise points are honest noise, never dressed up as hotspots."
      aside={
        <form
          className="flex items-end gap-3"
          onSubmit={(e) => { e.preventDefault(); load(); }}
        >
          <label className="flex flex-col gap-1">
            <span className="tag">radius km</span>
            <input
              type="number" step="0.5" min="0.5" max="25" value={epsKm}
              onChange={(e) => setEpsKm(Number(e.target.value))}
              className="field w-24 py-2 font-mono text-xs"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="tag">min pts</span>
            <input
              type="number" min="1" max="20" value={minSamples}
              onChange={(e) => setMinSamples(Number(e.target.value))}
              className="field w-20 py-2 font-mono text-xs"
            />
          </label>
          <button type="submit" className="btn-ink py-2.5">Recluster</button>
        </form>
      }
    >
      {error && <ErrorNote error={error} />}
      {loading && <LoadingLine text="Clustering incident space" />}

      {!loading && data && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel className="overflow-hidden lg:col-span-2" title="Incident space" tag={`${data.metadata.hotspot_clusters} clusters`}>
            <div className="h-[460px] overflow-hidden rounded-ledger border border-amber-100">
              <MapContainer center={[12.9716, 77.5946]} zoom={11} className="h-full w-full" scrollWheelZoom>
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                {noise.map((f, i) => {
                  const isSeizure = f.properties.is_seizure;
                  return (
                    <CircleMarker
                      key={`n-${i}`}
                      center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
                      radius={isSeizure ? 6 : 5}
                      pathOptions={isSeizure
                        ? { color: '#1D4ED8', weight: 2, fillColor: '#3B82F6', fillOpacity: 0.85 }
                        : { color: '#C9990F', weight: 1.5, fillColor: '#FFFFFF', fillOpacity: 0.9 }}
                    >
                      <Popup>
                        <p className="font-mono text-[0.62rem] uppercase tracking-tag">
                          {isSeizure ? 'Counterfeit seizure' : 'Isolated incident'}
                        </p>
                        <p className="text-xs font-semibold">{f.properties.type}</p>
                        <p className="text-xs">{f.properties.description}</p>
                      </Popup>
                    </CircleMarker>
                  );
                })}
                {clusters.map((f) => {
                  const p = f.properties;
                  const seizureDominant = p.is_seizure_dominant;
                  const fill = seizureDominant ? '#1D4ED8' : (THREAT_FILL[String(p.max_threat_level).toUpperCase()] || THREAT_FILL.LOW);
                  return (
                    <CircleMarker
                      key={`c-${p.cluster_id}`}
                      center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
                      radius={10 + Math.min(22, p.incident_count * 4)}
                      pathOptions={{ color: fill, weight: 2, fillColor: fill, fillOpacity: seizureDominant ? 0.45 : 0.35 }}
                    >
                      <Popup>
                        <p className="font-mono text-[0.62rem] uppercase tracking-tag">
                          {seizureDominant ? 'Counterfeit seizure cluster' : `Cluster #${p.cluster_id}`}
                        </p>
                        <p className="text-xs font-semibold">{p.incident_count} incidents · {p.dominant_type}</p>
                        {p.seizure_count > 0 && <p className="text-xs">{p.seizure_count} counterfeit seizure(s) in this cluster</p>}
                        <p className="text-xs">Max threat: {p.max_threat_level}</p>
                        <p className="text-xs">{(p.location_names || []).join(', ')}</p>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
            <p className="mt-3 flex flex-wrap gap-4 text-[0.68rem] text-ink-faint">
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-900 align-middle" />filled = hotspot centroid (darker = higher threat)</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full border-2 border-amber-500 bg-white align-middle" />hollow = isolated incident (DBSCAN noise)</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-blue-600 align-middle" />blue = counterfeit currency seizure point</span>
            </p>
          </Panel>

          <Panel title="Cluster register" tag="largest first">
            <ol className="max-h-[500px] divide-y divide-amber-100 overflow-y-auto">
              {clusters.map((f, i) => {
                const p = f.properties;
                return (
                  <li key={p.cluster_id} className="flex items-start gap-3 py-3.5">
                    <Idx n={i + 1} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{p.dominant_type}</p>
                      <p className="truncate text-xs text-ink-faint">
                        {(p.location_names || []).join(', ') || 'Unnamed area'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <SeverityChip level={p.max_threat_level} />
                      <span className="font-mono text-[0.64rem] tabular-nums text-ink-soft">
                        {p.incident_count} incidents
                      </span>
                    </div>
                  </li>
                );
              })}
              {!clusters.length && (
                <p className="py-6 text-sm text-ink-faint">
                  No clusters at this radius — widen it, or the map is genuinely calm.
                </p>
              )}
            </ol>
          </Panel>
        </div>
      )}
    </ViewFrame>
  );
}
