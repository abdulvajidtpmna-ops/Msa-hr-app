import { SalaryStructure, Transaction } from '../types';
import { numberToIndianWords } from './numberToWords';

export interface AttendanceSummary {
  totalCalendarDays: number;
  workingDays: number;
  presentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  holidays: number;
  weeklyOffs: number;
  paidDays: number;
  lopDays: number;
  overtimeHours: number;
}

export interface PayrollLineItem {
  name: string;
  amount: number;
}

export interface PayrollCalculationResult {
  month: string;
  attendance: AttendanceSummary;
  perDaySalary: number;
  grossBase: number;
  earnings: PayrollLineItem[];
  totalEarnings: number;
  deductions: PayrollLineItem[];
  totalDeductions: number;
  netPay: number;
  netInWords: string;
  activeTransactionsProcessed: {
    transactionId: string;
    type: string;
    deductedOrAddedAmount: number;
    newBalance: number;
  }[];
}

export function calculateEmployeePayroll(
  month: string, // "YYYY-MM"
  structure: SalaryStructure,
  attendance: AttendanceSummary,
  transactions: Transaction[] = [],
  dayCalculationBasis: 'calendar_days' | 'fixed_30' | 'working_days' = 'calendar_days'
): PayrollCalculationResult {
  const basic = Number(structure.basic) || 0;
  const hra = Number(structure.hra) || 0;
  
  let otherAllowances: Record<string, number> = {};
  try {
    otherAllowances = typeof structure.allowances_json === 'string'
      ? JSON.parse(structure.allowances_json || '{}')
      : (structure.allowances_json || {});
  } catch (e) {
    otherAllowances = {};
  }

  let fixedDeductions: Record<string, number> = {};
  try {
    fixedDeductions = typeof structure.deductions_json === 'string'
      ? JSON.parse(structure.deductions_json || '{}')
      : (structure.deductions_json || {});
  } catch (e) {
    fixedDeductions = {};
  }

  // Base Gross
  let baseAllowancesTotal = 0;
  Object.values(otherAllowances).forEach(val => {
    baseAllowancesTotal += Number(val) || 0;
  });
  const grossBase = basic + hra + baseAllowancesTotal;

  // Divisor for per-day calculation
  let divisor = attendance.totalCalendarDays;
  if (dayCalculationBasis === 'fixed_30') {
    divisor = 30;
  } else if (dayCalculationBasis === 'working_days') {
    divisor = attendance.workingDays || 26;
  }
  divisor = Math.max(1, divisor);

  const perDaySalary = Math.round((grossBase / divisor) * 100) / 100;

  // LOP (Loss of Pay) Deduction
  const lopDeduction = Math.round(attendance.lopDays * perDaySalary);

  // Overtime Earnings
  const overtimeRate = Number(structure.overtime_rate) || (Math.round((perDaySalary / 8) * 100) / 100);
  const overtimeEarnings = Math.round((attendance.overtimeHours || 0) * overtimeRate);

  // Process Transactions (Advances, Loan EMIs, Bonuses, Incentives, Fines, Reimbursements)
  let bonusTotal = 0;
  let incentiveTotal = 0;
  let reimbursementTotal = 0;
  let advanceRecovery = 0;
  let loanEmiTotal = 0;
  let fineTotal = 0;

  const activeTransactionsProcessed: {
    transactionId: string;
    type: string;
    deductedOrAddedAmount: number;
    newBalance: number;
  }[] = [];

  for (const tx of transactions) {
    if (tx.status === 'Closed' || tx.status === 'Cancelled') continue;
    const currentBal = Number(tx.balance) || 0;

    if (tx.type === 'bonus') {
      const amt = Number(tx.amount) || 0;
      bonusTotal += amt;
      activeTransactionsProcessed.push({
        transactionId: tx.id,
        type: tx.type,
        deductedOrAddedAmount: amt,
        newBalance: 0
      });
    } else if (tx.type === 'incentive') {
      const amt = Number(tx.amount) || 0;
      incentiveTotal += amt;
      activeTransactionsProcessed.push({
        transactionId: tx.id,
        type: tx.type,
        deductedOrAddedAmount: amt,
        newBalance: 0
      });
    } else if (tx.type === 'reimbursement') {
      const amt = Number(tx.amount) || 0;
      reimbursementTotal += amt;
      activeTransactionsProcessed.push({
        transactionId: tx.id,
        type: tx.type,
        deductedOrAddedAmount: amt,
        newBalance: 0
      });
    } else if (tx.type === 'advance') {
      const deduct = Math.min(currentBal, Number(tx.emi_amount) || currentBal);
      advanceRecovery += deduct;
      activeTransactionsProcessed.push({
        transactionId: tx.id,
        type: tx.type,
        deductedOrAddedAmount: deduct,
        newBalance: Math.max(0, currentBal - deduct)
      });
    } else if (tx.type === 'loan') {
      const emi = Number(tx.emi_amount) || currentBal;
      const deduct = Math.min(currentBal, emi);
      loanEmiTotal += deduct;
      activeTransactionsProcessed.push({
        transactionId: tx.id,
        type: tx.type,
        deductedOrAddedAmount: deduct,
        newBalance: Math.max(0, currentBal - deduct)
      });
    } else if (tx.type === 'fine') {
      const deduct = Math.min(currentBal, Number(tx.amount) || currentBal);
      fineTotal += deduct;
      activeTransactionsProcessed.push({
        transactionId: tx.id,
        type: tx.type,
        deductedOrAddedAmount: deduct,
        newBalance: Math.max(0, currentBal - deduct)
      });
    }
  }

  // Statutory Deductions
  // PF: 12% of Basic (capped at statutory wage ceiling if configured)
  const pfEnabled = structure.pf_enabled === true || structure.pf_enabled === 'true';
  const pfDeduction = pfEnabled ? Math.round(basic * 0.12) : 0;

  // ESI: 0.75% of Gross if Gross <= 21000
  const esiEnabled = structure.esi_enabled === true || structure.esi_enabled === 'true';
  const esiDeduction = esiEnabled && grossBase <= 21000 ? Math.round(grossBase * 0.0075) : 0;

  // Professional Tax (Kerala standard / typical slab)
  const ptEnabled = structure.pt_enabled === true || structure.pt_enabled === 'true';
  let ptDeduction = 0;
  if (ptEnabled) {
    if (grossBase > 20000) ptDeduction = 200;
    else if (grossBase > 15000) ptDeduction = 150;
    else if (grossBase > 10000) ptDeduction = 100;
  }

  // Compile Earnings list
  const earnings: PayrollLineItem[] = [
    { name: 'Basic Salary', amount: basic },
    { name: 'House Rent Allowance (HRA)', amount: hra },
  ];

  Object.entries(otherAllowances).forEach(([key, val]) => {
    if (Number(val) > 0) {
      earnings.push({ name: key, amount: Number(val) });
    }
  });

  if (overtimeEarnings > 0) {
    earnings.push({ name: `Overtime (${attendance.overtimeHours} hrs)`, amount: overtimeEarnings });
  }
  if (bonusTotal > 0) {
    earnings.push({ name: 'Bonus', amount: bonusTotal });
  }
  if (incentiveTotal > 0) {
    earnings.push({ name: 'Incentive', amount: incentiveTotal });
  }
  if (reimbursementTotal > 0) {
    earnings.push({ name: 'Reimbursement', amount: reimbursementTotal });
  }

  const totalEarnings = earnings.reduce((sum, item) => sum + item.amount, 0);

  // Compile Deductions list
  const deductions: PayrollLineItem[] = [];

  if (lopDeduction > 0) {
    deductions.push({ name: `Loss of Pay (${attendance.lopDays} days)`, amount: lopDeduction });
  }
  if (pfDeduction > 0) {
    deductions.push({ name: 'Provident Fund (PF)', amount: pfDeduction });
  }
  if (esiDeduction > 0) {
    deductions.push({ name: 'Employee State Insurance (ESI)', amount: esiDeduction });
  }
  if (ptDeduction > 0) {
    deductions.push({ name: 'Professional Tax (PT)', amount: ptDeduction });
  }
  if (advanceRecovery > 0) {
    deductions.push({ name: 'Advance Recovery', amount: advanceRecovery });
  }
  if (loanEmiTotal > 0) {
    deductions.push({ name: 'Loan EMI Deduction', amount: loanEmiTotal });
  }
  if (fineTotal > 0) {
    deductions.push({ name: 'Fines / Penalties', amount: fineTotal });
  }

  Object.entries(fixedDeductions).forEach(([key, val]) => {
    if (Number(val) > 0) {
      deductions.push({ name: key, amount: Number(val) });
    }
  });

  const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);
  const netPay = Math.max(0, totalEarnings - totalDeductions);
  const netInWords = numberToIndianWords(netPay);

  return {
    month,
    attendance,
    perDaySalary,
    grossBase,
    earnings,
    totalEarnings,
    deductions,
    totalDeductions,
    netPay,
    netInWords,
    activeTransactionsProcessed
  };
}
