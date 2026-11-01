import { calculateEmployeePayroll, AttendanceSummary } from '../utils/payrollCalculator';
import { SalaryStructure, Transaction } from '../types';
import { numberToIndianWords } from '../utils/numberToWords';

describe('Payroll Calculation Engine', () => {
  const structure: SalaryStructure = {
    id: 'struct-1',
    employee_id: 'MSA-0003',
    effective_from: '2026-01-01',
    basic: 20000,
    hra: 10000,
    allowances_json: JSON.stringify({ 'Special Allowance': 5000 }),
    deductions_json: '{}',
    pf_enabled: true,
    esi_enabled: false,
    pt_enabled: true,
    overtime_rate: 150,
    created_at: '',
    updated_at: '',
    created_by: 'test',
    is_deleted: false
  };

  const attendance: AttendanceSummary = {
    totalCalendarDays: 30,
    workingDays: 26,
    presentDays: 24,
    halfDays: 0,
    paidLeaveDays: 2,
    unpaidLeaveDays: 0,
    holidays: 0,
    weeklyOffs: 4,
    paidDays: 30,
    lopDays: 0,
    overtimeHours: 0
  };

  test('calculates full month salary correctly without deductions', () => {
    const result = calculateEmployeePayroll('2026-03', structure, attendance, []);
    expect(result.grossBase).toBe(35000); // 20000 + 10000 + 5000
    // PF 12% of basic (20000 * 0.12) = 2400
    // PT = 200 (gross > 20000)
    // Net Pay = 35000 - 2400 - 200 = 32400
    expect(result.netPay).toBe(32400);
    expect(result.netInWords).toContain('Rupees Thirty Two Thousand Four Hundred Only');
  });

  test('deducts LOP (Loss of pay) for absent days', () => {
    const attendanceWithLOP: AttendanceSummary = {
      ...attendance,
      paidDays: 28,
      lopDays: 2
    };

    const result = calculateEmployeePayroll('2026-03', structure, attendanceWithLOP, []);
    const perDay = 35000 / 30; // 1166.67
    const expectedLop = Math.round(2 * perDay); // 2333
    const lopItem = result.deductions.find(d => d.name.includes('Loss of Pay'));
    expect(lopItem).toBeDefined();
    expect(lopItem?.amount).toBe(expectedLop);
  });

  test('auto-deducts advance/loan EMI from salary', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        employee_id: 'MSA-0003',
        type: 'advance',
        amount: 5000,
        emi_amount: 2500,
        balance: 5000,
        date: '2026-03-01',
        status: 'Active',
        created_at: '',
        updated_at: '',
        created_by: 'test',
        is_deleted: false
      }
    ];

    const result = calculateEmployeePayroll('2026-03', structure, attendance, transactions);
    const advanceDeduction = result.deductions.find(d => d.name === 'Advance Recovery');
    expect(advanceDeduction?.amount).toBe(2500);
    expect(result.activeTransactionsProcessed[0].newBalance).toBe(2500);
  });

  test('Indian number to words conversion works accurately', () => {
    expect(numberToIndianWords(1500)).toBe('Rupees One Thousand Five Hundred Only');
    expect(numberToIndianWords(125450)).toBe('Rupees One Lakh Twenty Five Thousand Four Hundred and Fifty Only');
  });

  describe('Statutory Overrides and PF Wage Ceiling', () => {
    test('caps PF at statutory ceiling ₹15,000 basic when pf_cap_enabled is true', () => {
      // Basic is 20000, but capped at 15000 -> 15000 * 0.12 = 1800
      const cappedStructure: SalaryStructure = {
        ...structure,
        pf_cap_enabled: true
      };
      const result = calculateEmployeePayroll('2026-03', cappedStructure, attendance, []);
      const pfItem = result.deductions.find(d => d.name === 'Provident Fund (PF)');
      expect(pfItem?.amount).toBe(1800);
    });

    test('does not exceed basic for PF calculation when basic is below ceiling', () => {
      // Basic is 12000 -> 12000 * 0.12 = 1440
      const belowCapStructure: SalaryStructure = {
        ...structure,
        basic: 12000,
        pf_cap_enabled: true
      };
      const result = calculateEmployeePayroll('2026-03', belowCapStructure, attendance, []);
      const pfItem = result.deductions.find(d => d.name === 'Provident Fund (PF)');
      expect(pfItem?.amount).toBe(1440);
    });

    test('supports PF overrides (fixed, percent, exempt)', () => {
      // Fixed override: 2000
      const fixedResult = calculateEmployeePayroll('2026-03', {
        ...structure,
        pf_override_type: 'fixed',
        pf_override_value: 2000
      }, attendance, []);
      expect(fixedResult.deductions.find(d => d.name === 'Provident Fund (PF)')?.amount).toBe(2000);

      // Exempt override: 0
      const exemptResult = calculateEmployeePayroll('2026-03', {
        ...structure,
        pf_override_type: 'exempt'
      }, attendance, []);
      expect(exemptResult.deductions.find(d => d.name === 'Provident Fund (PF)')).toBeUndefined();

      // Percent override: 10% of 20000 = 2000
      const percentResult = calculateEmployeePayroll('2026-03', {
        ...structure,
        pf_override_type: 'percent',
        pf_override_value: 10
      }, attendance, []);
      expect(percentResult.deductions.find(d => d.name === 'Provident Fund (PF)')?.amount).toBe(2000);
    });

    test('supports ESI overrides (fixed, exempt, percent)', () => {
      // ESI fixed override: 150
      const fixedResult = calculateEmployeePayroll('2026-03', {
        ...structure,
        esi_enabled: true,
        esi_override_type: 'fixed',
        esi_override_value: 150
      }, attendance, []);
      expect(fixedResult.deductions.find(d => d.name.includes('ESI'))?.amount).toBe(150);

      // ESI exempt override: 0
      const exemptResult = calculateEmployeePayroll('2026-03', {
        ...structure,
        esi_enabled: true,
        esi_override_type: 'exempt'
      }, attendance, []);
      expect(exemptResult.deductions.find(d => d.name.includes('ESI'))).toBeUndefined();
    });

    test('supports PT overrides (fixed, exempt)', () => {
      // PT fixed: 300
      const fixedResult = calculateEmployeePayroll('2026-03', {
        ...structure,
        pt_override_type: 'fixed',
        pt_override_value: 300
      }, attendance, []);
      expect(fixedResult.deductions.find(d => d.name.includes('PT'))?.amount).toBe(300);

      // PT exempt: 0
      const exemptResult = calculateEmployeePayroll('2026-03', {
        ...structure,
        pt_override_type: 'exempt'
      }, attendance, []);
      expect(exemptResult.deductions.find(d => d.name.includes('PT'))).toBeUndefined();
    });

    test('supports overrides passed via StatutoryOverrides argument', () => {
      const result = calculateEmployeePayroll('2026-03', structure, attendance, [], 'calendar_days', {
        pf_cap_enabled: true,
        pt_override_type: 'fixed',
        pt_override_value: 175
      });
      expect(result.deductions.find(d => d.name === 'Provident Fund (PF)')?.amount).toBe(1800);
      expect(result.deductions.find(d => d.name.includes('PT'))?.amount).toBe(175);
    });
  });
});

