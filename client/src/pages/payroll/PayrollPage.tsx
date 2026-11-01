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
  ArrowRight,
  Printer,
  Sliders,
  ShieldCheck,
  Eye,
  Trash2,
  Check,
  HelpCircle,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Payslip, Employee, SalaryStructure, Transaction } from '../../types';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';

interface AttendanceSummaryData {
  totalCalendarDays?: number;
  workingDays?: number;
  presentDays?: number;
  halfDays?: number;
  paidLeaveDays?: number;
  unpaidLeaveDays?: number;
  holidays?: number;
  weeklyOffs?: number;
  paidDays?: number;
  lopDays?: number;
  overtimeHours?: number;
}

interface LineItemData {
  name: string;
  amount: number;
}

function numberToIndianWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'Rupees Zero Only';
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertSection = (n: number): string => {
    let out = '';
    if (n >= 100) {
      out += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      out += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      out += a[n] + ' ';
    }
    return out.trim();
  };

  const whole = Math.floor(num);
  let words = '';
  const crore = Math.floor(whole / 10000000);
  let rem = whole % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  const hundreds = rem;

  if (crore > 0) words += convertSection(crore) + ' Crore ';
  if (lakh > 0) words += convertSection(lakh) + ' Lakh ';
  if (thousand > 0) words += convertSection(thousand) + ' Thousand ';
  if (hundreds > 0) words += convertSection(hundreds) + ' ';

  words = words.trim();
  return words ? `Rupees ${words} Only` : 'Rupees Zero Only';
}

