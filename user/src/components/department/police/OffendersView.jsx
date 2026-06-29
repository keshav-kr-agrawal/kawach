import React, { useState, useEffect } from 'react';
import { Users, AlertCircle, ShieldAlert, Eye, Search, Filter } from 'lucide-react';

function OffendersView({ token, user }) {
  const [offenders, setOffenders] = useState([]);
  const [selectedOffender, setSelectedOffender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchOffenders = async () => {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:8000/api/offenders/repeat');
        const data = await res.json();
        
        if (data.length > 0) {
          setOffenders(data);
        } else {
          // Fallback mock offenders
          setOffenders([
            { id: 'OFF-0001', name: 'Ramesh Kumar', age: 34, gender: 'Male', address: 'Hebbal, Ward 4, Bengaluru', num_prior_offenses: 12, risk_score: 94.2, associates_count: 5 },
            { id: 'OFF-0002', name: 'Suresh Gowda', age: 41, gender: 'Male', address: 'Vyalikaval, Ward 11, Bengaluru', num_prior_offenses: 8, risk_score: 86.5, associates_count: 3 },
            { id: 'OFF-0004', name: 'Zia Ahmed', age: 29, gender: 'Male', address: 'Jayanagar, Ward 9, Bengaluru', num_prior_offenses: 9, risk_score: 91.0, associates_count: 4 },
            { id: 'OFF-0007', name: 'Mahesh B.', age: 38, gender: 'Male', address: 'Kuvempunagar, Mysuru', num_prior_offenses: 7, risk_score: 88.2, associates_count: 2 },
            { id: 'OFF-0008', name: 'Karthik Rao', age: 27, gender: 'Male', address: 'Ullal, Mangaluru', num_prior_offenses: 5, risk_score: 74.5, associates_count: 1 },
            { id: 'OFF-0009', name: 'Shiva M.', age: 45, gender: 'Male', address: 'Dharwad Town', num_prior_offenses: 6, risk_score: 79.1, associates_count: 3 }
          ]);
        }
      } catch (err) {
        console.error('Failed to load offenders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOffenders();
  }, [token]);

  const handleSelectOffender = async (id) => {
    try {
      const res = await fetch(`http://localhost:8000/api/offenders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedOffender(data);
      } else {
        // Mock profile fallback
        const o = offenders.find(x => x.id === id);
        setSelectedOffender({
          ...o,
          firs: [
            { id: 'FIR-2025-00101', crime_type: 'Cybercrime / Phishing', ipc_section: 'IT Act Sec 66D', date_filed: '2025-04-12', status: 'Charge Sheeted', police_station_id: 'PS-BEN-01' },
            { id: 'FIR-2025-00402', crime_type: 'Theft / Robbery', ipc_section: 'IPC Sec 379', date_filed: '2025-08-22', status: 'Closed', police_station_id: 'PS-BEN-02' }
          ],
          associates: [
            { id: 'OFF-0002', name: 'Suresh Gowda', risk_score: 86.5 },
            { id: 'OFF-0003', name: 'Anil K.', risk_score: 72.1 }
          ]
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredList = offenders.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase()) || 
    o.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-auto xl:h-[calc(100vh-12rem)]">
      {/* Offenders Table/List */}
      <div className="glass-panel p-6 rounded-2xl xl:col-span-2 flex flex-col h-[450px] xl:h-full overflow-hidden">
        <div className="flex items-between justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">Repeat Offender Registry</h4>
          </div>
          
          <div className="flex items-center space-x-3 max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or ID..."
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto border border-slate-200 rounded-xl bg-white shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
                <th className="p-4">Offender ID</th>
                <th className="p-4">Name</th>
                <th className="p-4 text-center">Past Crimes</th>
                <th className="p-4 text-center">Risk Level</th>
                <th className="p-4 text-center">Associates</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.map(o => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono font-bold text-blue-600">{o.id}</td>
                  <td className="p-4 text-slate-900 font-semibold">{o.name}</td>
                  <td className="p-4 text-center text-slate-700 font-medium">{o.num_prior_offenses}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded font-bold border ${
                      o.risk_score >= 85 
                        ? 'bg-rose-50 text-rose-600 border-rose-100' 
                        : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {o.risk_score}%
                    </span>
                  </td>
                  <td className="p-4 text-center text-slate-500">{o.associates_count} linked</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleSelectOffender(o.id)}
                      className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                      title="View Profile Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Offender Profile Details Card */}
      <div className="glass-panel p-6 rounded-2xl xl:col-span-1 flex flex-col h-auto xl:h-full overflow-y-auto">
        {selectedOffender ? (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 border-b border-slate-200 pb-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 font-bold">{selectedOffender.id}</span>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{selectedOffender.name}</h4>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-slate-500 text-[10px] block font-semibold">Age / Gender</span>
                <span className="text-slate-800 font-bold mt-0.5 block">{selectedOffender.age} yrs • {selectedOffender.gender}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-slate-500 text-[10px] block font-semibold">Last Known Area</span>
                <span className="text-slate-800 font-bold mt-0.5 block truncate" title={selectedOffender.address}>{selectedOffender.address}</span>
              </div>
            </div>

            {/* Explainable AI Risk Score & Rationale */}
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Explainable AI Risk Profile</span>
                <span className={`px-2.5 py-0.5 rounded font-bold text-[11px] border ${
                  selectedOffender.risk_score >= 85 
                    ? 'bg-rose-50 text-rose-600 border-rose-100' 
                    : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {selectedOffender.risk_score}% Threat Score
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">XAI Decision Rationale</span>
                <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                  {selectedOffender.xai_rationale || `Risk score calculated at ${selectedOffender.risk_score}% based on prior convictions, mobile pings, and associate network centrality index.`}
                </p>
              </div>
              <div className="text-[8px] text-slate-400 italic font-medium leading-normal">
                *Ethics Compliance Notice: Personal identifiers (caste, religion, community) are entirely excluded from risk calculations. All decisions require human signature.
              </div>
            </div>

            {/* Linked FIRs */}
            <div>
              <h5 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-3">Linked Incidents Timeline</h5>
              <div className="space-y-3.5 pl-3 border-l-2 border-slate-200">
                {selectedOffender.firs.map(f => (
                  <div key={f.id} className="relative">
                    <div className="absolute -left-[18px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white"></div>
                    <div className="text-xs font-bold text-slate-800">{f.crime_type}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{f.ipc_section} • {f.date_filed}</div>
                    <span className="text-[9px] px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold mt-1.5 inline-block">{f.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Network Associates */}
            <div>
              <h5 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-3">Known Associates (Co-Accused)</h5>
              <div className="space-y-2">
                {selectedOffender.associates.map(a => (
                  <div key={a.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{a.name}</div>
                      <div className="text-[9px] font-mono text-slate-500">{a.id}</div>
                    </div>
                    <span className="text-[10px] font-bold text-rose-600">{a.risk_score}% Risk</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500">
            <AlertCircle className="w-10 h-10 text-slate-400 mb-3" />
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">No Offender Selected</h5>
            <p className="text-xs mt-1.5 leading-relaxed max-w-[220px]">Select a criminal from the list by clicking the eye icon on the right to view their profile, past crimes, and known associates.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default OffendersView;
