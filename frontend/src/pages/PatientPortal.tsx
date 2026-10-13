import React, { useState, useEffect } from 'react';
import { patientPortalApi } from '../api/client';
import { UnifiedChart, ConsentDirective } from '../types';
import { ProvenanceTag } from '../components/ProvenanceTag';
import { StatusBadge } from '../components/StatusBadge';
import { RadiologyViewerModal } from '../components/RadiologyViewerModal';
import { LabReportModal } from '../components/LabReportModal';
import { RadiologyItem, LabResultItem } from '../types';
import { 
  User, 
  ShieldCheck, 
  Lock, 
  Eye, 
  History, 
  FileText, 
  Pill, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Building2,
  Info,
  Printer,
  ImageIcon,
  Thermometer,
  Calendar
} from 'lucide-react';

export const PatientPortal: React.FC = () => {
  const [chart, setChart] = useState<UnifiedChart | null>(null);
  const [consents, setConsents] = useState<ConsentDirective[]>([]);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'records' | 'consent' | 'audit'>('records');

  const [consentPolicy, setConsentPolicy] = useState('FULL_SHARING');
  const [consentNotes, setConsentNotes] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modals
  const [selectedRadiologyStudy, setSelectedRadiologyStudy] = useState<RadiologyItem | null>(null);
  const [selectedLabReport, setSelectedLabReport] = useState<LabResultItem | null>(null);


  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [chartData, consentsData, logsData] = await Promise.all([
        patientPortalApi.getMyRecords(),
        patientPortalApi.getMyConsents(),
        patientPortalApi.getMyAccessLog(),
      ]);
      setChart(chartData);
      setConsents(consentsData);
      setAccessLogs(logsData);

      const active = consentsData.find((c) => c.status === 'ACTIVE');
      if (active) {
        setConsentPolicy(active.consent_type);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load patient records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateConsent = async (policy: string) => {
    try {
      await patientPortalApi.updateConsent({
        consent_type: policy,
        notes: consentNotes || `Patient updated sharing policy to ${policy}`,
      });
      setConsentPolicy(policy);
      setActionMessage(`Sharing policy successfully updated to ${policy}.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update consent');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center text-xs text-slate-500">
        Loading personal health record securely...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Patient Header */}
      <div className="bg-white border border-slate-200 rounded p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-100 text-emerald-800 p-2 rounded">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">{chart?.full_name || 'My Patient Profile'}</h2>
                <span className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                  {chart?.national_health_id}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                DOB: <strong>{chart?.dob}</strong> • Gender: <strong>{chart?.gender}</strong> • Blood Group: <strong>{chart?.blood_group || 'O+'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded border border-slate-300 shadow-sm transition"
              title="Print or export personal health summary"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Download / Print Summary</span>
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500">Current Sharing Directive:</span>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded border ${
                consentPolicy === 'FULL_SHARING'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : consentPolicy === 'EMERGENCY_ONLY'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {consentPolicy.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded flex items-center justify-between">
          <span className="flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
            {actionMessage}
          </span>
          <button onClick={() => setActionMessage(null)} className="underline text-[11px]">Dismiss</button>
        </div>
      )}

      {/* Navigation tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-3 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('records')}
            className={`py-2 px-3 border-b-2 transition ${
              activeTab === 'records'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            My Consolidated Medical Records
          </button>
          <button
            onClick={() => setActiveTab('consent')}
            className={`py-2 px-3 border-b-2 transition ${
              activeTab === 'consent'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Data-Sharing & Consent Directives
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-2 px-3 border-b-2 transition ${
              activeTab === 'audit'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Access Audit Log ({accessLogs.length})
          </button>
        </nav>
      </div>

      {/* Tab 1: Records */}
      {activeTab === 'records' && chart && (
        <div className="space-y-5">
          
          {/* Active Diagnoses */}
          <div className="clinical-card p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <FileText className="w-4 h-4 mr-1.5 text-slate-600" />
              Active Medical Diagnoses & Conditions ({chart.diagnoses.length})
            </h3>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>ICD-10</th>
                    <th>Diagnosis Description</th>
                    <th>Status</th>
                    <th>Source Hospital</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.diagnoses.map((d) => (
                    <tr key={d.id}>
                      <td className="font-mono text-xs font-bold text-slate-800">{d.icd10_code || 'R69'}</td>
                      <td className="font-semibold text-slate-900">{d.description}</td>
                      <td><StatusBadge status={d.clinical_status} /></td>
                      <td><ProvenanceTag provenance={d.provenance} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Medications */}
          <div className="clinical-card p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <Pill className="w-4 h-4 mr-1.5 text-slate-600" />
              Prescriptions & Current Medications ({chart.medications.length})
            </h3>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Medication Name</th>
                    <th>Dosage Strength</th>
                    <th>Timing / Frequency</th>
                    <th>Status</th>
                    <th>Source Hospital</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.medications.map((m) => (
                    <tr key={m.id}>
                      <td className="font-bold text-slate-900">{m.medication_name}</td>
                      <td className="font-mono text-xs">{m.dosage}</td>
                      <td className="text-slate-600">{m.frequency || 'Standard'}</td>
                      <td><StatusBadge status={m.status} /></td>
                      <td><ProvenanceTag provenance={m.provenance} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Allergies */}
          <div className="clinical-card p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <AlertCircle className="w-4 h-4 mr-1.5 text-rose-600" />
              Allergies & Intolerances ({chart.allergies.length})
            </h3>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Allergen Substance</th>
                    <th>Reaction Manifestation</th>
                    <th>Severity</th>
                    <th>Source Hospital</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.allergies.map((a) => (
                    <tr key={a.id}>
                      <td className="font-bold text-slate-900">{a.allergen}</td>
                      <td className="text-slate-700">{a.reaction || 'Unspecified'}</td>
                      <td><StatusBadge status={a.severity} type="severity" /></td>
                      <td><ProvenanceTag provenance={a.provenance} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Diagnostic Laboratory Panels */}
          <div className="clinical-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                <Thermometer className="w-4 h-4 mr-1.5 text-sky-700" />
                Laboratory Test Results ({chart.lab_results.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Investigation Name</th>
                    <th>Result Value</th>
                    <th>Reference Interval</th>
                    <th>Status Flag</th>
                    <th>Source Hospital</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.lab_results.map((l) => (
                    <tr key={l.id}>
                      <td className="font-bold text-slate-900">{l.test_name}</td>
                      <td className="font-mono font-bold text-slate-900">{l.result_value} {l.unit || ''}</td>
                      <td className="text-slate-600 font-mono text-[11px]">{l.reference_range || 'Normal'}</td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.flag === 'NORMAL'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {l.flag}
                        </span>
                      </td>
                      <td><ProvenanceTag provenance={l.provenance} /></td>
                      <td className="text-right">
                        <button
                          onClick={() => setSelectedLabReport(l)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-sky-800 border border-sky-300 rounded text-[11px] font-semibold transition shadow-sm"
                        >
                          View Official Lab Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Radiology Imaging Studies */}
          <div className="clinical-card p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <ImageIcon className="w-4 h-4 mr-1.5 text-sky-700" />
              Radiology Diagnostic Imaging ({chart.radiology?.length || 0})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(chart.radiology || []).map((rad) => (
                <div key={rad.id} className="bg-white border border-slate-200 rounded overflow-hidden shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="bg-black relative aspect-[16/10] overflow-hidden flex items-center justify-center cursor-pointer group"
                      onClick={() => setSelectedRadiologyStudy(rad)}
                    >
                      <img src={rad.image_url} alt={rad.study_type} className="w-full h-full object-contain group-hover:scale-105 transition" />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="bg-sky-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center space-x-1">
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          <span>View Full DICOM</span>
                        </span>
                      </div>
                    </div>
                    <div className="p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{rad.study_type}</span>
                        <span className="bg-slate-100 text-slate-800 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">{rad.modality}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">{rad.impression}</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                    <ProvenanceTag provenance={rad.provenance} />
                    <button
                      onClick={() => setSelectedRadiologyStudy(rad)}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-sky-700 text-white rounded text-[11px] font-semibold transition"
                    >
                      Inspect Scan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Tab 2: Consent Management */}
      {activeTab === 'consent' && (
        <div className="space-y-5">
          
          <div className="bg-white border border-slate-200 rounded p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                <ShieldCheck className="w-4 h-4 mr-2 text-emerald-600" />
                Interoperability Consent & Cross-Hospital Sharing Directives
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                You possess legal authority to determine how your health information is consolidated across participating hospitals. Select your desired sharing policy:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* Option 1: Full Sharing */}
              <div className={`p-4 rounded border transition cursor-pointer ${
                consentPolicy === 'FULL_SHARING'
                  ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`} onClick={() => handleUpdateConsent('FULL_SHARING')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">Full Interoperability Sharing</span>
                  {consentPolicy === 'FULL_SHARING' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-[11px] text-slate-600">
                  Authorizes treating clinicians across Metro General Hospital and St. Jude Community Health to aggregate your records to prevent adverse drug events.
                </p>
              </div>

              {/* Option 2: Emergency Only */}
              <div className={`p-4 rounded border transition cursor-pointer ${
                consentPolicy === 'EMERGENCY_ONLY'
                  ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`} onClick={() => handleUpdateConsent('EMERGENCY_ONLY')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">Emergency Care Only</span>
                  {consentPolicy === 'EMERGENCY_ONLY' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                </div>
                <p className="text-[11px] text-slate-600">
                  Withholds cross-institutional sharing during routine outpatient care; permits aggregation exclusively during life-threatening emergency encounters.
                </p>
              </div>

              {/* Option 3: Revoke Sharing */}
              <div className={`p-4 rounded border transition cursor-pointer ${
                consentPolicy === 'REVOKED'
                  ? 'border-rose-500 bg-rose-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`} onClick={() => handleUpdateConsent('REVOKED')}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">Revoke External Sharing</span>
                  {consentPolicy === 'REVOKED' && <XCircle className="w-4 h-4 text-rose-600" />}
                </div>
                <p className="text-[11px] text-slate-600">
                  Blocks cross-hospital aggregation. External clinicians cannot access your multi-hospital unified chart.
                </p>
              </div>

            </div>

            {/* Legal / Provenance Disclaimer */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded text-[11px] text-slate-600 flex items-start space-x-2">
              <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Legal & Technical Limitations of Revocation:</strong> Revocation applies to all future requests. In accordance with applicable healthcare information management regulations, data previously disclosed during lawful clinical treatment or independently recorded by hospital facilities cannot be erased retrospectively.
              </div>
            </div>
          </div>

          {/* Historical Consents Table */}
          <div className="clinical-card p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Consent History & Audit Log
            </h4>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Directive ID</th>
                    <th>Policy Type</th>
                    <th>Granted Date</th>
                    <th>Status</th>
                    <th>Notes & Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {consents.map((c) => (
                    <tr key={c.id}>
                      <td className="font-mono text-xs">CONSENT-#{c.id}</td>
                      <td className="font-semibold text-slate-800">{c.consent_type}</td>
                      <td className="text-slate-600">{c.valid_from}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td className="text-slate-600 text-xs">{c.notes || 'Patient portal submission'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Tab 3: Access Audit Log */}
      {activeTab === 'audit' && (
        <div className="clinical-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                <History className="w-4 h-4 mr-1.5 text-slate-600" />
                Transparency Log: Provider Access to Your Records
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Every view or inquiry into your Protected Health Information is recorded in an indelible audit trail.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Healthcare Provider</th>
                  <th>Role</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {accessLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-500 text-xs">
                      No external access logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  accessLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="font-mono text-xs text-slate-700">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="font-semibold text-slate-900">{log.action}</td>
                      <td className="text-slate-700">{log.actor_name}</td>
                      <td>
                        <span className="text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          {log.actor_role}
                        </span>
                      </td>
                      <td><StatusBadge status={log.outcome} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Radiology PACS Viewer */}
      <RadiologyViewerModal
        study={selectedRadiologyStudy}
        patientName={chart?.full_name || 'My Record'}
        patientId={chart?.national_health_id || ''}
        onClose={() => setSelectedRadiologyStudy(null)}
      />

      {/* Modal 2: Diagnostic Laboratory Report Slip */}
      <LabReportModal
        labResult={selectedLabReport}
        allLabResults={chart?.lab_results || []}
        patientName={chart?.full_name || 'My Record'}
        patientId={chart?.national_health_id || ''}
        dob={chart?.dob || ''}
        gender={chart?.gender || ''}
        onClose={() => setSelectedLabReport(null)}
      />

    </div>
  );
};
