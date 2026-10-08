import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Calendar,
  Download,
  Share2,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  CreditCard,
  Plus,
  RefreshCw,
  Archive,
  ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Payslip, Employee, SalaryStructure, Transaction } from '../../types';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';

export const PayrollPage: React.FC = () => {
  const { user } = useAuth();
  const isHRManager = user?.role === 'HR Manager';

  const [activeTab, setActiveTab] = useState<'my-slips' | 'run-payroll' | 'ledger'>(
    isHRManager ? 'run-payroll' : 'my-slips'
  );

  // Employee Payslips
  const [myPayslips, setMyPayslips] = useState<Payslip[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [isLoadingSlips, setIsLoadingSlips] = useState(true);

  // HR Payroll Calculation & Review
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [payrollPreview, setPayrollPreview] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  // Advances / Ledger State (HR Manager)
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedLedgerEmpId, setSelectedLedgerEmpId] = useState('');
  const [ledgerTransactions, setLedgerTransactions] = useState<Transaction[]>([]);
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [txType, setTxType] = useState<'advance' | 'loan' | 'bonus' | 'incentive' | 'fine' | 'reimbursement'>('advance');
  const [txAmount, setTxAmount] = useState('');
  const [txEmi, setTxEmi] = useState('');
  const [txRemark, setTxRemark] = useState('');
  const [isAddingTx, setIsAddingTx] = useState(false);

  const fetchMyPayslips = async () => {
    setIsLoadingSlips(true);
    try {
      const res = await api.get<{ success: boolean; payslips: Payslip[] }>('/payroll/payslips/my');
      if (res.success) setMyPayslips(res.payslips);
    } catch (e) {}
    finally {
      setIsLoadingSlips(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await api.get<{ success: boolean; employees: Employee[] }>('/employees');
      if (res.success) {
        setEmployees(res.employees);
        if (res.employees.length > 0 && !selectedLedgerEmpId) {
          setSelectedLedgerEmpId(res.employees[0].employee_id);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchMyPayslips();
    if (isHRManager) {
      fetchEmployees();
    }
  }, []);

  useEffect(() => {
    if (selectedLedgerEmpId) {
      api.get<{ success: boolean; transactions: Transaction[] }>(`/payroll/transactions/${selectedLedgerEmpId}`).then(res => {
        if (res.success) setLedgerTransactions(res.transactions);
      });
    }
  }, [selectedLedgerEmpId]);

  // Calculate Monthly Preview
  const handleCalculatePreview = async () => {
    setIsCalculating(true);
    try {
      const res = await api.post<{ success: boolean; payrollPreview: any[] }>('/payroll/calculate-preview', {
        month: selectedMonth
      });
      if (res.success) {
        setPayrollPreview(res.payrollPreview);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to calculate preview');
    } finally {
      setIsCalculating(false);
    }
  };

  // Finalize and Lock Month
  const handleFinalizePayroll = async () => {
    if (payrollPreview.length === 0) {
      alert('Please calculate the payroll preview first.');
      return;
    }
    if (!confirm(`Are you sure you want to finalize and lock payroll for ${selectedMonth}? This will generate all official PDF payslips.`)) {
      return;
    }

    setIsFinalizing(true);
    try {
      const res = await api.post('/payroll/finalize', {
        month: selectedMonth,
        payrollLines: payrollPreview
      });
      if (res.success) {
        alert(res.message);
        fetchMyPayslips();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to finalize payroll');
    } finally {
      setIsFinalizing(false);
    }
  };

  // Mark Paid
  const handleMarkPaid = async () => {
    setIsMarkingPaid(true);
    try {
      const res = await api.post('/payroll/mark-paid', {
        month: selectedMonth,
        mode: 'Bank Transfer (NEFT/IMPS)',
        reference: `BATCH-${selectedMonth}`
      });
      if (res.success) {
        alert(res.message);
        fetchMyPayslips();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to mark as paid');
    } finally {
      setIsMarkingPaid(false);
    }
  };

  // Bulk Download ZIP
  const handleBulkDownload = () => {
    window.open(`/api/payroll/bulk-download/${selectedMonth}`, '_blank');
  };

  // Record Transaction (Advance, Loan, Bonus)
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLedgerEmpId || !txAmount) return;
    setIsAddingTx(true);

    try {
      const res = await api.post(`/payroll/transactions/${selectedLedgerEmpId}`, {
        type: txType,
        amount: Number(txAmount),
        emi_amount: txEmi ? Number(txEmi) : Number(txAmount),
        remark: txRemark
      });
      if (res.success) {
        setShowAddTxModal(false);
        setTxAmount('');
        setTxEmi('');
        setTxRemark('');
        // Refresh transactions
        const txRes = await api.get<{ success: boolean; transactions: Transaction[] }>(`/payroll/transactions/${selectedLedgerEmpId}`);
        if (txRes.success) setLedgerTransactions(txRes.transactions);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record entry');
    } finally {
      setIsAddingTx(false);
    }
  };

  const openPayslipViewer = async (slipId: string) => {
    try {
      const res = await api.get<{ success: boolean; payslip: Payslip; employee: Employee }>(`/payroll/payslips/${slipId}`);
      if (res.success) {
        setSelectedPayslip(res);
      }
    } catch (e) {}
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-brand-600" /> Payroll & Payslips
          </h2>
          <p className="text-xs text-slate-500">Pagarbook-style salary calculations, advance deductions, and detailed PDF payslips</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('my-slips')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'my-slips' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              My Payslips
            </button>
            {isHRManager && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('run-payroll')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'run-payroll' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Monthly Payroll Run
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ledger')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'ledger' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Advances & Ledger
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab 1: Employee's Own Payslips */}
      {activeTab === 'my-slips' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900">Salary Payslips Archive</h3>

          {myPayslips.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No payslips generated yet"
              description="Official payslips will appear here once monthly payroll is finalized by HR."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {myPayslips.map(slip => (
                <div
                  key={slip.id}
                  className="p-5 bg-slate-50 rounded-3xl border border-slate-200/60 flex flex-col justify-between hover:border-brand-300 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-800">
                        {slip.month}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          slip.paid_status === 'Paid' ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {slip.paid_status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold">Net Salary</p>
                    <p className="text-2xl font-black text-slate-900 mt-0.5">
                      ₹{Number(slip.net_pay || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{slip.net_in_words}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openPayslipViewer(slip.id)}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition text-center"
                    >
                      View Details
                    </button>
                    <a
                      href={`/api/payroll/payslips/${slip.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Monthly Payroll Run (HR Manager Only) */}
      {activeTab === 'run-payroll' && isHRManager && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Select Payroll Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                />
              </div>

              <button
                type="button"
                disabled={isCalculating}
                onClick={handleCalculatePreview}
                className="mt-4 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCalculating ? 'animate-spin' : ''}`} />
                {isCalculating ? 'Calculating...' : 'Calculate Preview'}
              </button>
            </div>

            {payrollPreview.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleBulkDownload}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Archive className="w-3.5 h-3.5" /> Bulk Download ZIP
                </button>

                <button
                  type="button"
                  disabled={isMarkingPaid}
                  onClick={handleMarkPaid}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Month Paid
                </button>

                <button
                  type="button"
                  disabled={isFinalizing}
                  onClick={handleFinalizePayroll}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" /> Finalize & Lock Month
                </button>
              </div>
            )}
          </div>

          {/* Calculation Review Table */}
          {payrollPreview.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="Payroll preview not calculated"
              description={`Click 'Calculate Preview' to process attendance, LOP deductions, and advance recoveries for ${selectedMonth}.`}
              actionText="Run Calculation"
              onAction={handleCalculatePreview}
            />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Payroll Review Table ({payrollPreview.length} Active Staff)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Paid / LOP Days</th>
                      <th className="py-3 px-4">Gross Salary</th>
                      <th className="py-3 px-4">Deductions</th>
                      <th className="py-3 px-4">Net Take-Home</th>
                      <th className="py-3 px-4">Bank Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payrollPreview.map(line => {
                      const calc = line.calcResult;
                      return (
                        <tr key={line.employee_id} className="hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{line.employee_name}</p>
                            <p className="text-[10px] text-slate-400">{line.employee_id} • {line.designation}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            <strong>{calc.attendance.paidDays}</strong> paid / <span className="text-rose-600 font-bold">{calc.attendance.lopDays} LOP</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            ₹{Number(calc.totalEarnings || calc.grossBase).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 font-bold text-rose-600">
                            -₹{Number(calc.totalDeductions || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-black text-emerald-700 text-sm">
                              ₹{Number(calc.netPay || 0).toLocaleString('en-IN')}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {line.bank_name ? `${line.bank_name} (${line.ifsc})` : 'Bank not set'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Advances & Ledger (HR Manager Only) */}
      {activeTab === 'ledger' && isHRManager && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">Select Employee:</label>
              <select
                value={selectedLedgerEmpId}
                onChange={e => setSelectedLedgerEmpId(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              >
                {employees.map(e => (
                  <option key={e.employee_id} value={e.employee_id}>
                    {e.full_name} ({e.employee_id})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowAddTxModal(true)}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Advance / Loan / Bonus
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900">Advance & Adjustment Ledger</h3>

            {ledgerTransactions.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No active transactions"
                description="No salary advances, loan EMIs, or bonuses recorded for this employee."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Monthly EMI</th>
                      <th className="py-3 px-4">Remaining Balance</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-600">{tx.date}</td>
                        <td className="py-3 px-4 font-bold uppercase text-brand-700">{tx.type}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">₹{Number(tx.amount).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-slate-600">₹{Number(tx.emi_amount || tx.amount).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 font-bold text-rose-600">₹{Number(tx.balance).toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.status === 'Active' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{tx.remark || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      <Modal isOpen={showAddTxModal} onClose={() => setShowAddTxModal(false)} title="Record Ledger Entry">
        <form onSubmit={handleAddTransaction} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Transaction Type *</label>
            <select
              value={txType}
              onChange={e => setTxType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="advance">Salary Advance (Auto-deducted next salary)</option>
              <option value="loan">Staff Loan (Monthly EMI deduction)</option>
              <option value="bonus">Bonus / Incentive (Added to salary)</option>
              <option value="reimbursement">Expense Reimbursement (Added to salary)</option>
              <option value="fine">Penalty / Fine (Deducted from salary)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Total Amount (₹) *</label>
              <input
                type="number"
                required
                value={txAmount}
                onChange={e => setTxAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            {txType === 'loan' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Monthly EMI Recovery (₹) *</label>
                <input
                  type="number"
                  required
                  value={txEmi}
                  onChange={e => setTxEmi(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Remarks</label>
            <textarea
              rows={2}
              value={txRemark}
              onChange={e => setTxRemark(e.target.value)}
              placeholder="Reason for advance or bonus..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isAddingTx}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50"
          >
            {isAddingTx ? 'Recording...' : 'Save Entry'}
          </button>
        </form>
      </Modal>

      {/* Interactive Payslip Viewer Modal */}
      <Modal isOpen={!!selectedPayslip} onClose={() => setSelectedPayslip(null)} title="Detailed Salary Payslip" maxWidth="max-w-2xl">
        {selectedPayslip && (
          <div className="space-y-6 text-xs">
            <div className="text-center p-4 bg-brand-50 rounded-2xl border border-brand-200">
              <h4 className="font-extrabold text-base text-brand-950">MASTERED SKILL ACADEMY</h4>
              <p className="text-[11px] text-brand-700">Payslip for the month of {selectedPayslip.payslip.month}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <p><strong>Employee:</strong> {selectedPayslip.employee?.full_name}</p>
                <p><strong>ID:</strong> {selectedPayslip.payslip.employee_id}</p>
                <p><strong>Designation:</strong> {selectedPayslip.employee?.designation}</p>
              </div>
              <div>
                <p><strong>Department:</strong> {selectedPayslip.employee?.department}</p>
                <p><strong>Status:</strong> {selectedPayslip.payslip.paid_status}</p>
                <p><strong>Date:</strong> {selectedPayslip.payslip.paid_on || 'Pending'}</p>
              </div>
            </div>

            {/* Total Net Take Home */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400">Net Take-Home Pay</span>
                <p className="text-2xl font-black text-emerald-400">
                  ₹{Number(selectedPayslip.payslip.net_pay).toLocaleString('en-IN')}
                </p>
                <p className="text-[10px] text-slate-300 mt-0.5">{selectedPayslip.payslip.net_in_words}</p>
              </div>
              <a
                href={`/api/payroll/payslips/${selectedPayslip.payslip.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition"
              >
                <Download className="w-4 h-4" /> Download PDF
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
