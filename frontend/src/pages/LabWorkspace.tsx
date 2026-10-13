import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  User, 
  Calendar, 
  Activity,
  Check,
  RefreshCw,
  Eye,
  Microscope,
  Stethoscope
} from 'lucide-react';
import { LabOrder, LabResultParameter } from '../types';
import { labApi } from '../api/client';

export const LabWorkspace: React.FC = () => {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showViewReportModal, setShowViewReportModal] = useState(false);

  // Form states
  const [sampleType, setSampleType] = useState('Venous Blood (EDTA)');
  const [sampleNotes, setSampleNotes] = useState('');
  const [resultsList, setResultsList] = useState<LabResultParameter[]>([
    { parameter: 'Analyte 1', result_value: '', unit: '', reference_range: '', flag: 'NORMAL' }
  ]);
  const [resultNotes, setResultNotes] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await labApi.getOrders(statusFilter === 'ALL' ? undefined : statusFilter);
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const filteredOrders = orders.filter(o => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(term) ||
      (o.patient_name && o.patient_name.toLowerCase().includes(term)) ||
      (o.patient_national_id && o.patient_national_id.toLowerCase().includes(term)) ||
      o.test_name.toLowerCase().includes(term)
    );
  });

  const handleOpenCollect = (order: LabOrder) => {
    setSelectedOrder(order);
    setSampleType(order.sample_type || 'Venous Blood (EDTA)');
    setSampleNotes('');
    setShowCollectModal(true);
  };

  const handleConfirmCollect = async () => {
    if (!selectedOrder) return;
    try {
      await labApi.collectSample(selectedOrder.id, {
        sample_type: sampleType,
        sample_notes: sampleNotes
      });
      setShowCollectModal(false);
      setActionSuccess(`Specimen collected for order ${selectedOrder.order_number}`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Error collecting specimen');
    }
  };

  const handleOpenEnterResults = (order: LabOrder) => {
    setSelectedOrder(order);
    if (order.results && order.results.length > 0) {
      setResultsList(order.results);
    } else {
      // Default common panel templates based on test name
      if (order.test_name.includes('CBC') || order.test_name.includes('Blood Count')) {
        setResultsList([
          { parameter: 'Hemoglobin (Hb)', result_value: '13.5', unit: 'g/dL', reference_range: '12.0 - 16.0', flag: 'NORMAL' },
          { parameter: 'White Blood Cells (WBC)', result_value: '6.8', unit: '10^3/uL', reference_range: '4.0 - 11.0', flag: 'NORMAL' },
          { parameter: 'Platelet Count', result_value: '220', unit: '10^3/uL', reference_range: '150 - 450', flag: 'NORMAL' },
          { parameter: 'Packed Cell Volume (PCV)', result_value: '41.0', unit: '%', reference_range: '36.0 - 48.0', flag: 'NORMAL' }
        ]);
      } else if (order.test_name.includes('Lipid')) {
        setResultsList([
          { parameter: 'Total Cholesterol', result_value: '210', unit: 'mg/dL', reference_range: '< 200', flag: 'HIGH' },
          { parameter: 'Triglycerides', result_value: '165', unit: 'mg/dL', reference_range: '< 150', flag: 'HIGH' },
          { parameter: 'HDL (Good Cholesterol)', result_value: '42', unit: 'mg/dL', reference_range: '> 40', flag: 'NORMAL' },
          { parameter: 'LDL (Bad Cholesterol)', result_value: '135', unit: 'mg/dL', reference_range: '< 100', flag: 'HIGH' }
        ]);
      } else {
        setResultsList([
          { parameter: order.test_name, result_value: 'Normal', unit: 'mg/dL', reference_range: '70 - 100', flag: 'NORMAL' }
        ]);
      }
    }
    setResultNotes(order.clinical_notes || '');
    setShowResultModal(true);
  };

  const handleAddResultRow = () => {
    setResultsList(prev => [...prev, { parameter: '', result_value: '', unit: '', reference_range: '', flag: 'NORMAL' }]);
  };

  const handleResultChange = (index: number, field: keyof LabResultParameter, val: string) => {
    setResultsList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSaveResults = async () => {
    if (!selectedOrder) return;
    try {
      await labApi.enterResults(selectedOrder.id, resultsList, resultNotes);
      setShowResultModal(false);
      setActionSuccess(`Diagnostic results recorded for ${selectedOrder.order_number}`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Error recording results');
    }
  };

  const handleVerifyAndPublish = async (order: LabOrder) => {
    if (!confirm(`Verify and publish official clinical laboratory report for ${order.order_number}? This will permanently commit the diagnostic report to the patient's longitudinal EHR chart.`)) return;
    try {
      await labApi.verifyAndPublish(order.id);
      setActionSuccess(`Report ${order.order_number} verified and published to longitudinal EHR!`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    }
  };

  // Metrics calculation
  const totalOrders = orders.length;
  const orderedCount = orders.filter(o => o.status === 'ORDERED').length;
  const inProgressCount = orders.filter(o => ['SAMPLE_COLLECTED', 'PROCESSING', 'AWAITING_VERIFICATION'].includes(o.status)).length;
  const publishedCount = orders.filter(o => o.status === 'PUBLISHED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-cyan-700 text-white rounded-lg">
              <Microscope className="w-5 h-5 text-cyan-200" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Laboratory &amp; Pathology Staff Portal</h1>
              <p className="text-xs text-slate-500">Diagnostic specimen management, structured result entry &amp; authorized publication</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchOrders}
            className="flex items-center space-x-1.5 text-xs bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700 shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh Orders</span>
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
          <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Total Orders</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{totalOrders}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Central Pathology System</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm">
          <div className="text-[11px] text-amber-700 font-medium uppercase tracking-wider">Pending Specimen Collection</div>
          <div className="text-xl font-bold text-amber-900 mt-1">{orderedCount}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Phlebotomy triage queue</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-sky-200 bg-sky-50/20 shadow-sm">
          <div className="text-[11px] text-sky-700 font-medium uppercase tracking-wider">In Processing / Verification</div>
          <div className="text-xl font-bold text-sky-900 mt-1">{inProgressCount}</div>
          <div className="text-[10px] text-sky-600 mt-0.5">Analytic phase active</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <div className="text-[11px] text-emerald-700 font-medium uppercase tracking-wider">Verified &amp; Published</div>
          <div className="text-xl font-bold text-emerald-900 mt-1">{publishedCount}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Committed to longitudinal EHR</div>
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
            placeholder="Search order #, patient name, ABHA ID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto">
          {['ALL', 'ORDERED', 'SAMPLE_COLLECTED', 'AWAITING_VERIFICATION', 'PUBLISHED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-cyan-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Orders' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Order Details</th>
                <th className="py-3 px-4">Patient Information</th>
                <th className="py-3 px-4">Ordering Clinician</th>
                <th className="py-3 px-4">Priority &amp; Specimen</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">Loading laboratory investigation orders...</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">No laboratory test orders match current filters.</td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{order.test_name}</div>
                        <div className="font-mono text-[10px] text-cyan-800">{order.order_number}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{order.patient_name}</div>
                        <div className="font-mono text-[10px] text-slate-500">{order.patient_national_id}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-700">{order.ordering_doctor_name}</div>
                        <div className="text-[10px] text-slate-400">{order.laboratory_name}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            order.priority === 'STAT'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : order.priority === 'URGENT'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {order.priority}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {order.sample_type || 'Specimen Pending'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          order.status === 'PUBLISHED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : order.status === 'AWAITING_VERIFICATION'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                            : order.status === 'SAMPLE_COLLECTED'
                            ? 'bg-sky-100 text-sky-800 border border-sky-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {order.status === 'PUBLISHED' ? '✓ Published Report' : order.status.replace('_', ' ')}
                        </span>
                        {order.verified_by_name && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            By {order.verified_by_name}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {order.status === 'ORDERED' && (
                            <button
                              onClick={() => handleOpenCollect(order)}
                              className="px-2.5 py-1 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded font-medium transition shadow-sm"
                            >
                              Collect Specimen
                            </button>
                          )}

                          {order.status === 'SAMPLE_COLLECTED' && (
                            <button
                              onClick={() => handleOpenEnterResults(order)}
                              className="px-2.5 py-1 text-xs bg-sky-700 hover:bg-sky-800 text-white rounded font-medium transition shadow-sm"
                            >
                              Enter Results
                            </button>
                          )}

                          {order.status === 'AWAITING_VERIFICATION' && (
                            <>
                              <button
                                onClick={() => handleOpenEnterResults(order)}
                                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleVerifyAndPublish(order)}
                                className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition shadow-sm"
                              >
                                Verify &amp; Publish
                              </button>
                            </>
                          )}

                          {order.status === 'PUBLISHED' && (
                            <button
                              onClick={() => { setSelectedOrder(order); setShowViewReportModal(true); }}
                              className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium flex items-center space-x-1 transition"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>View Report</span>
                            </button>
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

      {/* MODAL 1: Collect Specimen */}
      {showCollectModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-amber-600" />
                Specimen Collection Intake
              </h3>
              <button onClick={() => setShowCollectModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="mt-3 text-xs text-slate-600 space-y-3">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-800">{selectedOrder.test_name}</div>
                <div className="text-[11px] text-slate-500">Order: {selectedOrder.order_number} • Patient: {selectedOrder.patient_name} ({selectedOrder.patient_national_id})</div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Specimen / Sample Type</label>
                <select
                  value={sampleType}
                  onChange={(e) => setSampleType(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white text-slate-900"
                >
                  <option value="Venous Blood (EDTA)">Venous Blood (EDTA Purple Top)</option>
                  <option value="Serum Gel Separator">Serum Gel Separator (Yellow Top)</option>
                  <option value="Sodium Citrate Plasma">Sodium Citrate Plasma (Blue Top)</option>
                  <option value="Clean Catch Urine">Clean Catch Midstream Urine</option>
                  <option value="Nasopharyngeal Swab">Nasopharyngeal Viral Swab</option>
                  <option value="Peritoneal Fluid">Peritoneal Fluid</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Collection Observations / Phlebotomy Notes</label>
                <textarea
                  rows={2}
                  value={sampleNotes}
                  onChange={(e) => setSampleNotes(e.target.value)}
                  placeholder="e.g. Free-flowing venipuncture from left antecubital fossa without hemolysis"
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end space-x-2">
              <button
                onClick={() => setShowCollectModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCollect}
                className="px-4 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded font-medium shadow-sm"
              >
                Confirm Specimen Ingestion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Enter Structured Results */}
      {showResultModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-5 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Microscope className="w-4 h-4 text-cyan-600" />
                  Structured Diagnostic Result Entry: {selectedOrder.test_name}
                </h3>
                <div className="text-[11px] text-slate-500">Order #{selectedOrder.order_number} • Patient: {selectedOrder.patient_name}</div>
              </div>
              <button onClick={() => setShowResultModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs">
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[11px] text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Analyte / Parameter</th>
                      <th className="p-2 w-28">Result Value</th>
                      <th className="p-2 w-24">Unit</th>
                      <th className="p-2 w-32">Reference Range</th>
                      <th className="p-2 w-24">Flag</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {resultsList.map((row, idx) => (
                      <tr key={idx} className="bg-white">
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={row.parameter}
                            onChange={(e) => handleResultChange(idx, 'parameter', e.target.value)}
                            placeholder="e.g. Hemoglobin"
                            className="w-full p-1 border border-slate-200 rounded text-xs"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={row.result_value}
                            onChange={(e) => handleResultChange(idx, 'result_value', e.target.value)}
                            placeholder="Value"
                            className="w-full p-1 border border-slate-200 rounded text-xs font-semibold"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={row.unit || ''}
                            onChange={(e) => handleResultChange(idx, 'unit', e.target.value)}
                            placeholder="e.g. mg/dL"
                            className="w-full p-1 border border-slate-200 rounded text-xs"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={row.reference_range || ''}
                            onChange={(e) => handleResultChange(idx, 'reference_range', e.target.value)}
                            placeholder="e.g. 70 - 100"
                            className="w-full p-1 border border-slate-200 rounded text-xs"
                          />
                        </td>
                        <td className="p-1.5">
                          <select
                            value={row.flag}
                            onChange={(e) => handleResultChange(idx, 'flag', e.target.value as any)}
                            className={`w-full p-1 border rounded text-xs font-medium ${
                              row.flag === 'HIGH' || row.flag === 'CRITICAL' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                              row.flag === 'LOW' ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-white'
                            }`}
                          >
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">High</option>
                            <option value="LOW">Low</option>
                            <option value="CRITICAL">Critical</option>
                          </select>
                        </td>
                        <td className="p-1.5 text-center">
                          {resultsList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setResultsList(prev => prev.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={handleAddResultRow}
                className="text-xs text-cyan-700 hover:text-cyan-900 font-semibold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Analyte Parameter</span>
              </button>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Pathologist Commentary / Notes</label>
                <textarea
                  rows={2}
                  value={resultNotes}
                  onChange={(e) => setResultNotes(e.target.value)}
                  placeholder="Clinical notes, morphology impressions, or correlation advice..."
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => setShowResultModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveResults}
                className="px-4 py-1.5 text-xs bg-sky-700 hover:bg-sky-800 text-white rounded font-medium shadow-sm"
              >
                Save for Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: View Full Official Lab Report */}
      {showViewReportModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-slate-200">
              <div>
                <div className="text-sm font-bold text-slate-900 uppercase tracking-wider">METRO GENERAL HOSPITAL &amp; RESEARCH INSTITUTE</div>
                <div className="text-xs text-cyan-800 font-semibold">DEPARTMENT OF CLINICAL PATHOLOGY &amp; LABORATORY MEDICINE</div>
                <div className="text-[10px] text-slate-400">NABL Accredited • ISO 15189 Certified Diagnostic Center</div>
              </div>
              <button onClick={() => setShowViewReportModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 py-3 text-xs bg-slate-50 rounded-lg p-3 my-3 border border-slate-200">
              <div>
                <div className="text-slate-500">Patient Name: <span className="font-semibold text-slate-900">{selectedOrder.patient_name}</span></div>
                <div className="text-slate-500">ABHA Health ID: <span className="font-mono text-slate-900">{selectedOrder.patient_national_id}</span></div>
                <div className="text-slate-500">Sample Type: <span className="text-slate-900">{selectedOrder.sample_type}</span></div>
              </div>
              <div>
                <div className="text-slate-500">Order #: <span className="font-mono font-semibold text-slate-900">{selectedOrder.order_number}</span></div>
                <div className="text-slate-500">Ordering Clinician: <span className="text-slate-900">{selectedOrder.ordering_doctor_name}</span></div>
                <div className="text-slate-500">Report Date: <span className="text-slate-900">{selectedOrder.verified_at ? new Date(selectedOrder.verified_at).toLocaleDateString() : 'N/A'}</span></div>
              </div>
            </div>

            <div className="my-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">{selectedOrder.test_name}</h4>
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Investigation Parameter</th>
                    <th className="p-2.5">Observed Value</th>
                    <th className="p-2.5">Units</th>
                    <th className="p-2.5">Biological Reference Interval</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedOrder.results && selectedOrder.results.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2.5 font-medium text-slate-800">{r.parameter}</td>
                      <td className={`p-2.5 font-bold ${r.flag !== 'NORMAL' ? 'text-rose-600' : 'text-slate-900'}`}>{r.result_value}</td>
                      <td className="p-2.5 text-slate-500">{r.unit || '-'}</td>
                      <td className="p-2.5 text-slate-500">{r.reference_range || '-'}</td>
                      <td className="p-2.5 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          r.flag === 'NORMAL' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {r.flag}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedOrder.clinical_notes && (
              <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 text-xs text-amber-900 my-3">
                <span className="font-semibold">Pathologist Interpretation:</span> {selectedOrder.clinical_notes}
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <div>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  ✓ Verified &amp; Digitally Signed
                </span>
                <span className="text-[10px]">By {selectedOrder.verified_by_name || 'Chief Pathologist'}</span>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
              >
                Print Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
