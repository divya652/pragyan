import React, { useState } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckSquare, 
  Square, 
  Lock, 
  FileWarning, 
  X,
  Stethoscope
} from 'lucide-react';

interface BreakGlassModalProps {
  isOpen: boolean;
  patientId: number;
  patientName: string;
  patientNationalId: string;
  onClose: () => void;
  onSubmit: (reason: string, attestation: boolean) => Promise<void>;
}

export const BreakGlassModal: React.FC<BreakGlassModalProps> = ({
  isOpen,
  patientId,
  patientName,
  patientNationalId,
  onClose,
  onSubmit,
}) => {
  const [reasonCategory, setReasonCategory] = useState('ACUTE_EMERGENCY');
  const [customReason, setCustomReason] = useState('');
  const [attestation, setAttestation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attestation) {
      setError('You must sign the legal attestation checkbox to proceed.');
      return;
    }

    const fullReason = `${reasonCategory}: ${customReason}`.trim();
    if (fullReason.length < 15) {
      setError('Please provide a substantive clinical justification (minimum 15 characters).');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(fullReason, true);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Emergency break-glass authorization failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white border-2 border-rose-500 rounded-lg shadow-2xl max-w-xl w-full overflow-hidden text-slate-800">
        
        {/* Warning Banner Header */}
        <div className="bg-rose-700 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-800 rounded">
              <ShieldAlert className="w-6 h-6 text-rose-200" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide uppercase">
                Emergency Break-Glass Access Request
              </h3>
              <p className="text-xs text-rose-100">
                Audited Clinical Protocol for Unassigned Treating Clinicians
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-rose-200 hover:text-white p-1 rounded hover:bg-rose-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Explainer */}
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          <div className="bg-rose-50 border border-rose-200 rounded p-3 flex items-start space-x-2.5 text-rose-900">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Statutory Warning (Zero-Trust Healthcare RBAC):</strong> You are not currently an assigned care team member for this patient. Invoking Break-Glass access will immediately grant temporary emergency visibility to all multi-hospital Protected Health Information (PHI) and dispatch a high-severity alert to the Hospital Compliance & Information Security Forensics Log.
            </div>
          </div>

          {/* Target Patient Demographics */}
          <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[11px] grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500 block">Target Patient:</span>
              <strong className="text-slate-900 text-xs">{patientName}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">National Health ID:</span>
              <strong className="font-mono text-slate-900">{patientNationalId}</strong>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Emergency Classification Reason
              </label>
              <select
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white focus:ring-1 focus:ring-rose-500"
              >
                <option value="ACUTE_EMERGENCY">Acute Clinical Emergency / Immediate Life-Threatening Condition</option>
                <option value="UNRESPONSIVE_PATIENT">Patient Unresponsive in Emergency Department / Urgent Trauma</option>
                <option value="CROSS_HOSPITAL_ALLERGY_CHECK">Critical Medication Cross-Reaction & Allergy Verification</option>
                <option value="SPECIALTY_CONSULTATION">Immediate STAT Sub-Specialty Consult (ICU / Neurology / Cardiology)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinical Rationale & Context (Required for Audit Forensics)
              </label>
              <textarea
                required
                rows={3}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="e.g., Patient presented to ER in acute distress; STAT cross-system medication review required to prevent adverse drug interactions before administering anticoagulants."
                className="w-full border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-rose-500"
              />
            </div>

            {/* Legal Attestation Checkbox */}
            <label className="flex items-start space-x-2.5 bg-slate-100 p-3 rounded border border-slate-300 cursor-pointer hover:bg-slate-50 transition">
              <input
                type="checkbox"
                checked={attestation}
                onChange={(e) => setAttestation(e.target.checked)}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
              />
              <span className="text-[11px] text-slate-700 leading-snug">
                <strong>Clinician Legal Attestation:</strong> I solemnly attest as a licensed healthcare provider that this emergency request is strictly for immediate clinical treatment. I acknowledge this transaction is permanently cryptographically logged and subject to statutory peer review.
              </span>
            </label>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !attestation}
                className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-bold shadow transition disabled:opacity-50 flex items-center space-x-1.5"
              >
                <FileWarning className="w-3.5 h-3.5 mr-1" />
                <span>{submitting ? 'Verifying & Unlocking...' : 'Authorize Emergency Break-Glass'}</span>
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};
