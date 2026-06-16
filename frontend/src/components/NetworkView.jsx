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

  // Color mapping per community
  const COMMUNITY_COLORS = {
    0: '#9D8DF1',
    1: '#F4D068',
    2: '#FF4A5A',
    3: '#B8B5FF'
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
          <Search className="w-4 h-4 text-lavender" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">Search Syndicate</h4>
        </div>
        
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Offender name or ID..."
          className="w-full bg-obsidian-700 border border-obsidian-600 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-lavender mb-6"
        />

        <div className="border-t border-obsidian-750 my-2"></div>

        <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Syndicate Key Brokers</h4>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {filteredNodes.slice(0, 10).map(n => (
            <button
              key={n.id}
              onClick={() => setSelectedNode(n)}
              className={`w-full p-4 rounded-xl text-left border transition-all duration-200 ${
                selectedNode?.id === n.id
                  ? 'bg-lavender/10 border-lavender/50 glow-border'
                  : 'bg-obsidian-800/40 border-obsidian-700 hover:border-obsidian-600'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-gray-400 font-mono">{n.id}</span>
                <span className="text-[10px] font-semibold" style={{ color: COMMUNITY_COLORS[n.community_id % 4] }}>
                  Syndicate {n.community_id}
                </span>
              </div>
              <h5 className="text-xs font-semibold text-white">{n.name}</h5>
              <div className="flex justify-between text-[9px] text-gray-400 mt-2">
                <span>PageRank: {n.pagerank}</span>
                <span>Betweenness: {n.betweenness_centrality}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Network Graph Render Canvas */}
      <div className="glass-panel p-6 rounded-2xl xl:col-span-3 flex flex-col h-full relative overflow-hidden">
        <div className="absolute top-8 left-8 flex items-center space-x-2">
          <Zap className="w-5 h-5 text-gold animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">3D Link Analytics Engine Active</span>
        </div>

        {/* Graph simulation panel */}
        <div className="flex-1 w-full bg-obsidian-950 rounded-xl border border-obsidian-800 relative flex items-center justify-center overflow-hidden">
          {/* SVG representation of Force directed nodes */}
          <svg className="w-full h-full max-h-[500px]" viewBox="0 0 600 400">
            {/* Draw Links/Edges */}
            <line x1={180} y1={180} x2={280} y2={130} stroke="#2A2A35" strokeWidth={3} />
            <line x1={280} y1={130} x2={220} y2={250} stroke="#2A2A35" strokeWidth={1} />
            <line x1={400} y1={150} x2={480} y2={220} stroke="#2A2A35" strokeWidth={4} />
            <line x1={480} y1={220} x2={430} y2={290} stroke="#2A2A35" strokeWidth={2} />
            <line x1={400} y1={150} x2={350} y2={240} stroke="#2A2A35" strokeWidth={2} />
            
            {/* Broker connection edge linking communities */}
            <line x1={180} y1={180} x2={400} y2={150} stroke="#FF4A5A" strokeWidth={2} strokeDasharray="5 5" />

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
                    <circle cx={pos.x} cy={pos.y} r={size + 6} fill="none" stroke="#9D8DF1" strokeWidth={1.5} strokeDasharray="3 3" />
                  )}
                  {/* Central Node Circle */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={size}
                    fill={COMMUNITY_COLORS[node.community_id % 4]}
                    stroke="#1E1E24"
                    strokeWidth={2}
                  />
                  {/* Text labels for names */}
                  <text x={pos.x} y={pos.y - size - 4} fill="#fff" fontSize={9} textAnchor="middle">{node.name}</text>
                </g>
              );
            })}
          </svg>

          {/* Node detail display panel */}
          {selectedNode && (
            <div className="absolute bottom-6 right-6 glass-panel p-5 rounded-2xl border-l-4 border-l-lavender max-w-sm glow-border z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-gray-400 font-mono">{selectedNode.id}</span>
                <span className="text-xs font-bold text-lavender uppercase tracking-wider">Syndicate Leader</span>
              </div>
              <h4 className="text-sm font-bold text-white mb-2">{selectedNode.name}</h4>
              <div className="space-y-1.5 text-xs text-gray-300">
                <div className="flex justify-between"><span className="text-gray-400">Recidivism Index:</span><span className="text-white font-semibold">{selectedNode.priors} offenses</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Risk Score:</span><span className="text-crimson font-bold">{selectedNode.risk_score}%</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Betweenness Centrality:</span><span className="text-white font-mono">{selectedNode.betweenness_centrality}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">PageRank Importance:</span><span className="text-white font-mono">{selectedNode.pagerank}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NetworkView;
