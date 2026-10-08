import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
      <div className="w-20 h-6 bg-slate-200 rounded-lg" />
    </div>
    <div className="w-3/4 h-5 bg-slate-200 rounded-md mb-2" />
    <div className="w-1/2 h-4 bg-slate-100 rounded-md" />
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-4">
    <div className="w-full space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-slate-100 rounded-2xl animate-pulse" />
      ))}
    </div>
  </div>
);
