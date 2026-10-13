import React, { useState, useEffect } from 'react';
import { receptionApi, appointmentApi, opdApi, doctorApi } from '../api/client';
import { PatientDemographics, Appointment, OpdEncounter, DoctorProfile } from '../types';
import { Modal } from '../components/Modal';
import { 
  UserPlus, 
  Search, 
  Calendar, 
  Phone, 
  MapPin, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Edit3,
  UserCheck,
  Ticket,
  Printer,
  Activity,
  ArrowRight,
  RefreshCw,
  Building2,
  Check
} from 'lucide-react';

export const ReceptionistWorkspace: React.FC = () => {
  const [patients, setPatients] = useState<PatientDemographics[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [opdQueue, setOpdQueue] = useState<OpdEncounter[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'opd_queue' | 'registry' | 'appointments'>('opd_queue');

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isOpdRegisterOpen, setIsOpdRegisterOpen] = useState(false);
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  
  const [selectedPatient, setSelectedPatient] = useState<PatientDemographics | null>(null);
  const [selectedSlipData, setSelectedSlipData] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    national_health_id: '',
    first_name: '',
    last_name: '',
    dob: '',
    gender: 'MALE',
    blood_group: 'O+',
    phone: '',
    email: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  const [editContactData, setEditContactData] = useState({
    phone: '',
    email: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  const [apptFormData, setApptFormData] = useState({
    master_patient_id: 0,
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '10:00 AM',
    department: 'General Medicine',
    reason: 'Initial consultation and demographic checkup',
    notes: '',
  });

  const [opdFormData, setOpdFormData] = useState({
    master_patient_id: 1,
    doctor_id: undefined as number | undefined,
    department: 'Cardiology & Internal Medicine',
    visit_type: 'WALK_IN',
    vitals_bp: '120/80 mmHg',
    vitals_pulse: '72 bpm',
    vitals_temp: '98.6 F',
    vitals_spo2: '99%',
    chief_complaint: 'Seasonal fever and mild cough',
    consultation_fee: 500.0,
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPatients = async (query?: string) => {
    try {
      const data = await receptionApi.searchPatients(query);
      setPatients(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load patients' });
    }
  };

  const fetchAppointments = async () => {
    try {
      const data = await appointmentApi.getAppointments();
      setAppointments(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchOpdQueue = async () => {
    try {
      const data = await opdApi.getQueue();
      setOpdQueue(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchDoctors = async () => {
    try {
      const data = await doctorApi.getAllProfiles();
      setDoctors(data);
      if (data.length > 0) {
        setOpdFormData(prev => ({ ...prev, doctor_id: data[0].id }));
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPatients(), fetchAppointments(), fetchOpdQueue(), fetchDoctors()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(searchQuery);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await receptionApi.registerPatient(formData);
      setMessage({ type: 'success', text: `Patient ${formData.first_name} ${formData.last_name} registered successfully.` });
      setIsRegisterOpen(false);
      setFormData({
        national_health_id: '',
        first_name: '',
        last_name: '',
        dob: '',
        gender: 'MALE',
        blood_group: 'O+',
        phone: '',
        email: '',
        address: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
      });
      fetchPatients();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Registration failed' });
    }
  };

  const handleOpdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await opdApi.register(opdFormData);
      setMessage({ type: 'success', text: `OPD Queue Token #${created.token_number} generated! Consultation bill created in billing desk.` });
      setIsOpdRegisterOpen(false);
      fetchOpdQueue();
      // Auto open print slip
      const slip = await opdApi.getSlip(created.id);
      setSelectedSlipData(slip);
      setIsSlipOpen(true);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'OPD Registration failed' });
    }
  };

  const handleOpdStatusChange = async (encounterId: number, nextStatus: string) => {
    try {
      await opdApi.updateStatus(encounterId, nextStatus);
      fetchOpdQueue();
      setMessage({ type: 'success', text: `Queue status updated to ${nextStatus}.` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update status' });
    }
  };

  const handleViewSlip = async (encounterId: number) => {
    try {
      const slip = await opdApi.getSlip(encounterId);
      setSelectedSlipData(slip);
      setIsSlipOpen(true);
    } catch (err: any) {
      alert('Error loading registration slip');
    }
  };

  const handleApptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await appointmentApi.createAppointment(apptFormData);
      setMessage({ type: 'success', text: 'Appointment booked successfully.' });
      setIsScheduleOpen(false);
      fetchAppointments();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Booking failed' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      
      {/* Role Notice & Security Boundary */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r shadow-sm">
        <div className="flex items-start">
          <ShieldAlert className="w-5 h-5 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Administrative Receptionist Scope — Zero Clinical Exposure Policy
            </h4>
            <p className="text-xs text-amber-800 mt-0.5">
              You are authenticated as <strong>Front Desk Intake Receptionist</strong>. You are authorized to register demographics, issue OPD Queue Tokens, and direct arrivals. <strong>Protected Health Information (clinical notes, diagnoses, medications, and lab reports) is strictly restricted by backend RBAC.</strong>
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded border text-xs flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="underline text-[11px] ml-4">Dismiss</button>
        </div>
      )}

      {/* Main Workspace Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('opd_queue')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'opd_queue'
                ? 'bg-amber-700 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Live OPD Waiting Queue ({opdQueue.length})
          </button>
          <button
            onClick={() => setActiveTab('registry')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'registry'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Patient Registration Registry ({patients.length})
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'appointments'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Appointments &amp; Schedule ({appointments.length})
          </button>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => {
              if (patients.length > 0) setOpdFormData(prev => ({ ...prev, master_patient_id: patients[0].id }));
              setIsOpdRegisterOpen(true);
            }}
            className="inline-flex items-center px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Ticket className="w-3.5 h-3.5 mr-1.5" />
            Issue OPD Token
          </button>
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="inline-flex items-center px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Register New Patient
          </button>
          <button
            onClick={() => {
              if (patients.length > 0) setApptFormData((prev) => ({ ...prev, master_patient_id: patients[0].id }));
              setIsScheduleOpen(true);
            }}
            className="inline-flex items-center px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            Schedule
          </button>
        </div>
      </div>

      {/* TAB 1: Live OPD Waiting Queue */}
      {activeTab === 'opd_queue' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Hospital OPD Arrival &amp; Consultation Queue</h3>
              <p className="text-xs text-slate-500">Track tokens from Arrival → Check-in → Waiting Room → Doctor Consultation</p>
            </div>
            <button
              onClick={fetchOpdQueue}
              className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Refresh Queue</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Token &amp; Arrival</th>
                  <th className="py-3 px-4">Patient Information</th>
                  <th className="py-3 px-4">Department &amp; Doctor</th>
                  <th className="py-3 px-4">Recorded Vitals</th>
                  <th className="py-3 px-4">Encounter Status</th>
                  <th className="py-3 px-4 text-right">Queue Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {opdQueue.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No patients currently active in OPD waiting queue.
                    </td>
                  </tr>
                ) : (
                  opdQueue.map((enc) => (
                    <tr key={enc.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {enc.token_number}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Arrival: {new Date(enc.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">{enc.visit_type}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{enc.patient_name}</div>
                        <div className="font-mono text-[10px] text-slate-500">{enc.patient_national_id}</div>
                        <div className="text-[10px] text-slate-400">{enc.patient_gender} • Phone: {enc.patient_phone || 'N/A'}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{enc.department}</div>
                        <div className="text-[11px] text-slate-500">{enc.doctor_name}</div>
                        {enc.chief_complaint && (
                          <div className="text-[10px] text-slate-600 italic mt-0.5 max-w-[200px] truncate">
                            "{enc.chief_complaint}"
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-0.5 text-[11px] font-mono">
                          <div>BP: <span className="font-semibold text-slate-800">{enc.vitals_bp || '120/80'}</span></div>
                          <div>Pulse: {enc.vitals_pulse || '72 bpm'} • Temp: {enc.vitals_temp || '98.6 F'}</div>
                          <div>SpO2: {enc.vitals_spo2 || '99%'}</div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          enc.status === 'WITH_DOCTOR' ? 'bg-sky-100 text-sky-800 border border-sky-300' :
                          enc.status === 'WAITING' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          enc.status === 'CHECKED_IN' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' :
                          enc.status === 'CONSULTATION_COMPLETED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {enc.status.replace('_', ' ')}
                        </span>
                        {enc.bill_status && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            Fee: <span className={`font-semibold ${enc.bill_status === 'PAID' ? 'text-emerald-700' : 'text-amber-700'}`}>{enc.bill_status}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {enc.status === 'REGISTERED' && (
                            <button
                              onClick={() => handleOpdStatusChange(enc.id, 'CHECKED_IN')}
                              className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium"
                            >
                              Check In
                            </button>
                          )}
                          {enc.status === 'CHECKED_IN' && (
                            <button
                              onClick={() => handleOpdStatusChange(enc.id, 'WAITING')}
                              className="px-2 py-1 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded font-medium"
                            >
                              Send to Waiting
                            </button>
                          )}
                          {enc.status === 'WAITING' && (
                            <button
                              onClick={() => handleOpdStatusChange(enc.id, 'WITH_DOCTOR')}
                              className="px-2 py-1 text-xs bg-sky-700 hover:bg-sky-800 text-white rounded font-medium"
                            >
                              Send to Doctor
                            </button>
                          )}
                          <button
                            onClick={() => handleViewSlip(enc.id)}
                            className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium flex items-center space-x-1"
                            title="Print OPD Registration Slip"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-500" />
                            <span>Slip</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Patient Registration Registry */}
      {activeTab === 'registry' && (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Name, National Health ID (ABHA), or Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-sky-500 bg-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded shadow-sm"
            >
              Search
            </button>
          </form>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">National Health ID (ABHA)</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">DOB / Age / Gender</th>
                  <th className="py-3 px-4">Contact &amp; Emergency Info</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-sky-800">{p.national_health_id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{p.first_name} {p.last_name}</td>
                    <td className="py-3 px-4 text-slate-700">{p.dob} • {p.gender}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>Phone: {p.phone || 'N/A'}</div>
                      <div className="text-[10px] text-slate-400">Emerg: {p.emergency_contact_name} ({p.emergency_contact_phone})</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setOpdFormData(prev => ({ ...prev, master_patient_id: p.id }));
                          setIsOpdRegisterOpen(true);
                        }}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-semibold text-xs"
                      >
                        Issue Token
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Appointments */}
      {activeTab === 'appointments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Schedule Date &amp; Time</th>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Department &amp; Doctor</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appointments.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-900">{a.appointment_date} at {a.appointment_time}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{a.patient_name}</td>
                  <td className="py-3 px-4 text-slate-700">{a.department} ({a.doctor_name})</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {a.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {a.status === 'SCHEDULED' && (
                      <button
                        onClick={() => appointmentApi.updateStatus(a.id, 'CHECKED_IN').then(() => fetchAppointments())}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded font-medium border border-indigo-200"
                      >
                        Mark Arrived
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: Register Walk-in OPD Patient */}
      <Modal
        isOpen={isOpdRegisterOpen}
        onClose={() => setIsOpdRegisterOpen(false)}
        title="Issue OPD Consultation Token &amp; Check-In"
      >
        <form onSubmit={handleOpdSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Patient *</label>
            <select
              value={opdFormData.master_patient_id}
              onChange={(e) => setOpdFormData({ ...opdFormData, master_patient_id: Number(e.target.value) })}
              className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.national_health_id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department *</label>
              <select
                value={opdFormData.department}
                onChange={(e) => setOpdFormData({ ...opdFormData, department: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
              >
                <option value="Cardiology & Internal Medicine">Cardiology &amp; Internal Medicine</option>
                <option value="General Medicine">General Medicine</option>
                <option value="Neurology">Neurology</option>
                <option value="Orthopaedics">Orthopaedics</option>
                <option value="Gynaecology and Obstetrics">Gynaecology and Obstetrics</option>
                <option value="Paediatrics">Paediatrics</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Consulting Physician</label>
              <select
                value={opdFormData.doctor_id || ''}
                onChange={(e) => setOpdFormData({ ...opdFormData, doctor_id: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
              >
                <option value="">General OPD Duty Pool</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.specialty})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">BP (mmHg)</label>
              <input
                type="text"
                value={opdFormData.vitals_bp}
                onChange={(e) => setOpdFormData({ ...opdFormData, vitals_bp: e.target.value })}
                className="w-full p-1 border rounded text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">Pulse (bpm)</label>
              <input
                type="text"
                value={opdFormData.vitals_pulse}
                onChange={(e) => setOpdFormData({ ...opdFormData, vitals_pulse: e.target.value })}
                className="w-full p-1 border rounded text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">Temp (F)</label>
              <input
                type="text"
                value={opdFormData.vitals_temp}
                onChange={(e) => setOpdFormData({ ...opdFormData, vitals_temp: e.target.value })}
                className="w-full p-1 border rounded text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600">SpO2 (%)</label>
              <input
                type="text"
                value={opdFormData.vitals_spo2}
                onChange={(e) => setOpdFormData({ ...opdFormData, vitals_spo2: e.target.value })}
                className="w-full p-1 border rounded text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Chief Complaint / Triage Symptoms</label>
            <input
              type="text"
              value={opdFormData.chief_complaint}
              onChange={(e) => setOpdFormData({ ...opdFormData, chief_complaint: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded text-xs"
            />
          </div>

          <div className="flex justify-between items-center p-2 bg-emerald-50 rounded border border-emerald-200">
            <span className="font-semibold text-emerald-900">Standard OPD Consultation Fee:</span>
            <span className="font-mono font-bold text-emerald-900 text-sm">₹{opdFormData.consultation_fee.toFixed(2)}</span>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsOpdRegisterOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold text-xs shadow-sm"
            >
              Issue Token &amp; Enqueue Patient
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Printable OPD Registration Slip */}
      {isSlipOpen && selectedSlipData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="text-center pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{selectedSlipData.hospital_name}</h3>
              <p className="text-[10px] text-slate-500">OUTPATIENT DEPARTMENT REGISTRATION &amp; TOKEN SLIP</p>
            </div>

            <div className="my-4 text-center bg-amber-50 p-3 rounded-lg border border-amber-200">
              <div className="text-xs text-amber-800 font-semibold uppercase tracking-wider">Queue Token Number</div>
              <div className="text-3xl font-extrabold text-amber-950 font-mono tracking-tight my-1">
                {selectedSlipData.token_number}
              </div>
              <div className="text-[10px] text-slate-500">{selectedSlipData.date_time}</div>
            </div>

            <div className="space-y-1.5 text-xs border-b border-slate-200 pb-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient Name:</span>
                <span className="font-semibold text-slate-900">{selectedSlipData.patient.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">National Health ID:</span>
                <span className="font-mono text-slate-900">{selectedSlipData.patient.national_health_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Department:</span>
                <span className="font-medium text-slate-900">{selectedSlipData.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Clinician:</span>
                <span className="text-slate-900">{selectedSlipData.doctor}</span>
              </div>
            </div>

            <div className="py-2.5 border-b border-slate-200 text-xs">
              <div className="font-semibold text-slate-700 text-[11px] mb-1">Recorded Intake Vitals:</div>
              <div className="grid grid-cols-4 gap-1 text-[11px] font-mono text-slate-800">
                <div>BP: {selectedSlipData.vitals.bp || '120/80'}</div>
                <div>Pulse: {selectedSlipData.vitals.pulse || '72'}</div>
                <div>Temp: {selectedSlipData.vitals.temp || '98.6'}</div>
                <div>SpO2: {selectedSlipData.vitals.spo2 || '99%'}</div>
              </div>
            </div>

            <div className="pt-3 text-xs flex justify-between items-center text-slate-600">
              <div>
                <span>Consultation Fee: </span>
                <span className="font-bold text-slate-900">₹{selectedSlipData.billing.amount.toFixed(2)}</span>
                <span className="text-[10px] text-amber-700 ml-1">({selectedSlipData.billing.status})</span>
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => setIsSlipOpen(false)}
                  className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded text-xs"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-slate-900 text-white rounded text-xs font-semibold"
                >
                  Print Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Register New Patient Form */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Register New Master Patient Record"
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">National Health ID (ABHA) *</label>
              <input
                type="text"
                required
                placeholder="e.g. ABHA-1234-5678-9012"
                value={formData.national_health_id}
                onChange={(e) => setFormData({ ...formData, national_health_id: e.target.value })}
                className="w-full p-2 border rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date of Birth *</label>
              <input
                type="date"
                required
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gender *</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full p-2 border rounded bg-white"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsRegisterOpen(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded font-semibold"
            >
              Register Patient
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Book Appointment */}
      <Modal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        title="Schedule Patient Appointment"
      >
        <form onSubmit={handleApptSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Patient *</label>
            <select
              value={apptFormData.master_patient_id}
              onChange={(e) => setApptFormData({ ...apptFormData, master_patient_id: Number(e.target.value) })}
              className="w-full p-2 border rounded bg-white"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} ({p.national_health_id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={apptFormData.appointment_date}
                onChange={(e) => setApptFormData({ ...apptFormData, appointment_date: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Time Slot *</label>
              <input
                type="text"
                required
                value={apptFormData.appointment_time}
                onChange={(e) => setApptFormData({ ...apptFormData, appointment_time: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Department</label>
            <input
              type="text"
              value={apptFormData.department}
              onChange={(e) => setApptFormData({ ...apptFormData, department: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsScheduleOpen(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold"
            >
              Confirm Appointment
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
