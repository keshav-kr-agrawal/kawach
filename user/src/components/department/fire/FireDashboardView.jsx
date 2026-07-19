import React from 'react';
import MultiDepartmentView from '../MultiDepartmentView';

export default function FireDashboardView() {
  return (
    <div className="p-6 bg-white min-h-screen text-slate-900 flex flex-col gap-6 select-text">
      <div className="flex justify-between items-center border-b border-yellow-400/20 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-950 font-sora">
            Fire & Rescue <span className="font-serif italic font-normal text-[#b08850] pr-1">Control Console</span>
          </h2>
          <span className="text-[10px] font-bold text-[#b08850] uppercase tracking-widest font-mono">Isolated Emergency Response Node</span>
        </div>
      </div>
      <MultiDepartmentView initialDept="FIRE" hideSidebar={true} />
    </div>
  );
}
