import React, { useState, useEffect } from 'react';
import { ShieldCheck, GitMerge, ListFilter, AlertTriangle, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

function AdminView({ token, user }) {
  const [activeTab, setActiveTab] = useState('merges');
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
    } else {
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
