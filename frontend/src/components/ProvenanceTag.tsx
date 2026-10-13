import React from 'react';
import { ProvenanceInfo } from '../types';
import { Building2, Clock } from 'lucide-react';

interface ProvenanceTagProps {
  provenance: ProvenanceInfo;
  showTime?: boolean;
}

export const ProvenanceTag: React.FC<ProvenanceTagProps> = ({ provenance, showTime = true }) => {
  const isHospitalA = provenance.organization_code === 'HOSP_A';
  const formattedDate = provenance.recorded_at
    ? new Date(provenance.recorded_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Unknown Date';

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${
        isHospitalA
          ? 'bg-blue-50 text-blue-800 border-blue-200'
          : 'bg-teal-50 text-teal-800 border-teal-200'
      }`}
      title={`Origin: ${provenance.organization_name} (Recorded: ${provenance.recorded_at})`}
    >
      <Building2 className="w-3 h-3 flex-shrink-0" />
      <span className="truncate max-w-[140px]">{provenance.organization_name}</span>
      {showTime && (
        <>
          <span className="text-slate-300">•</span>
          <span className="flex items-center text-[10px] text-slate-500">
            <Clock className="w-2.5 h-2.5 mr-0.5" />
            {formattedDate}
          </span>
        </>
      )}
    </span>
  );
};
