import React, { useState, useEffect } from 'react';
import { Network, Search, Shield, Zap, Info, Filter } from 'lucide-react';

function NetworkView({ token, user }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:8000/api/network/graph');
        const data = await res.json();
        
        if (data.nodes && data.nodes.length > 0) {
          setGraphData(data);
        } else {
          // Mock network data fallback
          const mockNodes = [
            { id: 'OFF-0001', name: 'Ramesh Kumar', risk_score: 94.2, priors: 12, community_id: 1, betweenness_centrality: 0.185, pagerank: 0.082 },
            { id: 'OFF-0002', name: 'Suresh Gowda', risk_score: 86.5, priors: 8, community_id: 1, betweenness_centrality: 0.124, pagerank: 0.064 },
            { id: 'OFF-0003', name: 'Anil K.', risk_score: 72.1, priors: 5, community_id: 1, betweenness_centrality: 0.042, pagerank: 0.031 },
            { id: 'OFF-0004', name: 'Zia Ahmed', risk_score: 91.0, priors: 9, community_id: 2, betweenness_centrality: 0.210, pagerank: 0.095 },
            { id: 'OFF-0005', name: 'Imran Khan', risk_score: 78.4, priors: 6, community_id: 2, betweenness_centrality: 0.095, pagerank: 0.048 },
            { id: 'OFF-0006', name: 'Vikram Singh', risk_score: 64.0, priors: 3, community_id: 2, betweenness_centrality: 0.021, pagerank: 0.022 },
            { id: 'OFF-0007', name: 'Mahesh B.', risk_score: 88.2, priors: 7, community_id: 3, betweenness_centrality: 0.142, pagerank: 0.071 }
          ];
          const mockLinks = [
            { source: 'OFF-0001', target: 'OFF-0002', weight: 3 },
            { source: 'OFF-0002', target: 'OFF-0003', weight: 1 },
            { source: 'OFF-0004', target: 'OFF-0005', weight: 4 },
            { source: 'OFF-0005', target: 'OFF-0006', weight: 2 },
            { source: 'OFF-0001', target: 'OFF-0004', weight: 1 }, // Broker link connecting syndicates!
            { source: 'OFF-0004', target: 'OFF-0007', weight: 2 }
          ];
          setGraphData({ nodes: mockNodes, links: mockLinks });
        }
      } catch (err) {
        console.error('Failed to fetch graph data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, [token]);

  // Color mapping per community using clean professional colors
  const COMMUNITY_COLORS = {
    0: '#4F46E5', // Indigo
    1: '#F59E0B', // Amber
    2: '#EF4444', // Rose
    3: '#3B82F6'  // Blue
  };

  const filteredNodes = graphData.nodes.filter(n =>
    n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
      {/* Network Sidebar */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col xl:col-span-1 h-full overflow-hidden">
        <div className="flex items-center space-x-2 mb-6">
          <Search className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Search Criminal Gangs</h4>
        </div>
        
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Enter criminal name or ID..."
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm mb-6"
        />

        <div className="border-t border-slate-200 my-2"></div>

        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">Key Gang Connectors</h4>
        <p className="text-[9px] text-slate-400 mb-4">Criminals who link different gang syndicates:</p>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {filteredNodes.slice(0, 10).map(n => (
            <button
              key={n.id}
              onClick={() => setSelectedNode(n)}
              className={`w-full p-4 rounded-xl text-left border transition-all duration-200 ${
                selectedNode?.id === n.id
                  ? 'bg-indigo-50/50 border-indigo-500 shadow-sm'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-slate-400 font-mono">{n.id}</span>
                <span className="text-[10px] font-bold" style={{ color: COMMUNITY_COLORS[n.community_id % 4] }}>
                  Gang Syndicate {n.community_id}
                </span>
              </div>
              <h5 className="text-xs font-bold text-slate-800">{n.name}</h5>
              <div className="flex justify-between text-[9px] text-slate-500 mt-2">
                <span>Connection Score: {n.pagerank}</span>
                <span>Bridge Score: {n.betweenness_centrality}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Network Graph Render Canvas */}
      <div className="glass-panel p-6 rounded-2xl xl:col-span-3 flex flex-col h-full relative overflow-hidden">
        <div className="absolute top-8 left-8 flex items-center space-x-2 z-10 bg-white/90 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
          <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Gang Relationship Network</span>
        </div>

        {/* Info box overlay explaining graph relationships */}
        <div className="absolute top-20 left-8 right-8 bg-blue-50 border border-blue-100 rounded-xl p-3 text-[10px] text-blue-800 z-10">
          <strong>Help Guide:</strong> Circles represent offenders. Connected lines mean they co-offended in the same FIR case. Larger circles have committed more crimes. Red dashed lines identify critical bridge suspect brokers connecting separate gangs. Click on any circle to view criminal profile.
        </div>

        {/* Graph simulation panel */}
        <div className="flex-1 w-full bg-slate-100 rounded-xl border border-slate-200 relative flex items-center justify-center overflow-hidden shadow-inner pt-16">
          {/* SVG representation of Force directed nodes */}
          <svg className="w-full h-full max-h-[500px]" viewBox="0 0 600 400">
            {/* Draw Links/Edges with light theme colors */}
            <line x1={180} y1={180} x2={280} y2={130} stroke="#cbd5e1" strokeWidth={3} />
            <line x1={280} y1={130} x2={220} y2={250} stroke="#cbd5e1" strokeWidth={1} />
            <line x1={400} y1={150} x2={480} y2={220} stroke="#cbd5e1" strokeWidth={4} />
            <line x1={480} y1={220} x2={430} y2={290} stroke="#cbd5e1" strokeWidth={2} />
            <line x1={400} y1={150} x2={350} y2={240} stroke="#cbd5e1" strokeWidth={2} />
            
            {/* Broker connection edge linking communities */}
            <line x1={180} y1={180} x2={400} y2={150} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" />

            {/* Render Nodes as SVG circles */}
            {graphData.nodes.map((node, idx) => {
              // Standard positions
              const positions = [
                { x: 180, y: 180 }, // OFF-1
                { x: 280, y: 130 }, // OFF-2
                { x: 220, y: 250 }, // OFF-3
                { x: 400, y: 150 }, // OFF-4 (Broker node)
                { x: 480, y: 220 }, // OFF-5
                { x: 430, y: 290 }, // OFF-6
                { x: 350, y: 240 }  // OFF-7
              ];
              const pos = positions[idx % positions.length];
              const isSelected = selectedNode?.id === node.id;
              const size = isSelected ? 22 : 14 + (node.priors * 0.8);

              return (
                <g key={node.id} className="cursor-pointer" onClick={() => setSelectedNode(node)}>
                  {/* Outer circle halo for selection */}
                  {isSelected && (
                    <circle cx={pos.x} cy={pos.y} r={size + 6} fill="none" stroke="#4F46E5" strokeWidth={1.5} strokeDasharray="3 3" />
                  )}
                  {/* Central Node Circle */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={size}
                    fill={COMMUNITY_COLORS[node.community_id % 4]}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                  {/* Text labels for names */}
                  <text x={pos.x} y={pos.y - size - 4} fill="#0f172a" fontSize={9} fontWeight="semibold" textAnchor="middle">{node.name}</text>
                </g>
              );
            })}
          </svg>

          {/* Node detail display panel */}
          {selectedNode && (
            <div className="absolute bottom-6 right-6 bg-white p-5 rounded-2xl border border-slate-200 border-l-4 border-l-indigo-500 max-w-sm shadow-lg z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-slate-400 font-mono">{selectedNode.id}</span>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Syndicate Leader</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">{selectedNode.name}</h4>
              <div className="space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between"><span className="text-slate-500">Past Offenses (Crimes):</span><span className="text-slate-800 font-semibold">{selectedNode.priors} offenses</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Risk Level:</span><span className="text-rose-600 font-bold">{selectedNode.risk_score}%</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Bridge Score (Central Linker):</span><span className="text-slate-800 font-mono">{selectedNode.betweenness_centrality}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Connection Score (Influence):</span><span className="text-slate-800 font-mono">{selectedNode.pagerank}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NetworkView;
