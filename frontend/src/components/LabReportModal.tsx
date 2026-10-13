import React from 'react';
import { LabResultItem } from '../types';
import { X, Printer, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Building2 } from 'lucide-react';

interface LabReportModalProps {
  labResult: LabResultItem | null;
  allLabResults: LabResultItem[];
  patientName: string;
  patientId: string;
  dob: string;
  gender: string;
  onClose: () => void;
}

export const LabReportModal: React.FC<LabReportModalProps> = ({
  labResult,
  allLabResults,
  patientName,
  patientId,
  dob,
  gender,
  onClose,
}) => {
  if (!labResult) return null;

  // Filter other tests from same facility/date for a comprehensive panel slip
  const samePanelTests = allLabResults.filter(
    (l) =>
      l.provenance.organization_code === labResult.provenance.organization_code &&
      new Date(l.test_date).toDateString() === new Date(labResult.test_date).toDateString()
  );

  const displayTests = samePanelTests.length > 0 ? samePanelTests : [labResult];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white border border-slate-300 rounded-lg shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden text-slate-800 max-h-[92vh]">
        
        {/* Modal Top Bar */}
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-sky-700" />
            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
              Clinical Diagnostic Laboratory Report Slip
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded border border-slate-300 shadow-sm transition"
              title="Print Clinical Report"
            >
              <Printer className="w-3.5 h-3.5 mr-1 text-slate-600" />
              <span>Print Report</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200 transition"
              title="Close Report"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Diagnostic Report Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 bg-white font-sans text-xs">
          
          {/* Hospital / Pathology Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-sky-700" />
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  {labResult.provenance.organization_name.toUpperCase()}
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                DEPARTMENT OF PATHOLOGY & CLINICAL BIOCHEMISTRY • CAP & NABL ACCREDITED
              </p>
              <p className="text-[10px] text-slate-400">
                Facility Code: {labResult.provenance.organization_code} • Interoperable LIS System
              </p>
            </div>

            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4 text-[11px] space-y-0.5">
              <div><span className="text-slate-500">Report No:</span> <strong className="font-mono text-slate-900">LAB-{labResult.id}-{new Date(labResult.test_date).getFullYear()}</strong></div>
              <div><span className="text-slate-500">Specimen:</span> <strong className="text-slate-900">Venous Whole Blood / Plasma</strong></div>
              <div><span className="text-slate-500">Collected:</span> <strong className="font-mono text-slate-900">{new Date(labResult.test_date).toLocaleString()}</strong></div>
            </div>
          </div>

          {/* Patient Demographics Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div>
              <span className="text-slate-500 block">Patient Name:</span>
              <strong className="text-slate-900 text-xs">{patientName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Health ID (ABHA):</span>
              <strong className="font-mono text-slate-900">{patientId}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Age / Gender:</span>
              <strong className="text-slate-900">{dob} ({gender})</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Ref. Physician:</span>
              <strong className="text-slate-900">Dr. Arvind Mehta (Cardiology)</strong>
            </div>
          </div>

          {/* Test Panel Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <span>Biochemical Investigation Results</span>
            </h4>

            <table className="w-full text-xs border border-slate-200 rounded overflow-hidden">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="py-2 px-3 text-left">Test Parameter / LOINC</th>
                  <th className="py-2 px-3 text-left">Observed Value</th>
                  <th className="py-2 px-3 text-left">Units</th>
                  <th className="py-2 px-3 text-left">Biological Reference Range</th>
                  <th className="py-2 px-3 text-center">Diagnostic Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayTests.map((test) => {
                  const isHigh = test.flag === 'HIGH' || test.flag === 'CRITICAL';
                  const isLow = test.flag === 'LOW';
                  return (
                    <tr key={test.id} className={isHigh ? 'bg-rose-50/40' : isLow ? 'bg-blue-50/40' : 'hover:bg-slate-50'}>
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {test.test_name}
                        {test.loinc_code && (
                          <span className="block text-[10px] font-mono text-slate-500">
                            LOINC: {test.loinc_code}
                          </span>
                        )}
                      </td>
                      <td className={`py-2 px-3 font-mono font-bold text-sm ${isHigh ? 'text-rose-700' : isLow ? 'text-blue-700' : 'text-slate-900'}`}>
                        {test.result_value}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-mono text-xs">
                        {test.unit || '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-mono text-xs">
                        {test.reference_range || 'Normal'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {test.flag === 'NORMAL' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            NORMAL
                          </span>
                        ) : test.flag === 'HIGH' || test.flag === 'CRITICAL' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertTriangle className="w-3 h-3 mr-0.5 text-rose-600" />
                            {test.flag}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            {test.flag}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Clinical Interpretation / Comments */}
          {labResult.comments && (
            <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1 text-[11px]">
              <span className="font-bold text-slate-700 uppercase tracking-wider block">
                Pathologist Clinical Comments & Remarks:
              </span>
              <p className="text-slate-700 leading-relaxed font-sans">
                {labResult.comments}
              </p>
            </div>
          )}

          {/* Verification Signatures */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-4 text-center text-[11px]">
            <div>
              <div className="h-10 flex items-center justify-center font-serif text-slate-600 italic">
                S. Venkatesh, MD
              </div>
              <div className="border-t border-slate-300 pt-1 font-semibold text-slate-800">
                Dr. S. Venkatesh, MD (Pathology)
              </div>
              <span className="text-slate-500 text-[10px]">Consultant Clinical Pathologist</span>
            </div>

            <div>
              <div className="h-10 flex items-center justify-center font-mono text-xs text-emerald-700">
                <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600" />
                DIGITALLY AUTHENTICATED
              </div>
              <div className="border-t border-slate-300 pt-1 font-semibold text-slate-800">
                Electronic Laboratory Information System
              </div>
              <span className="text-slate-500 text-[10px]">
                HL7 FHIR Interoperability Standard v4.0.1
              </span>
            </div>
          </div>

        </div>

        {/* Modal Bottom */}
        <div className="bg-slate-100 px-4 py-2.5 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500 text-[11px]">
            Official Electronic Medical Record Copy • Confidential Patient Health Information
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded font-semibold transition"
          >
            Close Report
          </button>
        </div>

      </div>
    </div>
  );
};
