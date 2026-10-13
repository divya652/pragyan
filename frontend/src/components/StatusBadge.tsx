import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'general' | 'severity' | 'lab';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'general' }) => {
  const s = status.toUpperCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';

  if (type === 'severity') {
    if (s.includes('CRITICAL') || s.includes('LIFE_THREATENING') || s.includes('SEVERE')) {
      styles = 'bg-rose-50 text-rose-800 border-rose-200 font-semibold';
    } else if (s.includes('MODERATE')) {
      styles = 'bg-amber-50 text-amber-800 border-amber-200';
    } else {
      styles = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
  } else if (type === 'lab') {
    if (s === 'HIGH' || s === 'CRITICAL') {
      styles = 'bg-red-50 text-red-800 border-red-200 font-semibold';
    } else if (s === 'LOW') {
      styles = 'bg-blue-50 text-blue-800 border-blue-200';
    } else {
      styles = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
  } else {
    // General
    if (s === 'ACTIVE' || s === 'CONFIRMED' || s === 'CHECKED_IN') {
      styles = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    } else if (s === 'SCHEDULED' || s === 'PENDING') {
      styles = 'bg-blue-50 text-blue-800 border-blue-200';
    } else if (s === 'COMPLETED' || s === 'RESOLVED') {
      styles = 'bg-slate-100 text-slate-700 border-slate-200';
    } else if (s === 'CANCELLED' || s === 'REVOKED') {
      styles = 'bg-rose-50 text-rose-800 border-rose-200';
    }
  }

  return (
    <span className={`inline-block px-2 py-0.5 text-[11px] font-medium border rounded uppercase tracking-wider ${styles}`}>
      {status}
    </span>
  );
};
