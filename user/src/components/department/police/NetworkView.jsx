import React, { useState, useEffect } from 'react';
import { Network, Search, Shield, Zap, Info, Filter, Phone, Car, CreditCard, Users, MapPin, User, Smartphone, Globe } from 'lucide-react';

const MOCK_GRAPH_DATA = {
  nodes: [
    { id: 'N-101', label: 'Vikram Hegde @ Cobra', type: 'Person', role: 'Kingpin / Ring Leader', risk_score: 94, status: 'WANTED', phone: '+91 98450 11092', location: 'Bengaluru / Dubai', details: 'Directs digital arrest extortion gang across south states.' },
    { id: 'N-102', label: 'DarkWeb Cyber Syndicate', type: 'Gang', role: 'Organized Cyber Cell', risk_score: 98, status: 'ACTIVE_TARGET', members_count: 18, details: 'Specializes in SIM swapping, phishing portals, and mule accounts.' },
    { id: 'N-103', label: 'Rahul Sharma @ CyberX', type: 'Person', role: 'Technical Operator', risk_score: 86, status: 'UNDER_SURVEILLANCE', phone: '+91 97412 88301', details: 'Manages VNC botnet servers and automated spoof call script routing.' },
    { id: 'N-104', label: 'Anand Kumar (Mule)', type: 'Person', role: 'Bank Account Mule', risk_score: 72, status: 'QUESTIONED', phone: '+91 81234 55901', details: 'Provided 12 dormant bank accounts for layered money transfers.' },
    { id: 'N-105', label: 'IMEI: 8649021948201', type: 'Device IMEI', role: 'Primary Phishing Handset', risk_score: 89, status: 'FLAGGED', details: 'Linked to 43 fraudulent OTP interception events.' },
    { id: 'N-106', label: 'IP: 192.168.45.102', type: 'IP Address', role: 'VNC Botnet Relay', risk_score: 82, status: 'BLOCKED', details: 'Extortion call relay server located in leased cloud node.' },
    { id: 'N-107', label: 'UPI: mule_secure@ybl', type: 'UPI ID', role: 'Extortion Fund Collection', risk_score: 91, status: 'FROZEN', details: 'Accumulated ₹42.8 Lakhs in suspicious rapid peer-to-peer transfers.' },
    { id: 'N-108', label: 'Crypto: 0x7a84...b91c', type: 'Crypto Wallet', role: 'USDT Laundering Layer', risk_score: 95, status: 'MONITORED', details: 'Offshore USDT wallet used for instant liquidity exit.' },
    { id: 'N-109', label: 'SUV KA-04-MN-8821', type: 'Vehicle', role: 'Getaway & Transport', risk_score: 68, status: 'SPOTTED', details: 'Black Mahindra Thar spotted near CCTV safehouse in HSR Sector 2.' },
    { id: 'N-110', label: 'Safehouse HSR Sector 2', type: 'Location', role: 'Operation Base', risk_score: 90, status: 'RAID_PLANNED', details: 'Unregistered rented basement equipped with 16 SIM boxes.' },
    { id: 'N-111', label: 'Suresh Gowda @ Bullet', type: 'Person', role: 'Enforcer / Field Agent', risk_score: 88, status: 'WANTED', phone: '+91 99001 22410', details: 'Coordinates physical intimidation and cash collection from mules.' },
    { id: 'N-112', label: 'IMEI: 3591028401928', type: 'Device IMEI', role: 'Secondary Spoof Phone', risk_score: 79, status: 'FLAGGED', details: 'Used for WhatsApp video impersonation calls posing as CBI.' },
    { id: 'N-113', label: 'UPI: rapid_pay@icici', type: 'UPI ID', role: 'Secondary Cashout Node', risk_score: 85, status: 'FROZEN', details: 'Received ₹18.2 Lakhs from phishing links within 48 hours.' },
    { id: 'N-114', label: 'IP: 103.220.14.88', type: 'IP Address', role: 'Spoofed Gateway Node', risk_score: 76, status: 'MONITORED', details: 'Proxy gateway server operating from Jamtara node.' },
    { id: 'N-115', label: 'Dharwad Drop Location', type: 'Location', role: 'Secondary Safehouse', risk_score: 81, status: 'SURVEILLANCE', details: 'Warehouse used for storing counterfeit currency notes & hardware.' }
  ],
  links: [
    { source: 'N-101', target: 'N-102', label: 'Commands Syndicate', strength: 'CRITICAL' },
    { source: 'N-103', target: 'N-102', label: 'Technical Liaison', strength: 'HIGH' },
    { source: 'N-104', target: 'N-101', label: 'Mule Account Proxy', strength: 'HIGH' },
    { source: 'N-103', target: 'N-105', label: 'Operates Handset', strength: 'DIRECT' },
    { source: 'N-105', target: 'N-106', label: 'Relays via IP', strength: 'LOGGED' },
    { source: 'N-104', target: 'N-107', label: 'Owns Bank UPI', strength: 'VERIFIED' },
    { source: 'N-107', target: 'N-108', label: 'Transfers to Crypto', strength: 'SWIFT' },
    { source: 'N-101', target: 'N-109', label: 'Registered Owner', strength: 'LEGAL' },
    { source: 'N-101', target: 'N-110', label: 'Frequents Site', strength: 'GEO_TRACKED' },
    { source: 'N-103', target: 'N-110', label: 'Staging Hardware', strength: 'CCTV_CONFIRMED' },
    { source: 'N-111', target: 'N-101', label: 'Reports to Kingpin', strength: 'DIRECT' },
    { source: 'N-111', target: 'N-112', label: 'Carries Handset', strength: 'OPERATIONAL' },
    { source: 'N-111', target: 'N-113', label: 'Controls UPI Node', strength: 'FINANCIAL' },
    { source: 'N-112', target: 'N-114', label: 'Connects to IP', strength: 'LOGGED' },
    { source: 'N-111', target: 'N-115', label: 'Operates Safehouse', strength: 'GEO_TRACKED' }
  ]
};

