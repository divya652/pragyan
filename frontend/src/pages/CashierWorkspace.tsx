import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  RefreshCw, 
  User, 
  Calendar, 
  Receipt, 
  ShieldCheck, 
  DollarSign,
  Printer,
  Check,
  Building2
} from 'lucide-react';
import { Bill } from '../types';
import { billingApi, receptionApi } from '../api/client';

export const CashierWorkspace: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showCreateBillModal, setShowCreateBillModal] = useState(false);

  // Payment form states
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentNotes, setPaymentNotes] = useState('Immediate cashier settlement');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Create Bill Form
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [newBillPatientId, setNewBillPatientId] = useState<number>(1);
  const [newBillType, setNewBillType] = useState('OPD_CONSULTATION');
  const [newBillItems, setNewBillItems] = useState([
    { item_description: 'Specialist Consultation Fee', unit_price: 500, quantity: 1 }
  ]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const data = await billingApi.getBills(statusFilter === 'ALL' ? undefined : statusFilter);
      setBills(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
    receptionApi.searchPatients()
      .then(pats => {
        setPatientsList(pats);
        if (pats.length > 0) setNewBillPatientId(pats[0].id);
      })
      .catch(() => {});
  }, [statusFilter]);

  const filteredBills = bills.filter(b => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.bill_number.toLowerCase().includes(term) ||
      (b.patient_name && b.patient_name.toLowerCase().includes(term)) ||
      (b.patient_national_id && b.patient_national_id.toLowerCase().includes(term)) ||
      b.bill_type.toLowerCase().includes(term)
    );
  });

  const handleOpenPay = (bill: Bill) => {
    setSelectedBill(bill);
    setPayAmount(bill.balance_due);
    setPaymentMethod('UPI');
    setPaymentNotes(`Verified payment for ${bill.bill_number}`);
    setShowPayModal(true);
  };

  const handleConfirmPay = async () => {
    if (!selectedBill) return;
    try {
      const updatedBill = await billingApi.pay({
        bill_id: selectedBill.id,
        amount: Number(payAmount),
        payment_method: paymentMethod,
        notes: paymentNotes
      });
      setShowPayModal(false);
      setActionSuccess(`Payment of ₹${payAmount.toFixed(2)} recorded successfully! Invoice status: ${updatedBill.status}`);
      setTimeout(() => setActionSuccess(null), 4000);
      fetchBills();
    } catch (err: any) {
      alert(err.message || 'Payment processing failed');
    }
  };

  const handleViewReceipt = async (bill: Bill) => {
    if (!bill.payments || bill.payments.length === 0) return;
    try {
      const lastPayment = bill.payments[bill.payments.length - 1];
      const rec = await billingApi.getReceipt(lastPayment.receipt_number);
      setReceiptData(rec);
      setSelectedBill(bill);
      setShowReceiptModal(true);
    } catch (err: any) {
      alert(err.message || 'Error fetching receipt');
    }
  };

  const handleCreateBill = async () => {
    try {
      await billingApi.createBill({
        master_patient_id: newBillPatientId,
        bill_type: newBillType,
        items: newBillItems
      });
      setShowCreateBillModal(false);
      setActionSuccess('New itemized hospital invoice created successfully.');
      setTimeout(() => setActionSuccess(null), 4000);
      fetchBills();
    } catch (err: any) {
      alert(err.message || 'Error creating bill');
    }
  };

  // Financial metrics
  const totalInvoiced = bills.reduce((acc, b) => acc + b.net_payable, 0);
  const totalCollected = bills.reduce((acc, b) => acc + b.amount_paid, 0);
  const totalOutstanding = bills.reduce((acc, b) => acc + b.balance_due, 0);
  const paidCount = bills.filter(b => b.status === 'PAID').length;
  const pendingCount = bills.filter(b => b.status === 'PENDING' || b.status === 'PARTIALLY_PAID').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-700 text-white rounded-lg">
              <CreditCard className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Hospital Billing &amp; Cashier Desk</h1>
              <p className="text-xs text-slate-500">Itemized charge invoicing, verified payment gateway settlements &amp; official receipts</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCreateBillModal(true)}
            className="flex items-center space-x-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg font-medium shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Custom Invoice</span>
          </button>
          <button
            onClick={fetchBills}
            className="flex items-center space-x-1.5 text-xs bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700 shadow-sm transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
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
          <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Total Invoiced</div>
          <div className="text-xl font-bold text-slate-900 mt-1">₹{totalInvoiced.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{bills.length} total hospital accounts</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <div className="text-[11px] text-emerald-700 font-medium uppercase tracking-wider">Collected Revenue (Paid)</div>
          <div className="text-xl font-bold text-emerald-900 mt-1">₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">{paidCount} fully settled invoices</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm">
          <div className="text-[11px] text-amber-700 font-medium uppercase tracking-wider">Outstanding Receivable</div>
          <div className="text-xl font-bold text-amber-900 mt-1">₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">{pendingCount} pending accounts</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-sky-200 bg-sky-50/20 shadow-sm">
          <div className="text-[11px] text-sky-700 font-medium uppercase tracking-wider">Cashier Settlement Rate</div>
          <div className="text-xl font-bold text-sky-900 mt-1">
            {totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 100}%
          </div>
          <div className="text-[10px] text-sky-600 mt-0.5">Audited reconciliation</div>
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
            placeholder="Search invoice #, patient name, ABHA ID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full md:w-auto overflow-x-auto">
          {['ALL', 'PENDING', 'PARTIALLY_PAID', 'PAID'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Invoices' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Bills Table */}
      <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice # &amp; Type</th>
                <th className="py-3 px-4">Patient Details</th>
                <th className="py-3 px-4">Services / Line Items</th>
                <th className="py-3 px-4">Financial Breakdown</th>
                <th className="py-3 px-4">Verified Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">Loading hospital billing records...</td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">No hospital bills match current filters.</td>
                </tr>
              ) : (
                filteredBills.map((bill) => {
                  return (
                    <tr key={bill.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">{bill.bill_number}</div>
                        <div className="text-[10px] text-emerald-800 font-medium">{bill.bill_type.replace('_', ' ')}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(bill.created_at).toLocaleDateString()} {new Date(bill.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{bill.patient_name}</div>
                        <div className="font-mono text-[10px] text-slate-500">{bill.patient_national_id}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {bill.items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="text-[11px] text-slate-700 flex justify-between gap-2">
                              <span className="truncate max-w-[200px]">{item.item_description}</span>
                              <span className="font-mono text-slate-500">₹{item.total_price.toFixed(2)}</span>
                            </div>
                          ))}
                          {bill.items.length > 2 && (
                            <div className="text-[10px] text-slate-400">+{bill.items.length - 2} more item(s)</div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono">
                        <div className="text-slate-900 font-semibold">Total: ₹{bill.net_payable.toFixed(2)}</div>
                        <div className="text-emerald-700 text-[11px]">Paid: ₹{bill.amount_paid.toFixed(2)}</div>
                        {bill.balance_due > 0 && (
                          <div className="text-amber-700 text-[11px] font-bold">Due: ₹{bill.balance_due.toFixed(2)}</div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {/* Critical Rule: Green Checkmark and PAID only when verified */}
                        {bill.status === 'PAID' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Paid</span>
                          </span>
                        ) : bill.status === 'PARTIALLY_PAID' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-100 text-sky-800 border border-sky-300">
                            Partially Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-300">
                            Pending Settlement
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {bill.status !== 'PAID' && (
                            <button
                              onClick={() => handleOpenPay(bill)}
                              className="px-2.5 py-1 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium transition shadow-sm"
                            >
                              Process Payment
                            </button>
                          )}

                          {bill.payments && bill.payments.length > 0 && (
                            <button
                              onClick={() => handleViewReceipt(bill)}
                              className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium flex items-center space-x-1 transition"
                            >
                              <Receipt className="w-3.5 h-3.5 text-slate-500" />
                              <span>Receipt</span>
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

      {/* MODAL 1: Process Payment */}
      {showPayModal && selectedBill && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                Verified Payment Transaction Settlement
              </h3>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="mt-3 text-xs text-slate-600 space-y-3">
              <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200 font-mono">
                <div className="text-emerald-900 font-bold text-sm">Invoice: {selectedBill.bill_number}</div>
                <div className="text-slate-700 mt-1">Patient: {selectedBill.patient_name} ({selectedBill.patient_national_id})</div>
                <div className="text-slate-700">Total Net: ₹{selectedBill.net_payable.toFixed(2)}</div>
                <div className="text-amber-800 font-bold">Outstanding Balance: ₹{selectedBill.balance_due.toFixed(2)}</div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Settlement Amount (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedBill.balance_due}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Payment Method / Gateway</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white text-slate-900"
                >
                  <option value="UPI">UPI (BHIM / PhonePe / GPay QR)</option>
                  <option value="CASH">Cash at Desk (Audited Handover)</option>
                  <option value="CREDIT_CARD">Credit Card POS Terminal</option>
                  <option value="DEBIT_CARD">Debit Card POS Terminal</option>
                  <option value="SANDBOX_GATEWAY">Sandbox Payment Adapter (Verified)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Cashier Settlement Remarks</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>

              <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[10px] text-slate-500">
                🛡️ Payment confirmation generates an immutable receipt number and prevents accidental duplicate charges.
              </div>
            </div>

            <div className="mt-5 flex justify-end space-x-2">
              <button
                onClick={() => setShowPayModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPay}
                className="px-4 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium shadow-sm"
              >
                Confirm Verified Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Official Hospital Payment Receipt */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-start pb-3 border-b border-slate-200">
              <div>
                <div className="text-sm font-bold text-slate-900">METRO GENERAL HOSPITAL</div>
                <div className="text-[10px] text-slate-400">OFFICIAL PAYMENT RECEIPT</div>
              </div>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="my-3 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Receipt Number:</span>
                <span className="font-mono font-bold text-slate-900">{receiptData.receipt_number}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Transaction Ref:</span>
                <span className="font-mono text-slate-700">{receiptData.transaction_ref}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Date &amp; Time:</span>
                <span>{receiptData.date_time}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Patient:</span>
                <span className="font-semibold text-slate-900">{receiptData.patient.name} ({receiptData.patient.national_health_id})</span>
              </div>
            </div>

            <div className="border-t border-b border-slate-200 py-3 my-3">
              <div className="text-[11px] font-semibold text-slate-700 mb-1">Itemized Services:</div>
              {receiptData.items.map((it: any, i: number) => (
                <div key={i} className="flex justify-between text-xs py-0.5">
                  <span className="text-slate-600">{it.description}</span>
                  <span className="font-mono text-slate-900">₹{it.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Amount Paid:</span>
                <span className="text-emerald-700 font-mono text-sm">₹{receiptData.amount_paid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Payment Method:</span>
                <span className="font-medium text-slate-700">{receiptData.payment_method}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Outstanding Balance:</span>
                <span className="font-mono">₹{receiptData.remaining_balance.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
              <div className="text-[10px] text-slate-400">
                Audited by: {receiptData.cashier_audited_by}
              </div>
              <button
                onClick={() => window.print()}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium flex items-center space-x-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Generate Custom Bill */}
      {showCreateBillModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-700" />
                Generate New Hospital Invoice
              </h3>
              <button onClick={() => setShowCreateBillModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="mt-3 text-xs text-slate-600 space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Select Patient</label>
                <select
                  value={newBillPatientId}
                  onChange={(e) => setNewBillPatientId(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white text-slate-900"
                >
                  {patientsList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.national_health_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Bill Department Category</label>
                <select
                  value={newBillType}
                  onChange={(e) => setNewBillType(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs bg-white text-slate-900"
                >
                  <option value="OPD_CONSULTATION">OPD Consultation</option>
                  <option value="LABORATORY">Diagnostic Laboratory</option>
                  <option value="PHARMACY">Pharmacy Medication</option>
                  <option value="COMPOSITE">Composite Hospital Care</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Item Description</label>
                <input
                  type="text"
                  value={newBillItems[0].item_description}
                  onChange={(e) => setNewBillItems([{ ...newBillItems[0], item_description: e.target.value }])}
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Unit Price (INR)</label>
                  <input
                    type="number"
                    value={newBillItems[0].unit_price}
                    onChange={(e) => setNewBillItems([{ ...newBillItems[0], unit_price: Number(e.target.value) }])}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={newBillItems[0].quantity}
                    onChange={(e) => setNewBillItems([{ ...newBillItems[0], quantity: Number(e.target.value) }])}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end space-x-2">
              <button
                onClick={() => setShowCreateBillModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBill}
                className="px-4 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium shadow-sm"
              >
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
