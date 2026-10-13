import React, { useState, useEffect } from 'react';
import { clinicalApi, doctorApi, labApi, pharmacyApi, opdApi, billingApi } from '../api/client';
import { 
  PatientDemographics, 
  UnifiedChart, 
  TimelineEvent, 
  DataConflict,
  RadiologyItem,
  LabResultItem,
  DoctorProfile,
  PatientSearchCandidate,
  OpdEncounter
} from '../types';
import { ProvenanceTag } from '../components/ProvenanceTag';

import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { RadiologyViewerModal } from '../components/RadiologyViewerModal';
import { LabReportModal } from '../components/LabReportModal';
import { LabTrendVisual } from '../components/LabTrendVisual';
import { BreakGlassModal } from '../components/BreakGlassModal';
import { 
  Activity, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  FileText, 
  Filter, 
  HeartPulse, 
  Pill, 
  ShieldAlert, 
  Stethoscope, 
  Thermometer, 
  UserCheck, 
  CheckCircle,
  PlusCircle,
  Building2,
  RefreshCw,
  Eye,
  FileWarning,
  ImageIcon,
  Search,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Award,
  Users,
  CreditCard,
  FlaskConical,
  BadgeCheck,
  AlertCircle
} from 'lucide-react';

export const DoctorWorkspace: React.FC = () => {
  const [assignedPatients, setAssignedPatients] = useState<PatientDemographics[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [chart, setChart] = useState<UnifiedChart | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [conflicts, setConflicts] = useState<DataConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Doctor Profile state
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);

  // Anti-False-Merge safe search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCandidates, setSearchCandidates] = useState<PatientSearchCandidate[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Live OPD Queue state
  const [opdQueue, setOpdQueue] = useState<OpdEncounter[]>([]);

  // Filters for timeline
  const [orgFilter, setOrgFilter] = useState('ALL');
  const [catFilter, setCatFilter] = useState('ALL');
  const [isEmergency, setIsEmergency] = useState(false);

  // Active view tab: Overview, Medical History, Laboratory, Radiology, Medications, Visits
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'labs' | 'radiology' | 'medications' | 'visits'>('overview');

  // Modals state
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isAddEncounterOpen, setIsAddEncounterOpen] = useState(false);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [consultationSubmitting, setConsultationSubmitting] = useState(false);
  const [consultationSuccessMsg, setConsultationSuccessMsg] = useState<string | null>(null);
  const [activeConsultationEncounterId, setActiveConsultationEncounterId] = useState<number | null>(null);

  const [isBreakGlassModalOpen, setIsBreakGlassModalOpen] = useState(false);
  const [selectedRadiologyStudy, setSelectedRadiologyStudy] = useState<RadiologyItem | null>(null);
  const [selectedLabReport, setSelectedLabReport] = useState<LabResultItem | null>(null);
  
  const [selectedConflict, setSelectedConflict] = useState<DataConflict | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Unassigned patient lookup
  const [manualLookupId, setManualLookupId] = useState('1');

  // Comprehensive Consultation form state
  const [consultationData, setConsultationData] = useState({
    clinical_notes: 'Patient presented for clinical assessment. Stable cardiovascular and respiratory parameters.',
    primary_diagnosis: 'Essential (primary) hypertension',
    icd10_code: 'I10',
    severity: 'MODERATE',
    follow_up_days: 14,
    follow_up_reason: 'Review blood pressure log and diagnostic blood panel',
    order_lab: true,
    lab_test_name: 'Complete Blood Count (CBC) & Lipid Profile',
    lab_priority: 'ROUTINE',
    sample_type: 'Whole Blood (EDTA)',
    prescribe_med: true,
    med_name: 'Amlodipine Besylate',
    med_strength: '5 mg',
    med_dosage: '1 tablet',
    med_route: 'Oral',
    med_frequency: 'Once daily (Morning)',
    med_duration: '14 days',
    med_instructions: 'Take 1 tablet every morning with water. Monitor blood pressure weekly.',
    generate_bill: true,
    consultation_fee: 500,
  });

  // New encounter form state
  const [newEncounterData, setNewEncounterData] = useState({
    encounter_type: 'OUTPATIENT',
    department: 'Cardiology Clinic',
    reason: 'Follow-up consultation and treatment review',
    clinical_notes: '',
    diag_desc: 'Cardiovascular follow-up',
    diag_icd: 'I10',
  });

  const fetchAssignedPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await clinicalApi.getAssignedPatients();
      setAssignedPatients(data);
      if (data.length > 0) {
        setSelectedPatientId(data[0].id);
      } else {
        // If unassigned doctor has no patients, auto-target patient 1 for demonstration of the break-glass barrier
        setSelectedPatientId(1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load clinician care cohort.');
    } finally {
      setLoading(false);
    }
  };

  const loadPatientChart = async (patientId: number, emergency: boolean) => {
    setChartLoading(true);
    setError(null);
    try {
      const [chartData, timelineData, conflictsData] = await Promise.all([
        clinicalApi.getUnifiedChart(patientId, emergency),
        clinicalApi.getUnifiedTimeline(patientId, orgFilter, catFilter, emergency),
        clinicalApi.getConflicts(patientId),
      ]);
      setChart(chartData);
      setTimeline(timelineData);
      setConflicts(conflictsData);
    } catch (err: any) {
      setError(err.message || 'Access Denied: You are not authorized for this patient.');
      setChart(null);
    } finally {
      setChartLoading(false);
    }
  };

  const fetchDoctorProfile = async () => {
    try {
      const prof = await doctorApi.getMyProfile();
      setDoctorProfile(prof);
    } catch {}
  };

  const fetchOpdQueue = async () => {
    try {
      const q = await opdApi.getQueue();
      setOpdQueue(q);
    } catch {}
  };

  useEffect(() => {
    fetchAssignedPatients();
    fetchDoctorProfile();
    fetchOpdQueue();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      loadPatientChart(selectedPatientId, isEmergency);
    }
  }, [selectedPatientId, isEmergency]);

  useEffect(() => {
    if (selectedPatientId && chart) {
      clinicalApi.getUnifiedTimeline(selectedPatientId, orgFilter, catFilter, isEmergency)
        .then(setTimeline)
        .catch(console.error);
    }
  }, [orgFilter, catFilter]);

  const handleSearchPatients = async (queryText: string) => {
    setSearchQuery(queryText);
    if (!queryText.trim()) {
      setSearchCandidates([]);
      setSearchPerformed(false);
      return;
    }
    setSearchLoading(true);
    try {
      const results = await doctorApi.searchPatients(queryText);
      setSearchCandidates(results);
      setSearchPerformed(true);
    } catch (err: any) {
      alert(err.message || 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectCandidate = (candidate: PatientSearchCandidate) => {
    setSelectedPatientId(candidate.id);
    setSearchCandidates([]);
    setSearchPerformed(false);
    setSearchQuery('');
  };

  const handleCallPatient = async (enc: OpdEncounter) => {
    try {
      await opdApi.updateStatus(enc.id, 'WITH_DOCTOR');
      setSelectedPatientId(enc.master_patient_id);
      setActiveConsultationEncounterId(enc.id);
      await fetchOpdQueue();
    } catch (err: any) {
      alert(err.message || 'Failed to call patient');
    }
  };

  const handleOpenConsultation = (encId?: number) => {
    setActiveConsultationEncounterId(encId || null);
    setIsConsultationModalOpen(true);
  };

  const handleCompleteConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setConsultationSubmitting(true);
    try {
      // 1. Submit consultation notes
      await doctorApi.completeConsultation({
        encounter_id: activeConsultationEncounterId || 1,
        clinical_notes: consultationData.clinical_notes,
        primary_diagnosis: consultationData.primary_diagnosis,
        icd10_code: consultationData.icd10_code,
        severity: consultationData.severity,
        follow_up_days: consultationData.follow_up_days,
        follow_up_reason: consultationData.follow_up_reason,
      });

      // 2. Order Lab test if checked
      if (consultationData.order_lab && consultationData.lab_test_name) {
        await labApi.createOrder({
          master_patient_id: selectedPatientId,
          encounter_id: activeConsultationEncounterId,
          test_name: consultationData.lab_test_name,
          priority: consultationData.lab_priority,
          laboratory_name: 'Central Clinical Pathology Lab',
          sample_type: consultationData.sample_type,
          clinical_notes: `Clinical diagnosis: ${consultationData.primary_diagnosis}`,
        });
      }

      // 3. Prescribe medication if checked
      if (consultationData.prescribe_med && consultationData.med_name) {
        await pharmacyApi.createPrescription({
          master_patient_id: selectedPatientId,
          encounter_id: activeConsultationEncounterId,
          medication_name: consultationData.med_name,
          strength: consultationData.med_strength,
          dosage: consultationData.med_dosage,
          route: consultationData.med_route,
          frequency: consultationData.med_frequency,
          duration: consultationData.med_duration,
          quantity_prescribed: 14,
          instructions: consultationData.med_instructions,
        });
      }

      // 4. Generate bill if checked
      if (consultationData.generate_bill && consultationData.consultation_fee > 0) {
        await billingApi.createBill({
          master_patient_id: selectedPatientId,
          encounter_id: activeConsultationEncounterId,
          bill_type: 'OPD_CONSULTATION',
          items: [
            {
              item_description: `Attending Consultation - ${doctorProfile?.specialty || 'Physician'}`,
              unit_price: consultationData.consultation_fee,
              quantity: 1,
            },
          ],
          notes: `Consultation fee for ${chart?.full_name || 'Patient'}`,
        });
      }

      // 5. Update OPD status
      if (activeConsultationEncounterId) {
        await opdApi.updateStatus(activeConsultationEncounterId, 'CONSULTATION_COMPLETED', consultationData.clinical_notes);
      }

      setConsultationSuccessMsg('Clinical consultation finalized! Diagnostic lab orders dispatched, e-prescription sent to pharmacy queue, and billing charges generated.');
      setIsConsultationModalOpen(false);
      await loadPatientChart(selectedPatientId, isEmergency);
      await fetchOpdQueue();
    } catch (err: any) {
      alert(err.message || 'Failed to complete consultation');
    } finally {
      setConsultationSubmitting(false);
    }
  };

  const handleResolveConflict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConflict) return;
    try {
      await clinicalApi.resolveConflict(selectedConflict.id, resolutionNotes);
      setIsConflictModalOpen(false);
      setResolutionNotes('');
      if (selectedPatientId) {
        loadPatientChart(selectedPatientId, isEmergency);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to resolve discrepancy');
    }
  };

  const handleCreateEncounter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    try {
      await clinicalApi.createEncounter(selectedPatientId, {
        encounter_type: newEncounterData.encounter_type,
        department: newEncounterData.department,
        reason: newEncounterData.reason,
        encounter_date: new Date().toISOString(),
        clinical_notes: newEncounterData.clinical_notes,
        diagnoses: [
          {
            description: newEncounterData.diag_desc,
            icd10_code: newEncounterData.diag_icd,
            severity: 'MODERATE',
          },
        ],
      });
      setIsAddEncounterOpen(false);
      loadPatientChart(selectedPatientId, isEmergency);
    } catch (err: any) {
      alert(err.message || 'Failed to record clinical encounter note');
    }
  };

  const handleBreakGlassSubmit = async (reason: string, attestation: boolean) => {
    if (!selectedPatientId) return;
    await clinicalApi.requestBreakGlassAccess(selectedPatientId, reason, attestation);
    // Reload assigned patients and chart
    await fetchAssignedPatients();
    await loadPatientChart(selectedPatientId, true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* ── Doctor Profile Card ── */}
      {doctorProfile && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-sky-500 via-sky-400 to-cyan-400" />

          <div className="flex flex-col md:flex-row gap-0">
            {/* Left: avatar panel */}
            <div className="flex flex-col items-center justify-center bg-gradient-to-b from-sky-50 to-slate-100 px-8 py-6 md:w-52 border-b md:border-b-0 md:border-r border-slate-200 flex-shrink-0">
              {doctorProfile.profile_photo_url ? (
                <img
                  src={doctorProfile.profile_photo_url}
                  alt={doctorProfile.full_name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-sky-700 flex items-center justify-center border-4 border-white shadow-md">
                  <span className="text-3xl font-bold text-white select-none">
                    {doctorProfile.full_name?.split(' ').filter(w => w.match(/[A-Z]/)).slice(0, 2).map(w => w[0]).join('') ||
                     doctorProfile.full_name?.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <p className="mt-3 text-base font-bold text-slate-900 text-center leading-tight">
                {doctorProfile.full_name}
              </p>
              <p className="text-xs text-sky-700 font-semibold text-center mt-0.5">
                {doctorProfile.specialty || 'Attending Physician'}
              </p>
              <p className="text-[11px] text-slate-500 text-center mt-0.5">
                {doctorProfile.department || 'General Medicine'}
              </p>

              {/* Verification badge */}
              {doctorProfile.verification_status === 'VERIFIED' ? (
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold px-2 py-0.5 rounded-full">
                  <BadgeCheck className="w-3 h-3 text-emerald-600" /> NMR Verified
                </span>
              ) : (
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-300 font-semibold px-2 py-0.5 rounded-full animate-pulse">
                  <AlertTriangle className="w-3 h-3 text-amber-500" /> Pending Review
                </span>
              )}
            </div>

            {/* Right: details */}
            <div className="flex-1 p-5 flex flex-col justify-between gap-4">
              {/* Profile details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">NMR / License No.</p>
                  <p className="text-xs font-mono font-semibold text-slate-800 mt-0.5">
                    {doctorProfile.nmr_registration_number || doctorProfile.license_number || 'NMR-PENDING'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Qualifications</p>
                  <p className="text-xs text-slate-800 mt-0.5">{doctorProfile.qualifications || 'MBBS, MD'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Institution</p>
                  <p className="text-xs text-slate-800 mt-0.5">{doctorProfile.institution || 'Metro Institute of Medical Sciences'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Hospital</p>
                  <p className="text-xs text-slate-800 mt-0.5">{doctorProfile.hospital || 'Metro General Hospital'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Languages</p>
                  <p className="text-xs text-slate-800 mt-0.5">{doctorProfile.languages_spoken || 'English, Hindi'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Consultation Types</p>
                  <p className="text-xs text-slate-800 mt-0.5">
                    {(doctorProfile.consultation_types || 'IN_PERSON').split(',').map((t: string) => t.trim()).join(' · ')}
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
                  <Award className="w-4 h-4 text-sky-600 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium">Experience</p>
                    <p className="text-sm font-bold text-slate-800">{doctorProfile.experience_years ?? 8}+ yrs</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                  <Users className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium">Assigned Patients</p>
                    <p className="text-sm font-bold text-slate-800">{assignedPatients.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                  <CreditCard className="w-4 h-4 text-violet-600 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium">Consultation Fee</p>
                    <p className="text-sm font-bold text-slate-800">₹{doctorProfile.consultation_fee ?? 500}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                  <FlaskConical className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 font-medium">OPD Queue</p>
                    <p className="text-sm font-bold text-slate-800">{opdQueue.length} today</p>
                  </div>
                </div>

                {/* CTA */}
                <div className="ml-auto flex items-center">
                  <button
                    onClick={() => handleOpenConsultation()}
                    disabled={!chart}
                    className="inline-flex items-center text-xs px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg shadow transition disabled:opacity-40"
                  >
                    <Stethoscope className="w-4 h-4 mr-1.5" />
                    Conduct Consultation &amp; Orders
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clinician Access Scope Header Banner */}
      <div className="bg-sky-50 border-l-4 border-sky-600 p-3.5 rounded-r flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-2.5">
          <Stethoscope className="w-5 h-5 text-sky-700 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
              Longitudinal Electronic Health Record Workspace
            </h4>
            <p className="text-[11px] text-sky-800">
              Cross-system patient records aggregated from <strong>Metro General Hospital (FHIR R4)</strong> and <strong>St. Jude Community Health (Legacy EHR)</strong>.
            </p>
          </div>
        </div>

        {/* Emergency Care Override Toggle */}
        <label className="flex items-center space-x-2 text-xs text-sky-900 font-medium bg-white px-2.5 py-1.5 rounded border border-sky-200 cursor-pointer hover:bg-sky-50 transition">
          <input
            type="checkbox"
            checked={isEmergency}
            onChange={(e) => setIsEmergency(e.target.checked)}
            className="rounded text-sky-600 focus:ring-sky-500 w-3.5 h-3.5"
          />
          <span className="flex items-center">
            <HeartPulse className="w-3.5 h-3.5 mr-1 text-rose-600" />
            Emergency Care Override
          </span>
        </label>
      </div>

      {/* Anti-False-Merge Safe Patient Search & Disambiguation Tool */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <Search className="w-3.5 h-3.5 mr-1 text-sky-600" />
              Patient Identity Search &amp; Anti-False-Merge Disambiguation
            </h4>
            <p className="text-[11px] text-slate-500">
              Deterministic search prevents accidental demographic merging across similar patient names.
            </p>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-slate-400">Quick test:</span>
            <button
              onClick={() => handleSearchPatients('Neha')}
              className="text-[11px] bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded font-semibold transition"
            >
              Search "Neha" (Anti-False-Merge Test)
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by Patient Name, National Health ID (e.g. IND-2026-9041), or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchPatients(searchQuery)}
              className="w-full text-xs border border-slate-300 rounded px-3 py-2 pl-8 focus:ring-1 focus:ring-sky-500 bg-slate-50"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
          <button
            onClick={() => handleSearchPatients(searchQuery)}
            disabled={searchLoading}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded transition flex items-center"
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
          {searchPerformed && (
            <button
              onClick={() => { setSearchCandidates([]); setSearchPerformed(false); setSearchQuery(''); }}
              className="px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs rounded"
            >
              Clear
            </button>
          )}
        </div>

        {/* Candidate Results with Disambiguation Card */}
        {searchPerformed && (
          <div className="mt-3 space-y-2">
            {searchCandidates.length === 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center text-xs text-slate-500">
                No matching patients found for "{searchQuery}".
              </div>
            ) : (
              <div>
                {searchCandidates.length > 1 && (
                  <div className="bg-amber-50 border border-amber-300 text-amber-900 p-2.5 rounded text-xs mb-3 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Anti-False-Merge Disambiguation Protocol:</span>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Multiple distinct patient identities match "{searchQuery}" ({searchCandidates.length} individuals detected). System strictly prohibits auto-merging. Examine National Health ID, DOB, and Contact before proceeding.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {searchCandidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="border border-slate-200 rounded-lg p-3 bg-white hover:border-sky-400 transition shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900">{candidate.full_name}</span>
                          <span className="font-mono text-[10px] bg-sky-50 text-sky-800 border border-sky-200 px-1.5 py-0.5 rounded font-semibold">
                            {candidate.national_health_id}
                          </span>
                        </div>
                        <div className="mt-1.5 grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                          <div>DOB: <strong>{candidate.dob}</strong></div>
                          <div>Gender: <strong>{candidate.gender}</strong></div>
                          <div>Phone: <strong>{candidate.contact_number || 'N/A'}</strong></div>
                          <div>City: <strong>{candidate.address?.city || 'Mumbai'}</strong></div>
                          {candidate.guardian_name && (
                            <div className="col-span-2">Father/Guardian: <strong>{candidate.guardian_name}</strong></div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          onClick={() => handleSelectCandidate(candidate)}
                          className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded transition"
                        >
                          Select &amp; Open Longitudinal Record
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live OPD Queue for Consultations */}
      {opdQueue.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1 text-teal-600" />
              Live OPD Department Queue ({opdQueue.length} Active Patients)
            </h4>
            <button
              onClick={fetchOpdQueue}
              className="text-[11px] text-teal-700 hover:underline flex items-center"
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh Queue
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {opdQueue.map((enc) => (
              <div
                key={enc.id}
                className={`p-2.5 rounded border text-xs flex flex-col justify-between ${
                  enc.status === 'WITH_DOCTOR'
                    ? 'bg-sky-50 border-sky-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded text-[10px]">
                      Token #{enc.token_number}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      enc.status === 'WITH_DOCTOR' ? 'bg-sky-200 text-sky-800' :
                      enc.status === 'CONSULTATION_COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {enc.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">{enc.patient_name}</div>
                  <div className="text-[11px] text-slate-500">Dept: {enc.department}</div>
                  {enc.vitals_bp && (
                    <div className="mt-1 text-[10px] text-slate-600 bg-white p-1 rounded border border-slate-100">
                      Vitals: BP {enc.vitals_bp} | Pulse {enc.vitals_pulse || '72'} bpm | SpO2 {enc.vitals_spo2 || '98%'}
                    </div>
                  )}
                </div>
                <div className="mt-2.5 pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                  <button
                    onClick={() => handleCallPatient(enc)}
                    className="text-[11px] font-semibold text-sky-700 hover:text-sky-900"
                  >
                    Call In / Open
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPatientId(enc.master_patient_id);
                      handleOpenConsultation(enc.id);
                    }}
                    className="text-[11px] bg-teal-600 hover:bg-teal-700 text-white font-semibold px-2 py-0.5 rounded"
                  >
                    Consult &amp; Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consultation Success Notification */}
      {consultationSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-lg flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{consultationSuccessMsg}</span>
          </div>
          <button
            onClick={() => setConsultationSuccessMsg(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Cohort & Patient Selector Bar */}
      <div className="bg-white p-3 border border-slate-200 rounded shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-2 flex-wrap">
          <UserCheck className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-700 uppercase">Assigned Care Cohort:</span>
          {assignedPatients.length === 0 ? (
            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
              Unassigned Doctor (No active treatment cohort assigned)
            </span>
          ) : (
            <select
              value={selectedPatientId || ''}
              onChange={(e) => setSelectedPatientId(Number(e.target.value))}
              className="text-xs font-medium border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50 text-slate-800 focus:ring-1 focus:ring-sky-500"
            >
              {assignedPatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.national_health_id}) {p.open_conflicts_count ? `[${p.open_conflicts_count} Discrepancies]` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => selectedPatientId && loadPatientChart(selectedPatientId, isEmergency)}
            className="inline-flex items-center text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded transition"
            title="Refresh clinical records"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Refresh
          </button>
          <button
            onClick={() => handleOpenConsultation()}
            disabled={!chart}
            className="inline-flex items-center text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-sm transition disabled:opacity-50"
          >
            <FlaskConical className="w-3.5 h-3.5 mr-1" />
            Consult &amp; Order
          </button>
          <button
            onClick={() => setIsAddEncounterOpen(true)}
            disabled={!chart}
            className="inline-flex items-center text-xs px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded shadow-sm transition disabled:opacity-50"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1" />
            Add Note
          </button>
        </div>
      </div>

      {/* Emergency Break-Glass Active Warning Banner (When unlocked) */}
      {chart && chart.is_emergency_override && (
        <div className="bg-rose-600 text-white p-3 rounded shadow flex items-center justify-between text-xs animate-pulse">
          <div className="flex items-center space-x-2">
            <FileWarning className="w-5 h-5 flex-shrink-0" />
            <div>
              <span className="font-bold tracking-wide uppercase">
                EMERGENCY BREAK-GLASS PROTOCOL ACTIVE
              </span>
              <p className="text-[11px] text-rose-100">
                You have accessed this patient's Protected Health Information under emergency statutory override. All clicks and document views are permanently logged to the Hospital Compliance Audit Register.
              </p>
            </div>
          </div>
          <span className="bg-white/20 text-white text-[10px] font-mono px-2 py-1 rounded">
            AUDIT TAGGED
          </span>
        </div>
      )}

      {/* Doctor (Unassigned) Access Barrier Screen */}
      {error && !chart && (
        <div className="bg-white border border-rose-200 rounded-lg p-6 sm:p-8 shadow-sm space-y-4 text-center max-w-2xl mx-auto">
          <div className="inline-flex p-3 bg-rose-100 text-rose-700 rounded-full mb-1">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Access Restricted: Treatment Care Team Scope Enforcement
          </h3>
          <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
            Under the Zero-Trust Healthcare Access Control Policy, physicians are restricted from browsing Protected Health Information (PHI) of patients outside their assigned clinical service cohort.
          </p>
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded text-xs font-mono max-w-md mx-auto">
            [403 FORBIDDEN] {error}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setIsBreakGlassModalOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded shadow transition"
            >
              <FileWarning className="w-4 h-4 mr-1" />
              <span>Request Emergency Break-Glass Access</span>
            </button>
            <button
              onClick={fetchAssignedPatients}
              className="px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded transition"
            >
              Refresh Permissions
            </button>
          </div>
        </div>
      )}

      {/* Unified Patient Chart */}
      {chart && (
        <div className="space-y-5">

          {/* Attending Doctor Profile Card (compact) */}
          {doctorProfile && (
            <div className="bg-white border border-sky-100 rounded-lg shadow-sm overflow-hidden">
              <div className="h-1 w-full bg-gradient-to-r from-sky-500 to-cyan-400" />
              <div className="flex items-center gap-4 px-4 py-3">
                {/* Avatar */}
                {doctorProfile.profile_photo_url ? (
                  <img
                    src={doctorProfile.profile_photo_url}
                    alt={doctorProfile.full_name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-sky-200 shadow flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-sky-700 flex items-center justify-center border-2 border-sky-200 shadow flex-shrink-0">
                    <span className="text-lg font-bold text-white select-none">
                      {doctorProfile.full_name?.split(' ').filter((w: string) => w.match(/[A-Z]/)).slice(0, 2).map((w: string) => w[0]).join('') ||
                       doctorProfile.full_name?.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{doctorProfile.full_name}</span>
                    <span className="text-[11px] bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded font-medium">
                      {doctorProfile.specialty}
                    </span>
                    {doctorProfile.verification_status === 'VERIFIED' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold px-1.5 py-0.5 rounded-full">
                        <BadgeCheck className="w-3 h-3 text-emerald-600" /> NMR Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-semibold px-1.5 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3 text-amber-500" /> Pending
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1 text-[11px] text-slate-500">
                    <span>🏥 {doctorProfile.hospital || 'Metro General Hospital'}</span>
                    <span>🎓 {doctorProfile.qualifications || 'MBBS, MD'}</span>
                    <span>⏱ {doctorProfile.experience_years ?? 8} yrs experience</span>
                    <span>🌐 {doctorProfile.languages_spoken || 'English, Hindi'}</span>
                    <span className="font-mono text-slate-600">NMR: {doctorProfile.license_number || 'NMR-PENDING'}</span>
                  </div>
                </div>

                {/* Fee badge */}
                <div className="hidden sm:flex flex-col items-end flex-shrink-0">
                  <span className="text-[10px] text-slate-400 font-medium">Consultation Fee</span>
                  <span className="text-base font-bold text-slate-800">₹{doctorProfile.consultation_fee ?? 500}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {(doctorProfile.consultation_types || 'IN_PERSON').split(',').map((t: string) => t.trim()).join(' · ')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Patient Demographics & Contributing Sources Header */}
          <div className="bg-white border border-slate-200 rounded p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">{chart.full_name}</h2>
                  <span className="font-mono text-xs bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded font-semibold">
                    {chart.national_health_id}
                  </span>
                  <StatusBadge status={chart.consent_status || 'CONSENTED'} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-600">
                  <span>DOB: <strong>{chart.dob}</strong></span>
                  <span>Gender: <strong>{chart.gender}</strong></span>
                  <span>Blood Group: <strong>{chart.blood_group || 'O+'}</strong></span>
                </div>
              </div>

              {/* Contributing Facilities Pills */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Contributing Sources:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {chart.contributing_sources.map((src, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                        src.includes('Metro')
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-teal-50 text-teal-800 border-teal-200'
                      }`}
                    >
                      <Building2 className="w-3 h-3 mr-1" />
                      {src}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Active Discrepancy / Conflict Warning Banner */}
          {conflicts.filter((c) => c.resolution_status === 'OPEN').length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                      Cross-Institutional Discrepancies Detected ({conflicts.filter((c) => c.resolution_status === 'OPEN').length} Open Conflicts)
                    </h3>
                    <p className="text-xs text-amber-900 mt-1">
                      Data divergences exist between contributing hospitals (conflicting medication dosages or allergy reactions). Original provenance records are strictly preserved without silent overwriting.
                    </p>
                  </div>
                </div>
              </div>

              {/* Conflict items table */}
              <div className="mt-3 bg-white border border-amber-200 rounded overflow-hidden">
                <table className="text-xs">
                  <thead>
                    <tr className="bg-amber-100/60 text-amber-900">
                      <th>Discrepancy Category</th>
                      <th>Facility A Record</th>
                      <th>Facility B Record</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conflicts.filter((c) => c.resolution_status === 'OPEN').map((conf) => (
                      <tr key={conf.id} className="hover:bg-amber-50/40">
                        <td className="font-semibold text-slate-800">{conf.field_name}</td>
                        <td className="text-slate-700">
                          <span className="font-medium text-blue-800 block text-[11px]">{conf.source_a_org_name}:</span>
                          <span className="font-mono text-[11px]">{conf.source_a_value}</span>
                        </td>
                        <td className="text-slate-700">
                          <span className="font-medium text-teal-800 block text-[11px]">{conf.source_b_org_name}:</span>
                          <span className="font-mono text-[11px]">{conf.source_b_value}</span>
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => {
                              setSelectedConflict(conf);
                              setIsConflictModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] rounded shadow-sm transition"
                          >
                            Resolve Discrepancy
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Clean 6-Tab Navigation */}
          <div className="border-b border-slate-200 bg-white rounded-t px-2 pt-2">
            <nav className="flex space-x-1 sm:space-x-2 text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-2.5 border-b-2 transition whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === 'overview'
                    ? 'border-sky-600 text-sky-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-2.5 border-b-2 transition whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === 'history'
                    ? 'border-sky-600 text-sky-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Medical History ({chart.diagnoses.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('labs')}
                className={`px-3 py-2.5 border-b-2 transition whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === 'labs'
                    ? 'border-sky-600 text-sky-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Thermometer className="w-3.5 h-3.5" />
                <span>Laboratory ({chart.lab_results.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('radiology')}
                className={`px-3 py-2.5 border-b-2 transition whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === 'radiology'
                    ? 'border-sky-600 text-sky-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Radiology ({chart.radiology?.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab('medications')}
                className={`px-3 py-2.5 border-b-2 transition whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === 'medications'
                    ? 'border-sky-600 text-sky-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Pill className="w-3.5 h-3.5" />
                <span>Medications ({chart.medications.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('visits')}
                className={`px-3 py-2.5 border-b-2 transition whitespace-nowrap flex items-center space-x-1.5 ${
                  activeTab === 'visits'
                    ? 'border-sky-600 text-sky-800'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Visits / Encounters ({chart.encounters.length})</span>
              </button>
            </nav>
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              
              {/* Vital Signs Summary Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white p-3 rounded border border-slate-200 shadow-sm text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Blood Pressure</span>
                  <div className="text-base font-bold font-mono text-slate-900 mt-0.5">124 / 82</div>
                  <span className="text-[10px] text-slate-500">mmHg (Normal)</span>
                </div>
                <div className="bg-white p-3 rounded border border-slate-200 shadow-sm text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Heart Rate</span>
                  <div className="text-base font-bold font-mono text-slate-900 mt-0.5">72</div>
                  <span className="text-[10px] text-slate-500">bpm (Regular)</span>
                </div>
                <div className="bg-white p-3 rounded border border-slate-200 shadow-sm text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Oxygen Saturation</span>
                  <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">98%</div>
                  <span className="text-[10px] text-slate-500">SpO2 on Room Air</span>
                </div>
                <div className="bg-white p-3 rounded border border-slate-200 shadow-sm text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Body Temp</span>
                  <div className="text-base font-bold font-mono text-slate-900 mt-0.5">98.4°F</div>
                  <span className="text-[10px] text-slate-500">Oral (Afebrile)</span>
                </div>
                <div className="bg-white p-3 rounded border border-slate-200 shadow-sm text-center col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">BMI / Weight</span>
                  <div className="text-base font-bold font-mono text-slate-900 mt-0.5">22.4</div>
                  <span className="text-[10px] text-slate-500">Normal (62 kg)</span>
                </div>
              </div>

              {/* Two Column Summary: Active Problems vs Allergies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Active Diagnoses / Problems */}
                <div className="bg-white p-4 rounded border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                      <FileText className="w-4 h-4 mr-1.5 text-sky-700" />
                      Active Problem List ({chart.diagnoses.length})
                    </h3>
                    <button
                      onClick={() => setActiveTab('history')}
                      className="text-[11px] text-sky-700 hover:underline font-semibold"
                    >
                      View All
                    </button>
                  </div>

                  <div className="space-y-2">
                    {chart.diagnoses.map((d) => (
                      <div key={d.id} className="p-2.5 bg-slate-50 rounded border border-slate-200 flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-bold text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {d.icd10_code || 'R69'}
                            </span>
                            <span className="text-xs font-bold text-slate-900">{d.description}</span>
                          </div>
                          <div className="mt-1 flex items-center space-x-2 text-[11px] text-slate-500">
                            <span>Onset: {d.onset_date || 'Chronic'}</span>
                            <span>•</span>
                            <ProvenanceTag provenance={d.provenance} />
                          </div>
                        </div>
                        <StatusBadge status={d.clinical_status} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Allergies & Adverse Reactions */}
                <div className="bg-white p-4 rounded border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-1.5 text-rose-600" />
                      Allergies & Intolerances ({chart.allergies.length})
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {chart.allergies.map((a) => (
                      <div key={a.id} className="p-2.5 bg-rose-50/50 rounded border border-rose-200 flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-900">{a.allergen}</span>
                          <p className="text-[11px] text-slate-600 mt-0.5">Reaction: {a.reaction || 'Anaphylaxis / Rash'}</p>
                          <div className="mt-1">
                            <ProvenanceTag provenance={a.provenance} />
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                          {a.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Longitudinal Event Timeline Summary */}
              <div className="bg-white p-4 rounded border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                    <Clock className="w-4 h-4 mr-1.5 text-slate-600" />
                    Chronological Longitudinal Event Stream ({timeline.length} Events)
                  </h3>
                  
                  {/* Source Org filter */}
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-slate-500">Source Facility:</span>
                    <select
                      value={orgFilter}
                      onChange={(e) => setOrgFilter(e.target.value)}
                      className="border border-slate-300 rounded px-2 py-1 text-xs bg-slate-50"
                    >
                      <option value="ALL">All Sources</option>
                      <option value="HOSP_A">Metro General (FHIR)</option>
                      <option value="HOSP_B">St. Jude (Legacy)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {timeline.slice(0, 5).map((evt) => (
                    <div key={evt.event_id} className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded border border-slate-200 transition flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                            {evt.category}
                          </span>
                          <span className="font-bold text-slate-900">{evt.title}</span>
                        </div>
                        {evt.subtitle && (
                          <p className="text-[11px] text-slate-600 mt-0.5">{evt.subtitle}</p>
                        )}
                        <span className="text-[10px] text-slate-400 block mt-1">
                          {new Date(evt.event_date).toLocaleString()}
                        </span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                        evt.organization_code === 'HOSP_A'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-teal-50 text-teal-800 border-teal-200'
                      }`}>
                        {evt.organization_name.split(' ')[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: MEDICAL HISTORY */}
          {activeTab === 'history' && (
            <div className="bg-white p-4 rounded border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Consolidated Diagnoses & Medical History
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cross-hospital diagnosis records codified with ICD-10 and provenance
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="text-xs">
                  <thead>
                    <tr>
                      <th>ICD-10 Code</th>
                      <th>Condition Description</th>
                      <th>Severity</th>
                      <th>Clinical Status</th>
                      <th>Onset Date</th>
                      <th>Originating Facility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart.diagnoses.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="font-mono font-bold text-slate-900">{d.icd10_code || 'R69'}</td>
                        <td className="font-bold text-slate-900">{d.description}</td>
                        <td>{d.severity || 'Moderate'}</td>
                        <td><StatusBadge status={d.clinical_status} /></td>
                        <td className="text-slate-600 font-mono text-[11px]">{d.onset_date || 'Recorded'}</td>
                        <td><ProvenanceTag provenance={d.provenance} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: LABORATORY (With Trend Visual & Lab Report Modal) */}
          {activeTab === 'labs' && (
            <div className="space-y-5">
              
              {/* Interactive Multi-Point Trend Visualizer */}
              <LabTrendVisual labResults={chart.lab_results} />

              {/* Complete Lab Results Table */}
              <div className="bg-white p-4 rounded border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Diagnostic Laboratory Panels & Tests
                    </h3>
                    <p className="text-xs text-slate-500">
                      Standardized tests with LOINC terminology, reference ranges, and abnormal flags
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="text-xs">
                    <thead>
                      <tr>
                        <th>Investigation Name</th>
                        <th>LOINC Code</th>
                        <th>Observed Result</th>
                        <th>Reference Range</th>
                        <th>Flag</th>
                        <th>Date & Origin</th>
                        <th className="text-right">Formal Report</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chart.lab_results.map((l) => {
                        const isAbnormal = l.flag === 'HIGH' || l.flag === 'CRITICAL';
                        return (
                          <tr key={l.id} className={isAbnormal ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50'}>
                            <td className="font-bold text-slate-900">{l.test_name}</td>
                            <td className="font-mono text-slate-500 text-[11px]">{l.loinc_code || 'N/A'}</td>
                            <td className={`font-mono font-bold text-xs ${isAbnormal ? 'text-rose-700' : 'text-slate-900'}`}>
                              {l.result_value} {l.unit || ''}
                            </td>
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
                            <td>
                              <span className="text-[11px] text-slate-600 block">{new Date(l.test_date).toLocaleDateString()}</span>
                              <ProvenanceTag provenance={l.provenance} />
                            </td>
                            <td className="text-right">
                              <button
                                onClick={() => setSelectedLabReport(l)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-sky-800 border border-sky-300 rounded font-semibold text-[11px] transition shadow-sm"
                              >
                                <FileText className="w-3.5 h-3.5 mr-1" />
                                <span>View Lab Slip</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: RADIOLOGY (With Realistic Medical Previews & DICOM Modal) */}
          {activeTab === 'radiology' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                    <ImageIcon className="w-4 h-4 mr-1.5 text-sky-700" />
                    Radiology Imaging & Diagnostic PACS Studies ({chart.radiology?.length || 0})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    De-identified multi-modality radiological examinations aggregated across institutions
                  </p>
                </div>
                <div className="text-[11px] text-slate-500 font-mono bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                  DICOM 3.0 Standard • High Dynamic Range View
                </div>
              </div>

              {/* Grid of Radiology Studies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(chart.radiology || []).map((study) => (
                  <div
                    key={study.id}
                    className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-sky-300 transition group"
                  >
                    {/* Header */}
                    <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="bg-sky-500 text-white text-[10px] font-mono font-bold px-1.5 py-0.2 rounded">
                          {study.modality}
                        </span>
                        <h4 className="text-xs font-bold text-slate-100 tracking-wide">
                          {study.study_type}
                        </h4>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(study.study_date).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Image Preview Canvas */}
                    <div className="bg-black relative aspect-[16/10] overflow-hidden flex items-center justify-center cursor-pointer group"
                      onClick={() => setSelectedRadiologyStudy(study)}
                    >
                      <img
                        src={study.image_url}
                        alt={study.study_type}
                        className="w-full h-full object-contain group-hover:scale-105 transition duration-300"
                      />
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="bg-sky-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center space-x-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Launch DICOM PACS Viewer</span>
                        </span>
                      </div>

                      {/* DICOM OSD Badge */}
                      <div className="absolute bottom-2 left-2 bg-black/70 text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded border border-emerald-500/20 pointer-events-none">
                        REGION: {study.body_region.toUpperCase()}
                      </div>
                    </div>

                    {/* Study Details & Impression */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3 text-xs bg-white">
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                          <ProvenanceTag provenance={study.provenance} />
                          <span className="text-slate-600 font-medium">
                            {study.radiologist_name}
                          </span>
                        </div>
                        <p className="text-slate-700 text-xs mt-2 line-clamp-2 leading-relaxed">
                          <strong>Findings:</strong> {study.summary}
                        </p>
                        <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200 text-amber-950 text-[11px]">
                          <strong>Impression:</strong> {study.impression}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-400">
                          Status: <strong className="text-emerald-700">{study.status}</strong>
                        </span>
                        <button
                          onClick={() => setSelectedRadiologyStudy(study)}
                          className="px-3 py-1 bg-slate-900 hover:bg-sky-700 text-white text-xs font-semibold rounded transition flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          <span>View Full Image</span>
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: MEDICATIONS */}
          {activeTab === 'medications' && (
            <div className="bg-white p-4 rounded border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                    <Pill className="w-4 h-4 mr-1.5 text-sky-700" />
                    Active Prescriptions & Regimens ({chart.medications.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cross-system medication reconciliation with dosage and prescriber attribution
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="text-xs">
                  <thead>
                    <tr>
                      <th>Medication Name</th>
                      <th>Dosage Strength</th>
                      <th>Route / Timing</th>
                      <th>Status</th>
                      <th>Prescribing Clinician</th>
                      <th>Contributing Hospital</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart.medications.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="font-bold text-slate-900">{m.medication_name}</td>
                        <td className="font-mono font-bold text-slate-800">{m.dosage}</td>
                        <td className="text-slate-600">{m.route || 'Oral'} - {m.frequency || 'Daily'}</td>
                        <td><StatusBadge status={m.status} /></td>
                        <td className="text-slate-700">{m.prescriber_name || 'Attending Physician'}</td>
                        <td><ProvenanceTag provenance={m.provenance} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: VISITS / ENCOUNTERS */}
          {activeTab === 'visits' && (
            <div className="bg-white p-4 rounded border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
                    <Calendar className="w-4 h-4 mr-1.5 text-sky-700" />
                    Clinical Encounters & Facility Admissions ({chart.encounters.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hospital encounters across Metro General Hospital and St. Jude Community Health
                  </p>
                </div>
                <button
                  onClick={() => setIsAddEncounterOpen(true)}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded transition flex items-center space-x-1"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  <span>Add Encounter Note</span>
                </button>
              </div>

              <div className="space-y-3">
                {chart.encounters.map((e) => (
                  <div key={e.id} className="p-4 bg-slate-50 rounded border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs uppercase px-2 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-200">
                            {e.encounter_type}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{e.department}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 font-medium">Reason: {e.reason}</p>
                      </div>
                      <ProvenanceTag provenance={e.provenance} />
                    </div>

                    {e.clinical_notes && (
                      <div className="bg-white p-3 rounded border border-slate-200 text-slate-700 leading-relaxed font-sans text-[11px]">
                        <strong>Clinical Notes:</strong> {e.clinical_notes}
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1">
                      <span>Provider: {e.provider_name || 'Hospital Clinical Staff'}</span>
                      <span>Encounter Timestamp: {new Date(e.encounter_date).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL 1: DICOM Radiology Viewer */}
      <RadiologyViewerModal
        study={selectedRadiologyStudy}
        patientName={chart?.full_name || 'Patient'}
        patientId={chart?.national_health_id || 'ID'}
        onClose={() => setSelectedRadiologyStudy(null)}
      />

      {/* MODAL 2: Laboratory Report Slip Modal */}
      <LabReportModal
        labResult={selectedLabReport}
        allLabResults={chart?.lab_results || []}
        patientName={chart?.full_name || 'Patient'}
        patientId={chart?.national_health_id || 'ID'}
        dob={chart?.dob || ''}
        gender={chart?.gender || ''}
        onClose={() => setSelectedLabReport(null)}
      />

      {/* MODAL 3: Emergency Break-Glass Request Modal */}
      <BreakGlassModal
        isOpen={isBreakGlassModalOpen}
        patientId={selectedPatientId || 1}
        patientName={chart?.full_name || 'Ananya Sharma'}
        patientNationalId={chart?.national_health_id || 'ABHA-9821-4402-1190'}
        onClose={() => setIsBreakGlassModalOpen(false)}
        onSubmit={handleBreakGlassSubmit}
      />

      {/* MODAL 4: Conflict Resolution Modal */}
      <Modal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        title="Resolve Cross-Institutional Data Conflict"
      >
        {selectedConflict && (
          <form onSubmit={handleResolveConflict} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 rounded border border-amber-200">
              <span className="font-bold text-amber-900 block">{selectedConflict.field_name}</span>
              <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                <div className="bg-white p-2 rounded border border-amber-200">
                  <span className="text-blue-800 font-semibold block">{selectedConflict.source_a_org_name}:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedConflict.source_a_value}</span>
                </div>
                <div className="bg-white p-2 rounded border border-amber-200">
                  <span className="text-teal-800 font-semibold block">{selectedConflict.source_b_org_name}:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedConflict.source_b_value}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Clinical Resolution Decision & Medical Rationale
              </label>
              <textarea
                required
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g., Reviewed with patient during today's visit. Verified Metformin dosage was escalated to 1000mg BID post-discharge from Metro General. Confirming active prescription."
                className="w-full border border-slate-300 rounded p-2 text-xs"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConflictModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded shadow transition"
              >
                Save Resolution Attribution
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 5: Add Encounter Note Modal */}
      <Modal
        isOpen={isAddEncounterOpen}
        onClose={() => setIsAddEncounterOpen(false)}
        title="Add Clinical Encounter Note"
      >
        <form onSubmit={handleCreateEncounter} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Encounter Type</label>
              <select
                value={newEncounterData.encounter_type}
                onChange={(e) => setNewEncounterData({ ...newEncounterData, encounter_type: e.target.value })}
                className="w-full border border-slate-300 rounded p-2 text-xs bg-white"
              >
                <option value="OUTPATIENT">Outpatient Consultation</option>
                <option value="INPATIENT">Inpatient Round</option>
                <option value="EMERGENCY">Emergency Treatment</option>
                <option value="TELEHEALTH">Telehealth Review</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                required
                value={newEncounterData.department}
                onChange={(e) => setNewEncounterData({ ...newEncounterData, department: e.target.value })}
                className="w-full border border-slate-300 rounded p-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Chief Reason for Consultation</label>
            <input
              type="text"
              required
              value={newEncounterData.reason}
              onChange={(e) => setNewEncounterData({ ...newEncounterData, reason: e.target.value })}
              className="w-full border border-slate-300 rounded p-2 text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Attending Clinical Notes</label>
            <textarea
              rows={4}
              required
              value={newEncounterData.clinical_notes}
              onChange={(e) => setNewEncounterData({ ...newEncounterData, clinical_notes: e.target.value })}
              placeholder="Enter comprehensive clinical assessment, plan, and diagnostic findings..."
              className="w-full border border-slate-300 rounded p-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Primary Diagnosis</label>
              <input
                type="text"
                value={newEncounterData.diag_desc}
                onChange={(e) => setNewEncounterData({ ...newEncounterData, diag_desc: e.target.value })}
                className="w-full border border-slate-300 rounded p-1.5 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">ICD-10 Code</label>
              <input
                type="text"
                value={newEncounterData.diag_icd}
                onChange={(e) => setNewEncounterData({ ...newEncounterData, diag_icd: e.target.value })}
                className="w-full border border-slate-300 rounded p-1.5 text-xs bg-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddEncounterOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded shadow transition"
            >
              Save Clinical Note to Unified Chart
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