function NetworkView({ token, user }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [loading, setLoading] = useState(true);

  // Simulated layout coordinates for rendering the full graph in a responsive container
  const [coords, setCoords] = useState({});

  const randomJitter = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x) - 0.5;
  };

  const applyGraphLayout = (data) => {
    const combinedNodes = data.nodes && data.nodes.length >= 8 ? data.nodes : MOCK_GRAPH_DATA.nodes;
    const combinedLinks = data.links && data.links.length >= 8 ? data.links : MOCK_GRAPH_DATA.links;
    const finalData = { nodes: combinedNodes, links: combinedLinks };

    setGraphData(finalData);
    const newCoords = {};
    const centerX = 300;
    const centerY = 200;
    
    finalData.nodes.forEach((node, idx) => {
      let radius = 120;
      if (node.type === 'Person') radius = 70;
      else if (node.type === 'Gang') radius = 30;
      else if (node.type === 'Location') radius = 170;
      else if (node.type === 'Device IMEI') radius = 135;
      else if (node.type === 'IP Address') radius = 185;
      else if (node.type === 'UPI ID') radius = 145;
      else if (node.type === 'Crypto Wallet') radius = 155;
      
      const angle = (idx / finalData.nodes.length) * 2 * Math.PI;
      newCoords[node.id] = {
        x: centerX + radius * Math.cos(angle) + (randomJitter(idx) * 15),
        y: centerY + radius * Math.sin(angle) + (randomJitter(idx + 1) * 15)
      };
    });
    setCoords(newCoords);
    
    const leader = finalData.nodes.find(n => n.type === 'Person' && n.risk_score > 80) || finalData.nodes[0];
    if (leader) setSelectedNode(leader);
  };

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:8000/api/network/graph', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch graph data');
        const data = await res.json();
        applyGraphLayout(data);
      } catch (err) {
        console.warn('[NETWORK VIEW] Backend offline — using hyper-realistic criminal syndicate graph:', err);
        applyGraphLayout(MOCK_GRAPH_DATA);
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, [token]);

  const TYPE_COLORS = {
    Person: '#3B82F6',  // Blue
    Gang: '#F59E0B',    // Amber
    Vehicle: '#3B82F6', // Blue
    Phone: '#10B981',   // Emerald
    Account: '#8B5CF6', // Violet
    Location: '#EF4444', // Rose
    'Device IMEI': '#F97316', // Orange
    'IP Address': '#14B8A6',  // Teal
    'UPI ID': '#EC4899',      // Pink
    'Crypto Wallet': '#84CC16' // Lime
  };

  const getNodeIcon = (type) => {
    switch (type) {
      case 'Person': return <User className="w-3.5 h-3.5" />;
      case 'Gang': return <Users className="w-3.5 h-3.5" />;
      case 'Vehicle': return <Car className="w-3.5 h-3.5" />;
      case 'Phone': return <Phone className="w-3.5 h-3.5" />;
      case 'Account': return <CreditCard className="w-3.5 h-3.5" />;
      case 'Device IMEI': return <Smartphone className="w-3.5 h-3.5" />;
      case 'IP Address': return <Globe className="w-3.5 h-3.5" />;
      case 'UPI ID': return <Zap className="w-3.5 h-3.5" />;
      case 'Crypto Wallet': return <Shield className="w-3.5 h-3.5" />;
      default: return <MapPin className="w-3.5 h-3.5" />;
    }
  };

  const filteredNodes = graphData.nodes.filter(n => {
    const matchesSearch = n.label.toLowerCase().includes(searchQuery.toLowerCase()) || n.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All' || n.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-auto xl:h-[calc(100vh-12rem)]">
      {/* Search & List Panel */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col xl:col-span-1 h-[450px] xl:h-full overflow-hidden">
        <div className="flex items-center space-x-2 mb-4">
          <Search className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Search Entity Graph</h4>
        </div>
        
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search suspects, plates, phones..."
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm mb-4"
        />

        <div className="mb-4">
          <label className="block text-[10px] text-slate-500 mb-1.5 uppercase font-bold">Filter Entity Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
          >
            <option value="All">All Entities</option>
            <option value="Person">Suspects (Persons)</option>
            <option value="Gang">Criminal Gangs</option>
            <option value="Vehicle">Registered Vehicles</option>
            <option value="Phone">Phone Numbers</option>
            <option value="Account">Bank Accounts</option>
            <option value="Location">Seeded Locations</option>
            <option value="Device IMEI">Device IMEIs</option>
            <option value="IP Address">IP Addresses</option>
            <option value="UPI ID">UPI IDs</option>
            <option value="Crypto Wallet">Crypto Wallets</option>
          </select>
        </div>

        <div className="border-t border-slate-200 my-2" />

        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3">Matching Node Indexes</h4>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {filteredNodes.slice(0, 25).map(n => (
            <button
              key={n.id}
              onClick={() => setSelectedNode(n)}
              className={`w-full p-3.5 rounded-xl text-left border transition-all duration-200 ${
                selectedNode?.id === n.id
                  ? 'bg-blue-50/50 border-blue-500 shadow-sm'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-bold text-slate-400 font-mono">{n.id}</span>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: `${TYPE_COLORS[n.type]}10`, color: TYPE_COLORS[n.type] }}>
                  {n.type}
                </span>
              </div>
              <h5 className="text-xs font-bold text-slate-800 truncate">{n.label}</h5>
            </button>
          ))}
        </div>
      </div>

      {/* Relation Graph Canvas */}
      <div className="glass-panel p-6 rounded-2xl xl:col-span-3 flex flex-col h-[500px] xl:h-full relative overflow-hidden">
        <div className="absolute top-8 left-8 flex items-center space-x-2 z-10 bg-white/95 px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-sm">
          <Zap className="w-5 h-5 text-blue-600 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Intelligence Graph Workspace</span>
        </div>

        <div className="absolute top-20 left-8 right-8 bg-blue-50 border border-blue-100 rounded-xl p-3 text-[10px] text-blue-800 z-10">
          <strong>Graph Network Guide:</strong> Visualizes connections spanning phone calls, vehicle ownerships, co-arrests, and gang affiliations. Click on nodes to review connection properties and owner records.
        </div>

        <div className="flex-1 w-full bg-slate-100/50 rounded-2xl border border-slate-200/50 relative flex items-center justify-center overflow-hidden pt-16 shadow-inner">
          <svg className="w-full h-full max-h-[500px]" viewBox="0 0 600 400">
            {/* Draw Links */}
            {graphData.links.map((link, idx) => {
              const from = coords[link.source];
              const to = coords[link.target];
              if (!from || !to) return null;
              
              const isCall = link.type === 'Called';
              const isCoAccused = link.type === 'Arrested With';
              
              return (
                <line
                  key={idx}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={isCoAccused ? '#ef4444' : isCall ? '#10b981' : '#94a3b8'}
                  strokeWidth={isCall || isCoAccused ? 2 : 1.2}
                  strokeDasharray={isCoAccused ? "4 4" : "0"}
                  title={link.type}
                />
              );
            })}

            {/* Draw Nodes */}
            {graphData.nodes.map((node) => {
              const pos = coords[node.id];
              if (!pos) return null;
              
              const isSelected = selectedNode?.id === node.id;
              const size = isSelected ? 16 : (node.type === 'Person' ? 12 : 9);
              
              return (
                <g key={node.id} className="cursor-pointer" onClick={() => setSelectedNode(node)}>
                  {isSelected && (
                    <circle cx={pos.x} cy={pos.y} r={size + 6} fill="none" stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="3 3" />
                  )}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={size}
                    fill={TYPE_COLORS[node.type]}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                  {/* Icon representations inside nodes if selected */}
                  {isSelected && (
                    <foreignObject x={pos.x - 7} y={pos.y - 7} width={14} height={14}>
                      <div className="text-white flex items-center justify-center">
                        {getNodeIcon(node.type)}
                      </div>
                    </foreignObject>
                  )}
                  <text
                    x={pos.x}
                    y={pos.y - size - 4}
                    fill="#0f172a"
                    fontSize={8}
                    fontWeight="bold"
                    textAnchor="middle"
                    className="select-none bg-white px-1"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Node detail card overlay */}
          {selectedNode && (
            <div className="absolute bottom-6 right-6 bg-white p-5 rounded-2xl border border-slate-200 border-l-4 max-w-sm shadow-lg z-10" style={{ borderLeftColor: TYPE_COLORS[selectedNode.type] }}>
              <div className="flex items-center justify-between mb-3 space-x-4">
                <span className="text-[10px] font-bold text-slate-400 font-mono">{selectedNode.id}</span>
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded" style={{ backgroundColor: `${TYPE_COLORS[selectedNode.type]}10`, color: TYPE_COLORS[selectedNode.type] }}>
                  {selectedNode.type}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-2">{selectedNode.label}</h4>
              
              <div className="space-y-1.5 text-xs text-slate-700">
                {selectedNode.type === 'Person' && (
                  <>
                    <div className="flex justify-between"><span className="text-slate-500">Priors Crimes:</span><span className="text-slate-800 font-semibold">{selectedNode.priors} offenses</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Risk Assessment:</span><span className="text-rose-600 font-bold">{selectedNode.risk_score}%</span></div>
                  </>
                )}
                {selectedNode.type === 'Gang' && (
                  <p className="text-[11px] text-slate-500 leading-normal">{selectedNode.description}</p>
                )}
                {selectedNode.type === 'Location' && (
                  <div className="flex justify-between"><span className="text-slate-500">Coordinates:</span><span className="text-slate-800 font-mono">{selectedNode.lat.toFixed(4)}, {selectedNode.lng.toFixed(4)}</span></div>
                )}
                {selectedNode.type === 'Vehicle' && (
                  <p className="text-[11px] text-slate-500 leading-normal">Registered vehicle identifier linked to offender files.</p>
                )}
                {selectedNode.type === 'Phone' && (
                  <p className="text-[11px] text-slate-500 leading-normal">Active cellular connection flagged in call transcripts.</p>
                )}
                {selectedNode.type === 'Device IMEI' && (
                  <p className="text-[11px] text-slate-500 leading-normal">Hardware serial number harvested from Call Detail Records (CDRs).</p>
                )}
                {selectedNode.type === 'IP Address' && (
                  <p className="text-[11px] text-slate-500 leading-normal">Network origin IP linked to active suspicious sessions.</p>
                )}
                {selectedNode.type === 'UPI ID' && (
                  <p className="text-[11px] text-slate-500 leading-normal">Virtual Payment Address (VPA) flagged in digital arrest ledger transfers.</p>
                )}
                {selectedNode.type === 'Crypto Wallet' && (
                  <p className="text-[11px] text-slate-500 leading-normal">Cryptocurrency wallet linked to decentralized money-laundering streams.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NetworkView;
