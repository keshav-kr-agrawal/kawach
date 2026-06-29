import React, { useState, useEffect } from 'react';
import { ShieldCheck, GitMerge, ListFilter, AlertTriangle, RefreshCw, CheckCircle2, XCircle, BarChart3, Server, UserCheck, Timer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function AdminView({ token, user }) {
  const [activeTab, setActiveTab] = useState('superadmin');
  const [merges, setMerges] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchMerges = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('http://localhost:8000/api/admin/entity-merges', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load entity matches');
      const data = await res.json();
      setMerges(data);
    } catch (err) {
      setErrorMsg(err.message || 'Access denied or error loading merges.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('http://localhost:8000/api/audit?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load audit trail');
      const data = await res.json();
      setAuditLogs(data);
    } catch (err) {
      setErrorMsg(err.message || 'Access denied or error loading audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'merges') {
      fetchMerges();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, token]);

  const handleResolve = async (id, action) => {
    try {
      setErrorMsg('');
      setSuccessMsg('');
      const res = await fetch(`http://localhost:8000/api/admin/entity-merges/${id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      
      if (!res.ok) throw new Error('Merge resolution failed');
      const data = await res.json();
      
      setSuccessMsg(data.message);
      fetchMerges();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* View Tabs */}
      <div className="flex space-x-3 bg-white p-2 rounded-2xl border border-slate-200 self-start shadow-sm">
        <button
          onClick={() => setActiveTab('superadmin')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'superadmin'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Super Admin Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('merges')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'merges'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <GitMerge className="w-4 h-4" />
          <span>Entity Resolution Queue ({merges.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Immutable System Security Audits</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl text-center">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl text-center">
          {errorMsg}
        </div>
      )}

      {/* Main Panel Content */}
      <div className="glass-panel p-6 rounded-2xl min-h-[400px]">
        {loading && (
          <div className="flex items-center justify-center py-20 text-xs text-slate-400 space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Syncing Admin data...</span>
          </div>
        )}

        {!loading && activeTab === 'superadmin' && (
          <div className="space-y-6 animate-fade-in select-text">
            {/* Platform Health Metrics Panel */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-905 bg-opacity-70 bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Live Active Users</span>
                  <span className="text-lg font-extrabold text-white">1,284</span>
                </div>
              </div>
              
              <div className="bg-slate-905 bg-opacity-70 bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">AI Classifications</span>
                  <span className="text-lg font-extrabold text-white">18,495</span>
                </div>
              </div>

              <div className="bg-slate-905 bg-opacity-70 bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400">
                  <Server className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">System Uptime</span>
                  <span className="text-lg font-extrabold text-white">99.98%</span>
                </div>
              </div>

              <div className="bg-slate-905 bg-opacity-70 bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400">
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Active Dispatches</span>
                  <span className="text-lg font-extrabold text-white">82 Units</span>
                </div>
              </div>
            </div>

            {/* Graphs Display Segment */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Stacked Bar Chart: Reported vs Resolved */}
              <div className="bg-slate-905 bg-opacity-70 bg-[#0f172a] border border-slate-800 rounded-3xl p-5 flex flex-col gap-4 shadow-md">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Reported vs. Resolved Issues</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Tickets created versus closed across municipal agencies</p>
                </div>
                <div className="h-64 w-full text-slate-800">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Police', reported: 154, resolved: 112 },
                        { name: 'Fire & Rescue', reported: 68, resolved: 59 },
                        { name: 'Health & Medical', reported: 94, resolved: 80 },
                        { name: 'Disaster Mgmt', reported: 45, resolved: 28 },
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                      <YAxis stroke="#94a3b8" fontSize={9} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '10px' }} />
                      <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                      <Bar dataKey="reported" stackId="a" fill="#3b82f6" name="Reported" />
                      <Bar dataKey="resolved" stackId="a" fill="#10b981" name="Resolved" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Donut Chart: Issue Breakdown by Department */}
              <div className="bg-slate-905 bg-opacity-70 bg-[#0f172a] border border-slate-800 rounded-3xl p-5 flex flex-col gap-4 shadow-md">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Department Ingestion Share</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Distribution percentage of all AI-routed incident reports</p>
                </div>
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Police', value: 154 },
                          { name: 'Fire & Rescue', value: 68 },
                          { name: 'Health/Ambulance', value: 94 },
                          { name: 'Disaster Mgmt', value: 45 },
                        ]}
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[
                          { color: '#3b82f6' },
                          { color: '#ef4444' },
                          { color: '#10b981' },
                          { color: '#f59e0b' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '10px' }} />
                      <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '0px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart: Average Resolution Time */}
              <div className="bg-slate-905 bg-opacity-70 bg-[#0f172a] border border-slate-800 rounded-3xl p-5 flex flex-col gap-4 shadow-md lg:col-span-2">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Average Resolution Time by Department</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Average delay from crowdsourced report intake to resolved case closure</p>
                </div>
                <div className="h-56 w-full text-slate-800">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={[
                        { name: 'Fire & Rescue', time: 15 },
                        { name: 'Health/Ambulance', time: 18 },
                        { name: 'Police Department', time: 42 },
                        { name: 'Disaster Mgmt', time: 55 },
                      ]}
                      margin={{ top: 10, right: 10, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={9} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                      <Tooltip formatter={(value) => [`${value} Mins`, 'Avg Resolution Time']} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '10px' }} />
                      <Legend wrapperStyle={{ fontSize: '10px' }} />
                      <Bar dataKey="time" fill="#a855f7" name="Response Delay (Minutes)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>
        )}

        {!loading && activeTab === 'merges' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Duplicate Entity Resolutions</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Profiles with matching metadata requiring manual merge confirmation</p>
              </div>
            </div>

            {merges.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                No duplicate offender profiles currently detected for review.
              </div>
            ) : (
              <div className="space-y-4">
                {merges.map((m) => (
                  <div key={m.id} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-xs">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-[10px] font-bold text-slate-400 font-mono">Match ID: {m.id}</span>
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Confidence Index: {(m.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex space-x-2 mt-3 md:mt-0">
                        <button
                          onClick={() => handleResolve(m.id, 'merge')}
                          className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve & Merge</span>
                        </button>
                        <button
                          onClick={() => handleResolve(m.id, 'reject')}
                          className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject Match</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Offender 1 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl relative">
                        <div className="absolute top-4 right-4 text-[9px] font-extrabold text-blue-600 uppercase tracking-wider">Primary Record</div>
                        <h4 className="text-xs font-bold text-slate-800">{m.offender1.name}</h4>
                        <span className="text-[9px] font-mono text-slate-400 block mt-0.5">{m.offender1.id}</span>
                        
                        <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-slate-600">
                          <div><strong>Age:</strong> {m.offender1.age} ({m.offender1.gender})</div>
                          <div><strong>Priors Count:</strong> {m.offender1.priors}</div>
                          <div className="col-span-2"><strong>Address:</strong> {m.offender1.address}</div>
                        </div>
                      </div>

                      {/* Right: Offender 2 */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl relative border-l-4 border-l-amber-500">
                        <div className="absolute top-4 right-4 text-[9px] font-extrabold text-amber-600 uppercase tracking-wider">Candidate Duplicate</div>
                        <h4 className="text-xs font-bold text-slate-800">{m.offender2.name}</h4>
                        <span className="text-[9px] font-mono text-slate-400 block mt-0.5">{m.offender2.id}</span>
                        
                        <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] text-slate-600">
                          <div><strong>Age:</strong> {m.offender2.age} ({m.offender2.gender})</div>
                          <div><strong>Priors Count:</strong> {m.offender2.priors}</div>
                          <div className="col-span-2"><strong>Address:</strong> {m.offender2.address}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Immutable Compliance Logs</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Ledger tracking all read, write, export, and AI interactions (Retention: 7 Years Minimum)</p>
              </div>
            </div>

            <div className="overflow-y-auto rounded-xl border border-slate-200 bg-white max-h-[500px] shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                    <th className="p-3 pl-4">Timestamp</th>
                    <th className="p-3">Officer Profile</th>
                    <th className="p-3">Event Action</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3 pr-4">Details Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 pl-4 font-mono text-[10px] text-slate-500">
                        {log.timestamp.replace('T', ' ').substring(0, 19)}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800 block">{log.username}</span>
                        <span className="text-[9px] text-slate-400 uppercase font-semibold">{log.role}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          log.action.includes('MERGE') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          log.action.includes('EXPORT') ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          log.action.includes('LOGIN') ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          'bg-slate-50 text-slate-700 border border-slate-200'
                        }`}>
                          {log.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[10px] text-slate-500">{log.ip_address}</td>
                      <td className="p-3 pr-4 text-slate-600 italic text-[11px]">{log.details?.message || log.details?.query}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminView;
