import React, { useState, useEffect } from 'react';
import { FileText, Shield, Clock, AlertTriangle, UserCheck, ArrowUpRight, CheckCircle2, ChevronRight, Activity, Filter } from 'lucide-react';

function InvestigationsView({ token, user }) {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [assignee, setAssignee] = useState('');
  const [escalatePriority, setEscalatePriority] = useState('High');
  const [escalateReason, setEscalateReason] = useState('');
  const [newStatus, setNewStatus] = useState('Investigation');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchCases = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch('http://localhost:8000/api/investigations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch investigations');
      const data = await res.json();
      setCases(data);
      if (data.length > 0 && !selectedCase) {
        // Fetch details of the first case
        fetchCaseDetails(data[0].id);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error loading cases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCaseDetails = async (caseId) => {
    try {
      setErrorMsg('');
      setSuccessMsg('');
      const res = await fetch(`http://localhost:8000/api/investigations/${caseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch case details');
      const data = await res.json();
      setSelectedCase(data);
      setAssignee(data.assigned_officer_id || '');
      setNewStatus(data.status);
    } catch (err) {
      console.error(err);
      setErrorMsg('Access denied or failed to load case details.');
    }
  };

  useEffect(() => {
    fetchCases();
  }, [token]);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignee) return;
    try {
      setErrorMsg('');
      setSuccessMsg('');
      const res = await fetch(`http://localhost:8000/api/investigations/${selectedCase.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ officer_username: assignee })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to assign case');
      }
      
      setSuccessMsg('Officer assigned successfully!');
      fetchCaseDetails(selectedCase.id);
      fetchCases();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!escalateReason) return;
    try {
      setErrorMsg('');
      setSuccessMsg('');
      const res = await fetch(`http://localhost:8000/api/investigations/${selectedCase.id}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ new_priority: escalatePriority, reason: escalateReason })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to escalate');
      }
      
      setSuccessMsg(`Priority escalated to ${escalatePriority}!`);
      setEscalateReason('');
      fetchCaseDetails(selectedCase.id);
      fetchCases();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleStatusChange = async (e) => {
    e.preventDefault();
    try {
      setErrorMsg('');
      setSuccessMsg('');
      const res = await fetch(`http://localhost:8000/api/investigations/${selectedCase.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ new_status: newStatus })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update status');
      }
      
      setSuccessMsg(`Status updated to ${newStatus}!`);
      fetchCaseDetails(selectedCase.id);
      fetchCases();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const getPriorityColor = (prio) => {
    switch (prio) {
      case 'Critical': return 'bg-rose-50 border border-rose-200 text-rose-700';
      case 'High': return 'bg-amber-50 border border-amber-200 text-amber-700';
      case 'Medium': return 'bg-blue-50 border border-blue-200 text-blue-700';
      default: return 'bg-slate-50 border border-slate-200 text-slate-700';
    }
  };

  const getSlaBadge = (status) => {
    switch (status) {
      case 'Breached': return 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse';
      case 'Warning': return 'bg-amber-100 text-amber-800 border border-amber-200';
      default: return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-auto xl:h-[calc(100vh-12rem)]">
      {/* List Panel */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col xl:col-span-1 h-[450px] xl:h-full overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Assigned Case Files</h4>
          </div>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {cases.length} cases
          </span>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg mb-4 text-center">
            {errorMsg}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400">Loading cases...</div>
          ) : cases.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">No cases found within scope.</div>
          ) : (
            cases.map((c) => (
              <button
                key={c.id}
                onClick={() => fetchCaseDetails(c.id)}
                className={`w-full p-4 rounded-xl text-left border transition-all duration-200 ${
                  selectedCase?.id === c.id
                    ? 'bg-blue-50/50 border-blue-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-bold text-slate-400 font-mono">{c.id}</span>
                  <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${getPriorityColor(c.priority)}`}>
                    {c.priority}
                  </span>
                </div>
                <h5 className="text-xs font-bold text-slate-800 truncate">{c.crime_type}</h5>
                <p className="text-[9px] text-slate-500 truncate mt-1">IPC: {c.ipc_section}</p>
                <div className="flex justify-between items-center mt-3 text-[9px]">
                  <span className="text-slate-400">Officer: {c.assigned_officer_id || 'Unassigned'}</span>
                  <span className={`px-1.5 py-0.5 rounded-sm font-semibold ${getSlaBadge(c.sla_status)}`}>
                    SLA: {c.days_left}d
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Case Details panel */}
      <div className="glass-panel p-6 rounded-2xl xl:col-span-3 flex flex-col h-auto xl:h-full overflow-y-auto">
        {selectedCase ? (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5">
              <div>
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-bold text-slate-900">{selectedCase.crime_type}</h3>
                  <span className="text-xs font-bold text-slate-400 font-mono">({selectedCase.id})</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Filed at **{selectedCase.police_station_name}** under **{selectedCase.ipc_section}**
                </p>
              </div>
              <div className="flex items-center space-x-3 mt-4 md:mt-0">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${getPriorityColor(selectedCase.priority)}`}>
                  {selectedCase.priority} Priority
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${getSlaBadge(selectedCase.days_left < 7 ? 'Warning' : 'OK')}`}>
                  SLA Status: {selectedCase.days_left > 0 ? `${selectedCase.days_left} Days Left` : 'Breached'}
                </span>
              </div>
            </div>

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl text-center">
                {successMsg}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: AI summary, evidence, timeline */}
              <div className="lg:col-span-2 space-y-6">
                {/* AI Summary card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <div className="flex items-center space-x-2 mb-3">
                    <Shield className="w-5 h-5 text-blue-600 animate-pulse" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">AI Investigation Synthesis</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {selectedCase.summary}
                  </p>
                </div>

                {/* Case timeline logs */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <div className="flex items-center space-x-2 mb-4">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Case Audit Timeline</h4>
                  </div>
                  <div className="space-y-4 relative pl-4 border-l border-slate-100">
                    {selectedCase.timeline.map((event, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full border border-white" />
                        <span className="text-[10px] font-bold text-slate-400 font-mono">{event.date.substring(0, 10)}</span>
                        <p className="text-xs text-slate-700 mt-0.5">{event.event}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evidence linkages */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <div className="flex items-center space-x-2 mb-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Evidence Linkages & AI Matches</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedCase.evidence_correlations.length === 0 ? (
                      <p className="text-xs text-slate-400">No correlations currently resolved.</p>
                    ) : (
                      selectedCase.evidence_correlations.map((ev, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-start space-x-3">
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">{ev.type}</span>
                            <h5 className="text-xs font-bold text-slate-800 font-mono mt-0.5">{ev.id}</h5>
                            <p className="text-[10px] text-slate-500 mt-1">{ev.reason}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Case action tools (re-assign, escalate, update status) */}
              <div className="space-y-6">
                {/* Status action card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4">Case Lifecycle Status</h4>
                  <form onSubmit={handleStatusChange} className="space-y-4">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                    >
                      <option value="Investigation">Investigation</option>
                      <option value="Charge Sheeted">Charge Sheeted</option>
                      <option value="Closed">Closed</option>
                    </select>
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-sm transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Update Lifecycle State</span>
                    </button>
                  </form>
                </div>

                {/* Assignment action card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4">Assign Investigating Officer</h4>
                  <form onSubmit={handleAssign} className="space-y-4">
                    <select
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                    >
                      <option value="">-- Choose Officer --</option>
                      <option value="sho">sho (Bengaluru Station Head)</option>
                      <option value="constable">constable ( Bengaluru Constable )</option>
                      <option value="officer">officer (Field Officer)</option>
                    </select>
                    <button
                      type="submit"
                      disabled={!assignee}
                      className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-sm transition-all disabled:opacity-50"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Change Case Assignee</span>
                    </button>
                  </form>
                </div>

                {/* Escalate priority card */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4">Escalate Case Priority</h4>
                  <form onSubmit={handleEscalate} className="space-y-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1.5 uppercase font-bold">Priority Target</label>
                      <select
                        value={escalatePriority}
                        onChange={(e) => setEscalatePriority(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                      >
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1.5 uppercase font-bold">Justification</label>
                      <textarea
                        value={escalateReason}
                        onChange={(e) => setEscalateReason(e.target.value)}
                        placeholder="Provide details for priority escalation..."
                        rows={3}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-sm transition-all"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Escalate Case Priority</span>
                    </button>
                  </form>
                </div>

                {/* Compliance info card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-[10px] text-slate-500 leading-relaxed">
                  <strong>Compliance Warning:</strong> Under Section 15 of state cyber directives, all profile assignments, SLA escalations, and status reviews are recorded into the immutable system audit log. Profiling of religion, caste, or race is strictly forbidden.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 py-12 text-slate-400">
            <Clock className="w-12 h-12 text-slate-300 mb-4 animate-bounce" />
            <h4 className="text-sm font-bold">No Case File Selected</h4>
            <p className="text-xs mt-1">Select a case from the sidebar to inspect case records and update assignments.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default InvestigationsView;
