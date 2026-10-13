import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Search, 
  Filter, 
  RefreshCw, 
  User, 
  Calendar, 
  ShieldCheck, 
  MessageSquare,
  PackageCheck,
  Check
} from 'lucide-react';
import { PrescriptionOrder } from '../types';
import { pharmacyApi } from '../api/client';

export const PharmacyWorkspace: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<PrescriptionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedRx, setSelectedRx] = useState<PrescriptionOrder | null>(null);
  const [showDispenseModal, setShowDispenseModal] = useState(false);
  const [showClarifyModal, setShowClarifyModal] = useState(false);

  // Form states
  const [dispenseQty, setDispenseQty] = useState<number>(30);
  const [batchNumber, setBatchNumber] = useState('B-2026-X9');
  const [counselingNotes, setCounselingNotes] = useState('Take with full glass of water after meals.');
  const [clarifyNotes, setClarifyNotes] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const data = await pharmacyApi.getPrescriptions(statusFilter === 'ALL' ? undefined : statusFilter);
      setPrescriptions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, [statusFilter]);

  const filteredRx = prescriptions.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.prescription_number.toLowerCase().includes(term) ||
      p.medication_name.toLowerCase().includes(term) ||
      (p.patient_name && p.patient_name.toLowerCase().includes(term)) ||
      (p.patient_national_id && p.patient_national_id.toLowerCase().includes(term))
    );
  });

  const handleOpenDispense = (rx: PrescriptionOrder) => {
    setSelectedRx(rx);
    const remaining = rx.quantity_prescribed - rx.quantity_dispensed;
    setDispenseQty(remaining > 0 ? remaining : rx.quantity_prescribed);
    setBatchNumber(`B-2026-${Math.floor(100 + Math.random() * 900)}`);
    setCounselingNotes('Take with full glass of water after meals. Complete full prescribed regimen.');
    setShowDispenseModal(true);
  };

  const handleConfirmDispense = async () => {
    if (!selectedRx) return;
    try {
      await pharmacyApi.dispense(selectedRx.id, {
        dispensed_quantity: Number(dispenseQty),
        batch_number: batchNumber,
        counseling_notes: counselingNotes
      });
      setShowDispenseModal(false);
      setActionSuccess(`Successfully recorded dispensing for ${selectedRx.medication_name} (Batch: ${batchNumber})`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchPrescriptions();
    } catch (err: any) {
      alert(err.message || 'Dispensing failed');
    }
  };

  const handleOpenClarify = (rx: PrescriptionOrder) => {
    setSelectedRx(rx);
    setClarifyNotes('');
    setShowClarifyModal(true);
  };

  const handleConfirmClarify = async () => {
    if (!selectedRx || !clarifyNotes.trim()) return;
    try {
      await pharmacyApi.requestClarification(selectedRx.id, clarifyNotes);
      setShowClarifyModal(false);
      setActionSuccess(`Clarification requested from Dr. ${selectedRx.doctor_name}. Notification dispatched.`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchPrescriptions();
    } catch (err: any) {
      alert(err.message || 'Clarification request failed');
    }
  };

  // Metrics
  const totalCount = prescriptions.length;
  const pendingCount = prescriptions.filter(p => ['ISSUED', 'PARTIALLY_DISPENSED'].includes(p.status)).length;
  const dispensedCount = prescriptions.filter(p => p.status === 'DISPENSED').length;
  const clarifyCount = prescriptions.filter(p => p.status === 'CLARIFICATION_REQUIRED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-purple-700 text-white rounded-lg">
              <Pill className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Hospital Pharmacy &amp; Dispensing Portal</h1>
              <p className="text-xs text-slate-500">Authorized prescription validation, batch tracking &amp; clinician clarification workflow</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchPrescriptions}
            className="flex items-center space-x-1.5 text-xs bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700 shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-medium">{actionSuccess}</span>
        </div>
      )}

      {/* Operational Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Total Prescriptions</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{totalCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Authorized Physician Orders</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm">
          <div className="text-[11px] text-amber-700 font-medium uppercase tracking-wider">Awaiting Dispensing</div>
          <div className="text-xl font-bold text-amber-900 mt-1">{pendingCount}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Active outpatient queue</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <div className="text-[11px] text-emerald-700 font-medium uppercase tracking-wider">Fully Dispensed</div>
          <div className="text-xl font-bold text-emerald-900 mt-1">{dispensedCount}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Physical fulfillment complete</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm">
          <div className="text-[11px] text-rose-700 font-medium uppercase tracking-wider">Clarifications Flagged</div>
          <div className="text-xl font-bold text-rose-900 mt-1">{clarifyCount}</div>
          <div className="text-[10px] text-rose-600 mt-0.5">Safety holds with prescriber</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Rx #, medication, patient name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto">
          {['ALL', 'ISSUED', 'PARTIALLY_DISPENSED', 'DISPENSED', 'CLARIFICATION_REQUIRED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Prescriptions' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Prescriptions Table */}
      <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Rx Details &amp; Medication</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Prescribing Doctor</th>
                <th className="py-3 px-4">Dosage &amp; Instructions</th>
                <th className="py-3 px-4">Fulfillment Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">Loading prescription fulfillment queue...</td>
                </tr>
              ) : filteredRx.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">No prescriptions match current filters.</td>
                </tr>
              ) : (
                filteredRx.map((rx) => {
                  return (
                    <tr key={rx.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">{rx.medication_name}</div>
                        <div className="text-xs text-purple-800 font-semibold">{rx.strength} • {rx.route}</div>
                        <div className="font-mono text-[10px] text-slate-400 mt-0.5">{rx.prescription_number}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{rx.patient_name}</div>
                        <div className="font-mono text-[10px] text-slate-500">{rx.patient_national_id}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">{rx.doctor_name}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(rx.created_at).toLocaleDateString()} {new Date(rx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">{rx.dosage} • {rx.frequency}</div>
                        <div className="text-[11px] text-slate-500">Duration: {rx.duration}</div>
                        {rx.instructions && (
                          <div className="text-[10px] text-slate-600 bg-slate-50 p-1 rounded mt-0.5 border border-slate-200">
                            {rx.instructions}
                          </div>
                        )}
                        {rx.clarification_notes && (
                          <div className="text-[10px] text-rose-700 bg-rose-50 p-1 rounded mt-0.5 border border-rose-200 font-medium">
                            Safety Note: {rx.clarification_notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            rx.status === 'DISPENSED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : rx.status === 'PARTIALLY_DISPENSED'
                              ? 'bg-sky-100 text-sky-800 border border-sky-300'
                              : rx.status === 'CLARIFICATION_REQUIRED'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {rx.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-600 mt-1">
                          Dispensed: <span className="font-bold">{rx.quantity_dispensed}</span> / {rx.quantity_prescribed}
                        </div>
                        {rx.dispensing_records && rx.dispensing_records.length > 0 && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Batch: {rx.dispensing_records[0].batch_number}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {rx.status !== 'DISPENSED' && (
                            <>
                              <button
                                onClick={() => handleOpenDispense(rx)}
                                className="px-2.5 py-1 text-xs bg-purple-700 hover:bg-purple-800 text-white rounded font-medium transition shadow-sm"
                              >
                                Dispense
                              </button>
                              <button
                                onClick={() => handleOpenClarify(rx)}
                                className="px-2 py-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-medium transition"
                                title="Request clarification from physician"
                              >
                                Flag
                              </button>
                            </>
                          )}

                          {rx.status === 'DISPENSED' && (
                            <span className="text-[11px] text-emerald-700 font-semibold flex items-center space-x-1">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Completed</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Record Dispensing */}
      {showDispenseModal && selectedRx && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-purple-700" />
                Physical Medication Dispensing Verification
              </h3>
              <button onClick={() => setShowDispenseModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="mt-3 text-xs text-slate-600 space-y-3">
              <div className="bg-purple-50/50 p-2.5 rounded-lg border border-purple-200">
                <div className="font-bold text-purple-950 text-sm">{selectedRx.medication_name} {selectedRx.strength}</div>
                <div className="text-[11px] text-purple-800">
                  Prescribed: {selectedRx.quantity_prescribed} units • Already Dispensed: {selectedRx.quantity_dispensed} units
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Patient: {selectedRx.patient_name} • Prescriber: {selectedRx.doctor_name}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Units to Dispense Now</label>
                  <input
                    type="number"
                    min={1}
                    max={selectedRx.quantity_prescribed - selectedRx.quantity_dispensed || selectedRx.quantity_prescribed}
                    value={dispenseQty}
                    onChange={(e) => setDispenseQty(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Lot / Batch Number</label>
                  <input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Pharmacist Counseling Notes</label>
                <textarea
                  rows={2}
                  value={counselingNotes}
                  onChange={(e) => setCounselingNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>

              <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[10px] text-slate-500">
                🛡️ Dispensing event will be indelibly committed with timestamp and logged into patient's longitudinal record.
              </div>
            </div>

            <div className="mt-5 flex justify-end space-x-2">
              <button
                onClick={() => setShowDispenseModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDispense}
                className="px-4 py-1.5 text-xs bg-purple-700 hover:bg-purple-800 text-white rounded font-medium shadow-sm"
              >
                Confirm Physical Dispense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Request Clarification */}
      {showClarifyModal && selectedRx && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Prescription Clarification Safety Hold
              </h3>
              <button onClick={() => setShowClarifyModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="mt-3 text-xs text-slate-600 space-y-3">
              <p>
                Pharmacists cannot alter physician prescriptions. If dosage ambiguity, drug interaction, or stock unavailability exists, record clinical justification below. The ordering physician will be notified immediately.
              </p>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Clinical Clarification Justification</label>
                <textarea
                  rows={3}
                  value={clarifyNotes}
                  onChange={(e) => setClarifyNotes(e.target.value)}
                  placeholder="e.g. Inquire on potential interaction with patient's concurrent ACE inhibitor; or dosage clarification for pediatric weight..."
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end space-x-2">
              <button
                onClick={() => setShowClarifyModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClarify}
                disabled={!clarifyNotes.trim()}
                className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded font-medium shadow-sm disabled:opacity-50"
              >
                Submit Safety Hold
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
