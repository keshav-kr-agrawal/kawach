import React from 'react';
import MultiDepartmentView from '../MultiDepartmentView';

export default function HealthDashboardView() {
  return (
    <div className="p-6 bg-slate-950 min-h-screen text-slate-100 flex flex-col gap-6 select-text">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider">Health & Ambulance Dispatch Control</h2>
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Isolated Emergency Node</span>
        </div>
      </div>
      <MultiDepartmentView initialDept="HEALTH" hideSidebar={true} />
    </div>
  );
}