export const PayrollPage: React.FC = () => {
  const { user } = useAuth();
  const isHRManager = user?.role === 'HR Manager';

  const [activeTab, setActiveTab] = useState<'my-slips' | 'run-payroll' | 'structures' | 'ledger'>(
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

  // Employees List (HR Manager)
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Salary Structure & Statutory Overrides State (HR Manager)
  const [selectedStructureEmpId, setSelectedStructureEmpId] = useState('');
  const [structureBasic, setStructureBasic] = useState('20000');
  const [structureHra, setStructureHra] = useState('8000');
  const [structureAllowances, setStructureAllowances] = useState<{ id: string; name: string; amount: number }[]>([
    { id: '1', name: 'Conveyance Allowance', amount: 1600 },
    { id: '2', name: 'Medical Allowance', amount: 1250 },
    { id: '3', name: 'Special Allowance', amount: 2000 }
  ]);
  const [structureCustomDeductions, setStructureCustomDeductions] = useState<{ id: string; name: string; amount: number }[]>([]);
  const [structureOvertimeRate, setStructureOvertimeRate] = useState('0');
  const [structureEffectiveFrom, setStructureEffectiveFrom] = useState(new Date().toISOString().substring(0, 10));

  // Statutory Overrides
  const [structurePfEnabled, setStructurePfEnabled] = useState(true);
  const [structurePfCapEnabled, setStructurePfCapEnabled] = useState(true);
  const [structurePfOverrideType, setStructurePfOverrideType] = useState<'default' | 'fixed' | 'percent' | 'exempt'>('default');
  const [structurePfOverrideValue, setStructurePfOverrideValue] = useState('');

  const [structureEsiEnabled, setStructureEsiEnabled] = useState(false);
  const [structureEsiOverrideType, setStructureEsiOverrideType] = useState<'default' | 'fixed' | 'percent' | 'exempt'>('default');
  const [structureEsiOverrideValue, setStructureEsiOverrideValue] = useState('');

  const [structurePtEnabled, setStructurePtEnabled] = useState(true);
  const [structurePtOverrideType, setStructurePtOverrideType] = useState<'default' | 'fixed' | 'exempt'>('default');
  const [structurePtOverrideValue, setStructurePtOverrideValue] = useState('');

  const [isLoadingStructure, setIsLoadingStructure] = useState(false);
  const [isSavingStructure, setIsSavingStructure] = useState(false);
  const [structureFeedback, setStructureFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Advances / Ledger State (HR Manager)
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
        if (res.employees.length > 0) {
          if (!selectedLedgerEmpId) setSelectedLedgerEmpId(res.employees[0].employee_id);
          if (!selectedStructureEmpId) setSelectedStructureEmpId(res.employees[0].employee_id);
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

  // Load Salary Structure when selected employee changes
  useEffect(() => {
    if (selectedStructureEmpId) {
      fetchSalaryStructure(selectedStructureEmpId);
    }
  }, [selectedStructureEmpId]);

  const fetchSalaryStructure = async (empId: string) => {
    if (!empId) return;
    setIsLoadingStructure(true);
    setStructureFeedback(null);
    try {
      const res = await api.get<{ success: boolean; structure: SalaryStructure | null }>(`/payroll/structures/${empId}`);
      if (res.success && res.structure) {
        const s = res.structure;
        setStructureBasic(String(s.basic ?? 0));
        setStructureHra(String(s.hra ?? 0));
        setStructureOvertimeRate(String(s.overtime_rate ?? 0));
        setStructureEffectiveFrom(s.effective_from || new Date().toISOString().substring(0, 10));
        setStructurePfEnabled(s.pf_enabled === true || String(s.pf_enabled) === 'true');
        setStructureEsiEnabled(s.esi_enabled === true || String(s.esi_enabled) === 'true');
        setStructurePtEnabled(s.pt_enabled === true || String(s.pt_enabled) === 'true');

        // Parse allowances
        let allowancesObj: Record<string, number> = {};
        try {
          allowancesObj = typeof s.allowances_json === 'string' ? JSON.parse(s.allowances_json) : (s.allowances_json || {});
        } catch (e) {}
        const allowancesList = Object.entries(allowancesObj).map(([name, amount], idx) => ({
          id: String(idx + 1),
          name,
          amount: Number(amount) || 0
        }));
        setStructureAllowances(allowancesList.length > 0 ? allowancesList : [
          { id: '1', name: 'Conveyance Allowance', amount: 1600 },
          { id: '2', name: 'Medical Allowance', amount: 1250 },
          { id: '3', name: 'Special Allowance', amount: 2000 }
        ]);

        // Parse deductions and statutory overrides
        let deductionsObj: Record<string, any> = {};
        try {
          deductionsObj = typeof s.deductions_json === 'string' ? JSON.parse(s.deductions_json) : (s.deductions_json || {});
        } catch (e) {}

        const pfCap = s.pf_cap_enabled !== undefined
          ? (s.pf_cap_enabled === true || String(s.pf_cap_enabled) === 'true')
          : (deductionsObj.pf_cap_enabled !== undefined ? (deductionsObj.pf_cap_enabled === true || String(deductionsObj.pf_cap_enabled) === 'true') : true);
        setStructurePfCapEnabled(pfCap);

        const pfType = s.pf_override_type || deductionsObj.pf_override_type || 'default';
        setStructurePfOverrideType(pfType as any);
        const pfVal = s.pf_override_value !== undefined ? s.pf_override_value : (deductionsObj.pf_override_value !== undefined ? deductionsObj.pf_override_value : '');
        setStructurePfOverrideValue(pfVal !== '' && pfVal !== undefined ? String(pfVal) : '');

        const esiType = s.esi_override_type || deductionsObj.esi_override_type || 'default';
        setStructureEsiOverrideType(esiType as any);
        const esiVal = s.esi_override_value !== undefined ? s.esi_override_value : (deductionsObj.esi_override_value !== undefined ? deductionsObj.esi_override_value : '');
        setStructureEsiOverrideValue(esiVal !== '' && esiVal !== undefined ? String(esiVal) : '');

        const ptType = s.pt_override_type || deductionsObj.pt_override_type || 'default';
        setStructurePtOverrideType(ptType as any);
        const ptVal = s.pt_override_value !== undefined ? s.pt_override_value : (deductionsObj.pt_override_value !== undefined ? deductionsObj.pt_override_value : '');
        setStructurePtOverrideValue(ptVal !== '' && ptVal !== undefined ? String(ptVal) : '');

        const ignoredKeys = new Set([
          'pf_cap_enabled',
          'pf_override_type',
          'pf_override_value',
          'esi_override_type',
          'esi_override_value',
          'pt_override_type',
          'pt_override_value'
        ]);

        const customDeds = Object.entries(deductionsObj)
          .filter(([key]) => !ignoredKeys.has(key))
          .map(([name, amount], idx) => ({
            id: String(idx + 1),
            name,
            amount: Number(amount) || 0
          }));
        setStructureCustomDeductions(customDeds);
      } else {
        // Reset to smart defaults
        setStructureBasic('20000');
        setStructureHra('8000');
        setStructureAllowances([
          { id: '1', name: 'Conveyance Allowance', amount: 1600 },
          { id: '2', name: 'Medical Allowance', amount: 1250 },
          { id: '3', name: 'Special Allowance', amount: 2000 }
        ]);
        setStructureCustomDeductions([]);
        setStructureOvertimeRate('0');
        setStructureEffectiveFrom(new Date().toISOString().substring(0, 10));
        setStructurePfEnabled(true);
        setStructurePfCapEnabled(true);
        setStructurePfOverrideType('default');
        setStructurePfOverrideValue('');
        setStructureEsiEnabled(false);
        setStructureEsiOverrideType('default');
        setStructureEsiOverrideValue('');
        setStructurePtEnabled(true);
        setStructurePtOverrideType('default');
        setStructurePtOverrideValue('');
      }
    } catch (e: any) {
      setStructureFeedback({ type: 'error', message: 'Failed to load salary structure' });
    } finally {
      setIsLoadingStructure(false);
    }
  };

  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStructureEmpId) return;

    setIsSavingStructure(true);
    setStructureFeedback(null);

    const allowancesObj: Record<string, number> = {};
    structureAllowances.forEach(a => {
      if (a.name.trim()) allowancesObj[a.name.trim()] = Number(a.amount) || 0;
    });

    const deductionsObj: Record<string, any> = {};
    structureCustomDeductions.forEach(d => {
      if (d.name.trim()) deductionsObj[d.name.trim()] = Number(d.amount) || 0;
    });

    deductionsObj.pf_cap_enabled = structurePfCapEnabled;
    deductionsObj.pf_override_type = structurePfOverrideType;
    deductionsObj.pf_override_value = structurePfOverrideValue ? Number(structurePfOverrideValue) : 0;
    deductionsObj.esi_override_type = structureEsiOverrideType;
    deductionsObj.esi_override_value = structureEsiOverrideValue ? Number(structureEsiOverrideValue) : 0;
    deductionsObj.pt_override_type = structurePtOverrideType;
    deductionsObj.pt_override_value = structurePtOverrideValue ? Number(structurePtOverrideValue) : 0;

    const payload = {
      basic: Number(structureBasic) || 0,
      hra: Number(structureHra) || 0,
      allowances: allowancesObj,
      deductions: deductionsObj,
      pf_enabled: structurePfEnabled,
      esi_enabled: structureEsiEnabled,
      pt_enabled: structurePtEnabled,
      overtime_rate: Number(structureOvertimeRate) || 0,
      effective_from: structureEffectiveFrom,
      pf_cap_enabled: structurePfCapEnabled,
      pf_override_type: structurePfOverrideType,
      pf_override_value: structurePfOverrideValue ? Number(structurePfOverrideValue) : 0,
      esi_override_type: structureEsiOverrideType,
      esi_override_value: structureEsiOverrideValue ? Number(structureEsiOverrideValue) : 0,
      pt_override_type: structurePtOverrideType,
      pt_override_value: structurePtOverrideValue ? Number(structurePtOverrideValue) : 0
    };

    try {
      const res = await api.post<{ success: boolean; message: string }>(
        `/payroll/structures/${selectedStructureEmpId}`,
        payload
      );
      if (res.success) {
        setStructureFeedback({ type: 'success', message: res.message || 'Salary structure saved successfully!' });
      } else {
        setStructureFeedback({ type: 'error', message: res.message || 'Failed to save salary structure' });
      }
    } catch (err: any) {
      setStructureFeedback({ type: 'error', message: err.message || 'Failed to save salary structure' });
    } finally {
      setIsSavingStructure(false);
    }
  };

  // Live Estimated Calculations for Structure Editor
  const calcBasic = Number(structureBasic) || 0;
  const calcHra = Number(structureHra) || 0;
  const calcAllowancesTotal = structureAllowances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const calcGrossBase = calcBasic + calcHra + calcAllowancesTotal;

  let calcPf = 0;
  if (structurePfEnabled) {
    if (structurePfOverrideType === 'exempt') calcPf = 0;
    else if (structurePfOverrideType === 'fixed') calcPf = Math.max(0, Math.round(Number(structurePfOverrideValue) || 0));
    else if (structurePfOverrideType === 'percent') {
      const pct = (Number(structurePfOverrideValue) || 0) / 100;
      const base = structurePfCapEnabled ? Math.min(calcBasic, 15000) : calcBasic;
      calcPf = Math.round(base * pct);
    } else {
      const base = structurePfCapEnabled ? Math.min(calcBasic, 15000) : calcBasic;
      calcPf = Math.round(base * 0.12);
    }
  }

  let calcEsi = 0;
  if (structureEsiEnabled) {
    if (structureEsiOverrideType === 'exempt') calcEsi = 0;
    else if (structureEsiOverrideType === 'fixed') calcEsi = Math.max(0, Math.round(Number(structureEsiOverrideValue) || 0));
    else if (structureEsiOverrideType === 'percent') {
      const pct = (Number(structureEsiOverrideValue) || 0) / 100;
      calcEsi = Math.round(calcGrossBase * pct);
    } else {
      if (calcGrossBase <= 21000) {
        calcEsi = Math.round(calcGrossBase * 0.0075);
      }
    }
  }

  let calcPt = 0;
  if (structurePtEnabled) {
    if (structurePtOverrideType === 'exempt') calcPt = 0;
    else if (structurePtOverrideType === 'fixed') calcPt = Math.max(0, Math.round(Number(structurePtOverrideValue) || 0));
    else {
      if (calcGrossBase > 20000) calcPt = 200;
      else if (calcGrossBase > 15000) calcPt = 150;
      else if (calcGrossBase > 10000) calcPt = 100;
    }
  }

  const calcCustomDedsTotal = structureCustomDeductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const calcTotalDeds = calcPf + calcEsi + calcPt + calcCustomDedsTotal;
  const calcEstimatedNet = Math.max(0, calcGrossBase - calcTotalDeds);

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

  const openPreviewSlipViewer = (line: any) => {
    const previewSlip: Payslip = {
      id: `preview-${line.employee_id}`,
      payroll_run_id: 'PREVIEW',
      employee_id: line.employee_id,
      month: selectedMonth,
      attendance_json: JSON.stringify(line.calcResult.attendance),
      earnings_json: JSON.stringify(line.calcResult.earnings),
      deductions_json: JSON.stringify(line.calcResult.deductions),
      gross: line.calcResult.totalEarnings || line.calcResult.grossBase,
      total_deductions: line.calcResult.totalDeductions,
      net_pay: line.calcResult.netPay,
      net_in_words: line.calcResult.netInWords,
      paid_status: 'Unpaid',
      mode: 'Bank Transfer (NEFT/IMPS)'
    };
    const emp = employees.find(e => e.employee_id === line.employee_id) || ({
      id: line.employee_id,
      employee_id: line.employee_id,
      full_name: line.employee_name,
      department: line.department,
      designation: line.designation,
      bank_name: line.bank_name,
      ifsc: line.ifsc
    } as Employee);
    setSelectedPayslip({ payslip: previewSlip, employee: emp, isPreview: true });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-brand-600" /> Payroll & Payslips
          </h2>
          <p className="text-xs text-slate-500">
            Comprehensive salary slip generation, statutory PF/ESI/PT overrides, advance ledger, and PDF/Print statements
          </p>
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
                  onClick={() => setActiveTab('structures')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'structures' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-brand-600" /> Salary Structures
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
              description={`Click 'Calculate Preview' to process attendance, LOP deductions, statutory calculations, and advance recoveries for ${selectedMonth}.`}
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
                      <th className="py-3 px-4 text-center">Action</th>
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
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => openPreviewSlipViewer(line)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-700 border border-slate-200 hover:border-brand-200 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" /> View Slip
                            </button>
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

      {/* Tab 3: Salary Structures & Statutory Overrides (HR Manager Only) */}
      {activeTab === 'structures' && isHRManager && (
        <div className="space-y-6">
          {/* Employee Selection Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">Select Employee:</label>
              <select
                value={selectedStructureEmpId}
                onChange={e => setSelectedStructureEmpId(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              >
                {employees.map(e => (
                  <option key={e.employee_id} value={e.employee_id}>
                    {e.full_name} ({e.employee_id}) — {e.designation || 'Staff'} • {e.department || 'General'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Effective From:</span>
              <input
                type="date"
                value={structureEffectiveFrom}
                onChange={e => setStructureEffectiveFrom(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              />
            </div>
          </div>

          {structureFeedback && (
            <div
              className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between ${
                structureFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              <span>{structureFeedback.message}</span>
              <button
                type="button"
                onClick={() => setStructureFeedback(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                &times;
              </button>
            </div>
          )}

          <form onSubmit={handleSaveStructure} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Base Pay & Allowances (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Basic & HRA Card */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-brand-600" /> Basic Pay & House Rent Allowance (HRA)
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Core Monthly Base</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Basic Salary (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={structureBasic}
                        onChange={e => setStructureBasic(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                        placeholder="e.g. 25000"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Foundation for PF (12%) statutory calculations</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">HRA (₹) *</label>
                        <div className="flex gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setStructureHra(String(Math.round((Number(structureBasic) || 0) * 0.4)))}
                            className="text-brand-600 hover:underline font-bold"
                          >
                            40%
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => setStructureHra(String(Math.round((Number(structureBasic) || 0) * 0.5)))}
                            className="text-brand-600 hover:underline font-bold"
                          >
                            50%
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        required
                        value={structureHra}
                        onChange={e => setStructureHra(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                        placeholder="e.g. 10000"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Typically 40% (Non-metro) or 50% (Metro)</p>
                    </div>
                  </div>
                </div>

                {/* Monthly Allowances List */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-600" /> Standard Monthly Allowances
                      </h3>
                      <p className="text-xs text-slate-500">Itemized earnings added to gross compensation</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setStructureAllowances([
                          ...structureAllowances,
                          { id: String(Date.now()), name: '', amount: 0 }
                        ])
                      }
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Allowance
                    </button>
                  </div>

                  <div className="space-y-3">
                    {structureAllowances.map((allowance, idx) => (
                      <div key={allowance.id} className="flex items-center gap-3">
                        <input
                          type="text"
                          value={allowance.name}
                          onChange={e => {
                            const updated = [...structureAllowances];
                            updated[idx].name = e.target.value;
                            setStructureAllowances(updated);
                          }}
                          placeholder="Allowance Name (e.g. Conveyance, Medical)"
                          className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                        />
                        <div className="w-32 relative">
                          <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={allowance.amount}
                            onChange={e => {
                              const updated = [...structureAllowances];
                              updated[idx].amount = Number(e.target.value) || 0;
                              setStructureAllowances(updated);
                            }}
                            className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setStructureAllowances(structureAllowances.filter((_, i) => i !== idx));
                          }}
                          className="p-2 text-slate-400 hover:text-rose-600 transition"
                          title="Remove allowance"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Total Allowances:</span>
                    <span className="text-emerald-700 font-black">₹{calcAllowancesTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Overtime Hourly Rate & Custom Fixed Deductions */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-600" /> Overtime & Other Fixed Deductions
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Overtime Rate (₹ / Hour)</label>
                      <input
                        type="number"
                        min="0"
                        value={structureOvertimeRate}
                        onChange={e => setStructureOvertimeRate(e.target.value)}
                        placeholder="0 (or e.g. 150)"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Multiplied by approved overtime hours during run</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">Custom Deductions</label>
                        <button
                          type="button"
                          onClick={() =>
                            setStructureCustomDeductions([
                              ...structureCustomDeductions,
                              { id: String(Date.now()), name: '', amount: 0 }
                            ])
                          }
                          className="text-[10px] text-brand-600 hover:underline font-bold"
                        >
                          + Add Item
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mb-2">E.g. Staff Welfare, Insurance, Club Fund</p>
                    </div>
                  </div>

                  {structureCustomDeductions.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      {structureCustomDeductions.map((ded, idx) => (
                        <div key={ded.id} className="flex items-center gap-3">
                          <input
                            type="text"
                            value={ded.name}
                            onChange={e => {
                              const updated = [...structureCustomDeductions];
                              updated[idx].name = e.target.value;
                              setStructureCustomDeductions(updated);
                            }}
                            placeholder="Deduction Name"
                            className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                          />
                          <div className="w-28 relative">
                            <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={ded.amount}
                              onChange={e => {
                                const updated = [...structureCustomDeductions];
                                updated[idx].amount = Number(e.target.value) || 0;
                                setStructureCustomDeductions(updated);
                              }}
                              className="w-full pl-6 pr-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setStructureCustomDeductions(structureCustomDeductions.filter((_, i) => i !== idx));
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Statutory Overrides & Live Preview (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Statutory Overrides Card */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-brand-600" /> Statutory Calculations & Overrides
                    </h3>
                    <p className="text-xs text-slate-500">Configure Indian statutory PF, ESI, and PT rules</p>
                  </div>

                  {/* PF Section */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="pf_toggle"
                          checked={structurePfEnabled}
                          onChange={e => setStructurePfEnabled(e.target.checked)}
                          className="w-4 h-4 text-brand-600 rounded"
                        />
                        <label htmlFor="pf_toggle" className="font-black text-slate-900 cursor-pointer">
                          Provident Fund (PF)
                        </label>
                      </div>
                      <span className="text-[10px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                        Standard 12%
                      </span>
                    </div>

                    {structurePfEnabled && (
                      <div className="space-y-3 pt-2 border-t border-slate-200">
                        {/* PF Wage Ceiling Cap Toggle */}
                        <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                          <input
                            type="checkbox"
                            id="pf_cap_toggle"
                            checked={structurePfCapEnabled}
                            onChange={e => setStructurePfCapEnabled(e.target.checked)}
                            className="w-4 h-4 text-brand-600 rounded mt-0.5"
                          />
                          <div>
                            <label htmlFor="pf_cap_toggle" className="font-bold text-slate-900 cursor-pointer block">
                              EPFO Wage Ceiling Cap (₹15,000 / Max ₹1,800)
                            </label>
                            <p className="text-[10px] text-slate-500">
                              Caps Basic at ₹15,000 for statutory 12% deduction (₹1,800/mo ceiling).
                            </p>
                          </div>
                        </div>

                        {/* PF Mode */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            PF Calculation Mode
                          </label>
                          <select
                            value={structurePfOverrideType}
                            onChange={e => setStructurePfOverrideType(e.target.value as any)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                          >
                            <option value="default">Default Statutory (12% of Basic with Cap)</option>
                            <option value="fixed">Fixed Monthly Amount (₹)</option>
                            <option value="percent">Custom Percentage (%)</option>
                            <option value="exempt">Statutory Exempt (₹0)</option>
                          </select>
                        </div>

                        {['fixed', 'percent'].includes(structurePfOverrideType) && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              {structurePfOverrideType === 'fixed' ? 'Override Amount (₹)' : 'Custom Percentage (%)'}
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={structurePfOverrideValue}
                              onChange={e => setStructurePfOverrideValue(e.target.value)}
                              placeholder={structurePfOverrideType === 'fixed' ? 'e.g. 1800' : 'e.g. 12'}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ESI Section */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="esi_toggle"
                          checked={structureEsiEnabled}
                          onChange={e => setStructureEsiEnabled(e.target.checked)}
                          className="w-4 h-4 text-brand-600 rounded"
                        />
                        <label htmlFor="esi_toggle" className="font-black text-slate-900 cursor-pointer">
                          Employee State Insurance (ESI)
                        </label>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Standard 0.75%
                      </span>
                    </div>

                    {structureEsiEnabled && (
                      <div className="space-y-3 pt-2 border-t border-slate-200">
                        <p className="text-[10px] text-slate-500 bg-white p-2 rounded-xl border border-slate-200">
                          Statutory rule: Applies 0.75% of Gross Base only if Gross is ≤ ₹21,000/mo. If &gt; ₹21,000, statutory deduction is ₹0.
                        </p>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            ESI Calculation Mode
                          </label>
                          <select
                            value={structureEsiOverrideType}
                            onChange={e => setStructureEsiOverrideType(e.target.value as any)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                          >
                            <option value="default">Default Statutory (0.75% if Gross ≤ 21k)</option>
                            <option value="fixed">Fixed Monthly Amount (₹)</option>
                            <option value="percent">Custom Percentage (%)</option>
                            <option value="exempt">Statutory Exempt (₹0)</option>
                          </select>
                        </div>

                        {['fixed', 'percent'].includes(structureEsiOverrideType) && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              {structureEsiOverrideType === 'fixed' ? 'Override Amount (₹)' : 'Custom Percentage (%)'}
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={structureEsiOverrideValue}
                              onChange={e => setStructureEsiOverrideValue(e.target.value)}
                              placeholder={structureEsiOverrideType === 'fixed' ? 'e.g. 150' : 'e.g. 0.75'}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Professional Tax (PT) Section */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="pt_toggle"
                          checked={structurePtEnabled}
                          onChange={e => setStructurePtEnabled(e.target.checked)}
                          className="w-4 h-4 text-brand-600 rounded"
                        />
                        <label htmlFor="pt_toggle" className="font-black text-slate-900 cursor-pointer">
                          Professional Tax (PT)
                        </label>
                      </div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                        Kerala Slabs
                      </span>
                    </div>

                    {structurePtEnabled && (
                      <div className="space-y-3 pt-2 border-t border-slate-200">
                        <p className="text-[10px] text-slate-500 bg-white p-2 rounded-xl border border-slate-200">
                          Statutory slab: Gross &gt; 20k: ₹200 | 15k-20k: ₹150 | 10k-15k: ₹100 | ≤ 10k: ₹0.
                        </p>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            PT Calculation Mode
                          </label>
                          <select
                            value={structurePtOverrideType}
                            onChange={e => setStructurePtOverrideType(e.target.value as any)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                          >
                            <option value="default">Default Kerala Statutory Slabs</option>
                            <option value="fixed">Fixed Monthly Amount (₹)</option>
                            <option value="exempt">Statutory Exempt (₹0)</option>
                          </select>
                        </div>

                        {structurePtOverrideType === 'fixed' && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Fixed PT Amount (₹)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={structurePtOverrideValue}
                              onChange={e => setStructurePtOverrideValue(e.target.value)}
                              placeholder="e.g. 200"
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Real-time Breakdown Summary */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Live Estimated Compensation Breakdown
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                      Calculated
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Gross Monthly Base:</span>
                      <span className="font-bold text-white">₹{calcGrossBase.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-rose-300">
                      <span>PF Deduction:</span>
                      <span>-₹{calcPf.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-rose-300">
                      <span>ESI Deduction:</span>
                      <span>-₹{calcEsi.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-rose-300">
                      <span>Professional Tax (PT):</span>
                      <span>-₹{calcPt.toLocaleString('en-IN')}</span>
                    </div>
                    {calcCustomDedsTotal > 0 && (
                      <div className="flex justify-between text-rose-300">
                        <span>Other Fixed Deductions:</span>
                        <span>-₹{calcCustomDedsTotal.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-700 flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-300">Estimated Net Pay:</span>
                      <span className="font-black text-emerald-400 text-lg">
                        ₹{calcEstimatedNet.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingStructure || isLoadingStructure}
                    className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSavingStructure ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Saving Structure...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Save Salary Structure
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: Advances & Ledger (HR Manager Only) */}
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

      {/* Upgraded Full-Fidelity Itemized Payslip Viewer Modal */}
      <Modal
        isOpen={!!selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
        title="Comprehensive Salary Payslip"
        maxWidth="max-w-4xl"
      >
        {selectedPayslip && (() => {
          const p: Payslip = selectedPayslip.payslip;
          const emp: Partial<Employee> = selectedPayslip.employee || {};

          let att: AttendanceSummaryData = {
            totalCalendarDays: 30,
            workingDays: 26,
            presentDays: 0,
            halfDays: 0,
            paidLeaveDays: 0,
            unpaidLeaveDays: 0,
            holidays: 0,
            weeklyOffs: 4,
            paidDays: 0,
            lopDays: 0,
            overtimeHours: 0
          };
          try {
            if (typeof p.attendance_json === 'string' && p.attendance_json.trim()) {
              att = { ...att, ...JSON.parse(p.attendance_json) };
            } else if (p.attendance_json && typeof p.attendance_json === 'object') {
              att = { ...att, ...(p.attendance_json as any) };
            }
          } catch (e) {}

          let earnings: LineItemData[] = [];
          try {
            if (typeof p.earnings_json === 'string') {
              earnings = JSON.parse(p.earnings_json);
            } else if (Array.isArray(p.earnings_json)) {
              earnings = p.earnings_json;
            }
          } catch (e) {}

          let deductions: LineItemData[] = [];
          try {
            if (typeof p.deductions_json === 'string') {
              deductions = JSON.parse(p.deductions_json);
            } else if (Array.isArray(p.deductions_json)) {
              deductions = p.deductions_json;
            }
          } catch (e) {}

          const netPayInWords = p.net_in_words || numberToIndianWords(Number(p.net_pay) || 0);

          return (
            <div className="space-y-5 text-xs">
              {/* Dual Export Triggers & Action Toolbar (Hidden in Print) */}
              <div className="no-print flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-600" />
                  <span className="font-bold text-slate-800">Itemized Indian Statutory Payslip Document</span>
                  {selectedPayslip.isPreview && (
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                      Calculated Preview
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Payslip
                  </button>

                  {!selectedPayslip.isPreview ? (
                    <a
                      href={`/api/payroll/payslips/${p.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </a>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium italic">
                      Finalize month to generate official PDF download
                    </span>
                  )}
                </div>
              </div>

              {/* Printable Payslip Document Container */}
              <div
                id="payslip-print-view"
                className="printable-payslip space-y-5 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 text-slate-800 shadow-sm"
              >
                {/* Header Section */}
                <div className="border-b border-slate-200 pb-5 text-center">
                  <div className="inline-block px-3 py-0.5 mb-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase tracking-widest">
                    Confidential Salary Statement
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                    MASTERED SKILL ACADEMY
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    MSA HR & Educational Solutions • Kerala, India • contact@masteredskill.com
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl uppercase tracking-wider">
                    Payslip for the month of {p.month}
                  </div>
                </div>

                {/* Employee & Bank Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex justify-between border-b border-slate-200/50 pb-1">
                      <span className="text-slate-500 font-semibold">Employee Name:</span>
                      <span className="font-bold text-slate-900">{emp.full_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/50 pb-1">
                      <span className="text-slate-500 font-semibold">Employee ID:</span>
                      <span className="font-bold text-slate-900">{p.employee_id}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/50 pb-1">
                      <span className="text-slate-500 font-semibold">Designation:</span>
                      <span className="font-medium text-slate-800">{emp.designation || 'Staff'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/50 pb-1">
                      <span className="text-slate-500 font-semibold">Department:</span>
                      <span className="font-medium text-slate-800">{emp.department || 'Operations'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Date of Joining:</span>
                      <span className="font-medium text-slate-800">{emp.joining_date || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between border-b border-slate-200/50 pb-1">
                      <span className="text-slate-500 font-semibold">Bank Account:</span>
                      <span className="font-medium text-slate-800">
                        {emp.account_no ? `•••• ${emp.account_no.slice(-4)}` : (emp.bank_name ? `${emp.bank_name}` : 'N/A')}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/50 pb-1">
                      <span className="text-slate-500 font-semibold">Bank IFSC / Branch:</span>
                      <span className="font-medium text-slate-800">{emp.ifsc || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/50 pb-1">
                      <span className="text-slate-500 font-semibold">PAN Number:</span>
                      <span className="font-medium text-slate-800">{emp.pan ? emp.pan.replace(/^.{6}/, 'XXXXXX') : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200/50 pb-1">
                      <span className="text-slate-500 font-semibold">UAN / PF Number:</span>
                      <span className="font-medium text-slate-800">{emp.uan || (emp as any).pf_no || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">ESI Number:</span>
                      <span className="font-medium text-slate-800">{emp.esi_no || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Attendance Summary */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    Attendance & Calendar Breakdown
                  </h4>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Calendar</p>
                      <p className="text-sm font-black text-slate-800">{att.totalCalendarDays || 30}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Working</p>
                      <p className="text-sm font-black text-slate-800">{att.workingDays || 26}</p>
                    </div>
                    <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
                      <p className="text-[9px] text-emerald-600 font-bold uppercase">Present</p>
                      <p className="text-sm font-black text-emerald-800">{att.presentDays || 0}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Paid Leave</p>
                      <p className="text-sm font-black text-slate-800">{att.paidLeaveDays || 0}</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Off / Holidays</p>
                      <p className="text-sm font-black text-slate-800">{(att.holidays || 0) + (att.weeklyOffs || 0)}</p>
                    </div>
                    <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200/60">
                      <p className="text-[9px] text-blue-600 font-bold uppercase">Paid Days</p>
                      <p className="text-sm font-black text-blue-800">{att.paidDays || 0}</p>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${
                      (att.lopDays || 0) > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200/70'
                    }`}>
                      <p className={`text-[9px] font-bold uppercase ${
                        (att.lopDays || 0) > 0 ? 'text-rose-600' : 'text-slate-400'
                      }`}>LOP Days</p>
                      <p className={`text-sm font-black ${(att.lopDays || 0) > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                        {att.lopDays || 0}
                      </p>
                    </div>
                    <div className="p-2.5 bg-purple-50/60 rounded-xl border border-purple-200/60">
                      <p className="text-[9px] text-purple-600 font-bold uppercase">OT Hours</p>
                      <p className="text-sm font-black text-purple-800">{att.overtimeHours || 0}h</p>
                    </div>
                  </div>
                </div>

                {/* Side-by-Side Itemized Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Earnings Column */}
                  <div className="border border-emerald-200 rounded-2xl overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="bg-emerald-700 text-white px-4 py-2 flex justify-between items-center text-xs font-bold">
                        <span>EARNINGS (GROSS COMPONENTS)</span>
                        <span>AMOUNT (₹)</span>
                      </div>
                      <div className="divide-y divide-slate-100 text-xs">
                        {earnings.length === 0 ? (
                          <div className="p-4 text-slate-400 text-center">No itemized earnings available</div>
                        ) : (
                          earnings.map((item, idx) => (
                            <div key={idx} className="px-4 py-2 flex justify-between items-center hover:bg-slate-50">
                              <span className="text-slate-700">{item.name}</span>
                              <span className="font-semibold text-slate-900">
                                ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="bg-emerald-50 px-4 py-2.5 border-t border-emerald-200 flex justify-between items-center text-xs font-black text-emerald-950">
                      <span>Total Gross Earnings</span>
                      <span className="text-sm">
                        ₹{Number(p.gross || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Deductions Column */}
                  <div className="border border-rose-200 rounded-2xl overflow-hidden flex flex-col justify-between">
                    <div>
                      <div className="bg-rose-700 text-white px-4 py-2 flex justify-between items-center text-xs font-bold">
                        <span>DEDUCTIONS (STATUTORY & RECOVERIES)</span>
                        <span>AMOUNT (₹)</span>
                      </div>
                      <div className="divide-y divide-slate-100 text-xs">
                        {deductions.length === 0 ? (
                          <div className="p-4 text-slate-400 text-center">No deductions recorded</div>
                        ) : (
                          deductions.map((item, idx) => (
                            <div key={idx} className="px-4 py-2 flex justify-between items-center hover:bg-slate-50">
                              <span className="text-slate-700">{item.name}</span>
                              <span className="font-semibold text-rose-700">
                                ₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="bg-rose-50 px-4 py-2.5 border-t border-rose-200 flex justify-between items-center text-xs font-black text-rose-950">
                      <span>Total Deductions</span>
                      <span className="text-sm">
                        ₹{Number(p.total_deductions || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Net Pay Section */}
                <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-700">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                        Net Take-Home Pay
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          p.paid_status === 'Paid'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {p.paid_status || 'PENDING'}
                      </span>
                    </div>
                    <p className="text-3xl font-black text-white tracking-tight">
                      ₹{Number(p.net_pay || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-slate-300 mt-1 font-medium italic">
                      {netPayInWords}
                    </p>
                  </div>

                  <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-slate-700 pt-3 sm:pt-0 sm:pl-6 text-xs text-slate-400 space-y-1">
                    <p>
                      <strong className="text-slate-300">Payment Mode:</strong> {p.mode || 'Bank Transfer (NEFT/IMPS)'}
                    </p>
                    <p>
                      <strong className="text-slate-300">Disbursement:</strong>{' '}
                      {p.paid_on ? `Paid on ${p.paid_on}` : (p.reference || 'Pending disbursement')}
                    </p>
                  </div>
                </div>

                {/* Footer Disclaimer */}
                <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400 space-y-1">
                  <p className="italic">
                    Note: This is an official system-generated salary slip and does not require a physical signature.
                  </p>
                  <p>
                    Mastered Skill Academy • Kerala, India • Powered by MSA HR Suite
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};
