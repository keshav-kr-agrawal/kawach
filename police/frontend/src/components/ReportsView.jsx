import React, { useState, useEffect } from 'react';
import { FileText, Download, ShieldAlert, CheckCircle2, History, Database, BarChart4 } from 'lucide-react';

function ReportsView({ token, user }) {
  const [reports, setReports] = useState([]);
  const [reportType, setReportType] = useState('district_performance');
  const [format, setFormat] = useState('pdf');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchReports = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch reports list');
      const data = await res.json();
      setReports(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');

    try {
      const res = await fetch('http://localhost:8000/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ report_type: reportType, format: format })
      });
      
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      
      setSuccessMsg(`Report "${data.report.name}" compiled and logged in security ledger! Click Download below to save.`);
      fetchReports();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-auto xl:h-[calc(100vh-12rem)]">
      {/* Configuration panel */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col xl:col-span-1 h-auto xl:h-full overflow-y-auto">
        <div className="flex items-center space-x-2 mb-6">
          <BarChart4 className="w-5 h-5 text-indigo-600 animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Compile Official Reports</h4>
        </div>

        <form onSubmit={handleGenerate} className="space-y-6">
          <div>
            <label className="block text-[10px] text-slate-500 mb-1.5 uppercase font-bold">Report Template Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
            >
              <option value="district_performance">District Performance Statistics</option>
              <option value="repeat_offenders">Repeat Offenders Watchlist</option>
              <option value="case_sla_breach">Case SLA Breach Analysis</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 mb-1.5 uppercase font-bold">Target File Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
            >
              <option value="pdf">Adobe PDF Document (.pdf)</option>
              <option value="excel">Microsoft Excel Ledger (.xlsx)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs shadow-md shadow-indigo-100 disabled:opacity-50 transition-all transform active:scale-95"
          >
            <Database className="w-4 h-4" />
            <span>{loading ? 'Compiling Ledger...' : 'Generate and Audit Report'}</span>
          </button>
        </form>

        <div className="border-t border-slate-200 my-6" />

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">Audit Control Matrix</h5>
            <p className="text-[9px] text-slate-500 mt-1 leading-normal">
              Reports compiled by law-enforcement personnel contain sensitive details and require an immediate log signature. Exporting logs is kept in the main Administration panel.
            </p>
          </div>
        </div>
      </div>

      {/* Compiled reports grid / ledger */}
      <div className="glass-panel p-6 rounded-2xl xl:col-span-2 flex flex-col h-auto xl:h-full overflow-hidden">
        <div className="flex items-center space-x-2 mb-4 border-b border-slate-200 pb-4">
          <History className="w-5 h-5 text-indigo-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Export Ledger history</h4>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 flex items-center space-x-3 text-xs text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p>{successMsg}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-inner">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                <th className="p-3 pl-4">Report Details</th>
                <th className="p-3">Created By</th>
                <th className="p-3">File Specs</th>
                <th className="p-3 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((rep) => (
                <tr key={rep.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-3.5 pl-4">
                    <div className="flex items-start space-x-2.5">
                      <FileText className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <h5 className="font-bold text-slate-800">{rep.name}</h5>
                        <span className="text-[9px] text-slate-400 font-mono block mt-0.5">{rep.id} — {rep.created_at.substring(0, 16).replace('T', ' ')}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-600 font-semibold">{rep.user}</td>
                  <td className="p-3.5">
                    <span className="bg-slate-100 text-slate-600 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                      {rep.format}
                    </span>
                    <span className="text-slate-400 text-[10px] ml-2 font-mono">{rep.size}</span>
                  </td>
                  <td className="p-3.5 text-right pr-4">
                    <button
                      onClick={() => alert(`Initiating mock file download for ${rep.id} (${rep.name})`)}
                      className="p-1.5 bg-white border border-slate-200 hover:border-indigo-500 text-slate-600 hover:text-indigo-600 rounded-lg shadow-sm transition-all"
                      title="Download compiled file"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ReportsView;
