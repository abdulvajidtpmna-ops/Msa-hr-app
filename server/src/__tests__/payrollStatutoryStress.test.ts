import { calculateEmployeePayroll, AttendanceSummary, StatutoryOverrides } from '../utils/payrollCalculator';
import { SalaryStructure, Transaction } from '../types';
import { numberToIndianWords } from '../utils/numberToWords';

describe('Empirical Statutory Payroll & Overrides Stress Tests', () => {
  const baseStructure: SalaryStructure = {
    id: 'struct-stress-001',
    employee_id: 'EMP-STRESS-001',
    effective_from: '2026-01-01',
    basic: 20000,
    hra: 10000,
    allowances_json: '{}',
    deductions_json: '{}',
    pf_enabled: true,
    esi_enabled: true,
    pt_enabled: true,
    overtime_rate: 150,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    created_by: 'challenger',
    is_deleted: false
  };

  const baseAttendance: AttendanceSummary = {
    totalCalendarDays: 30,
    workingDays: 26,
    presentDays: 26,
    halfDays: 0,
    paidLeaveDays: 0,
    unpaidLeaveDays: 0,
    holidays: 0,
    weeklyOffs: 4,
    paidDays: 30,
    lopDays: 0,
    overtimeHours: 0
  };

  describe('PF Wage Ceiling Cap (₹15,000) & Uncapped Scenarios', () => {
    test('caps PF at ₹1,800 on exact boundary ₹15,000 basic when pf_cap_enabled is true', () => {
      const res = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 15000,
        pf_cap_enabled: true
      }, baseAttendance);
      const pf = res.deductions.find(d => d.name === 'Provident Fund (PF)');
      expect(pf?.amount).toBe(1800);
    });

    test('caps PF at ₹1,800 on boundary +1 (₹15,001 basic) when pf_cap_enabled is true', () => {
      const res = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 15001,
        pf_cap_enabled: true
      }, baseAttendance);
      const pf = res.deductions.find(d => d.name === 'Provident Fund (PF)');
      expect(pf?.amount).toBe(1800);
    });

    test('caps PF at ₹1,800 on high basic ₹100,000 when pf_cap_enabled is true', () => {
      const res = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 100000,
        pf_cap_enabled: true
      }, baseAttendance);
      const pf = res.deductions.find(d => d.name === 'Provident Fund (PF)');
      expect(pf?.amount).toBe(1800);
    });

    test('calculates uncapped 12% on high basic ₹100,000 (₹12,000) when pf_cap_enabled is false', () => {
      const res = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 100000,
        pf_cap_enabled: false
      }, baseAttendance);
      const pf = res.deductions.find(d => d.name === 'Provident Fund (PF)');
      expect(pf?.amount).toBe(12000);
    });

    test('handles string representation pf_cap_enabled: "true"', () => {
      const res = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 50000,
        pf_cap_enabled: 'true' as any
      }, baseAttendance);
      const pf = res.deductions.find(d => d.name === 'Provident Fund (PF)');
      expect(pf?.amount).toBe(1800);
    });

    test('respects PF fixed override of ₹2,500', () => {
      const res = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        pf_override_type: 'fixed',
        pf_override_value: 2500
      }, baseAttendance);
      const pf = res.deductions.find(d => d.name === 'Provident Fund (PF)');
      expect(pf?.amount).toBe(2500);
    });

    test('omits PF deduction when pf_override_type is exempt', () => {
      const res = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        pf_override_type: 'exempt'
      }, baseAttendance);
      const pf = res.deductions.find(d => d.name === 'Provident Fund (PF)');
      expect(pf).toBeUndefined();
    });

    test('calculates PF percent override capped vs uncapped', () => {
      const cappedRes = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 50000,
        pf_cap_enabled: true,
        pf_override_type: 'percent',
        pf_override_value: 10
      }, baseAttendance);
      expect(cappedRes.deductions.find(d => d.name === 'Provident Fund (PF)')?.amount).toBe(1500);

      const uncappedRes = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 50000,
        pf_cap_enabled: false,
        pf_override_type: 'percent',
        pf_override_value: 10
      }, baseAttendance);
      expect(uncappedRes.deductions.find(d => d.name === 'Provident Fund (PF)')?.amount).toBe(5000);
    });
  });

  describe('ESI Statutory Thresholds (₹21,000) & Overrides', () => {
    test('deducts ESI 0.75% (₹158) when Gross is exactly ₹21,000', () => {
      const res = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 15000,
        hra: 6000,
        esi_enabled: true
      }, baseAttendance);
      const esi = res.deductions.find(d => d.name.includes('ESI'));
      expect(esi?.amount).toBe(158);
    });

    test('does not deduct ESI (₹0) when Gross is ₹21,001 (above threshold)', () => {
      const res = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 15000,
        hra: 6001,
        esi_enabled: true
      }, baseAttendance);
      const esi = res.deductions.find(d => d.name.includes('ESI'));
      expect(esi).toBeUndefined();
    });

    test('deducts ESI 0.75% (₹157) when Gross is ₹20,999 (boundary -1)', () => {
      const res = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 15000,
        hra: 5999,
        esi_enabled: true
      }, baseAttendance);
      const esi = res.deductions.find(d => d.name.includes('ESI'));
      expect(esi?.amount).toBe(157);
    });

    test('respects ESI fixed override ₹200 even when Gross > ₹21,000', () => {
      const res = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 30000,
        hra: 20000,
        esi_override_type: 'fixed',
        esi_override_value: 200
      }, baseAttendance);
      const esi = res.deductions.find(d => d.name.includes('ESI'));
      expect(esi?.amount).toBe(200);
    });

    test('respects ESI exempt override when Gross <= ₹21,000', () => {
      const res = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 10000,
        hra: 5000,
        esi_enabled: true,
        esi_override_type: 'exempt'
      }, baseAttendance);
      const esi = res.deductions.find(d => d.name.includes('ESI'));
      expect(esi).toBeUndefined();
    });
  });

  describe('Professional Tax Kerala Slabs & Overrides', () => {
    test('Kerala PT: Gross > 20,000 -> ₹200', () => {
      const res = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 15000,
        hra: 5001,
        pt_enabled: true
      }, baseAttendance);
      expect(res.deductions.find(d => d.name.includes('PT'))?.amount).toBe(200);
    });

    test('Kerala PT: Gross = 20,000 exactly -> ₹150', () => {
      const res = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 15000,
        hra: 5000,
        pt_enabled: true
      }, baseAttendance);
      expect(res.deductions.find(d => d.name.includes('PT'))?.amount).toBe(150);
    });

    test('Kerala PT: Gross = 15,000 exactly -> ₹100', () => {
      const res = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 10000,
        hra: 5000,
        pt_enabled: true
      }, baseAttendance);
      expect(res.deductions.find(d => d.name.includes('PT'))?.amount).toBe(100);
    });

    test('Kerala PT: Gross = 10,000 exactly -> ₹0', () => {
      const res = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 8000,
        hra: 2000,
        pt_enabled: true
      }, baseAttendance);
      expect(res.deductions.find(d => d.name.includes('PT'))).toBeUndefined();
    });

    test('PT Override: fixed ₹350 and exempt', () => {
      const fixedRes = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 20000,
        hra: 10000,
        pt_override_type: 'fixed',
        pt_override_value: 350
      }, baseAttendance);
      expect(fixedRes.deductions.find(d => d.name.includes('PT'))?.amount).toBe(350);

      const exemptRes = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 20000,
        hra: 10000,
        pt_override_type: 'exempt'
      }, baseAttendance);
      expect(exemptRes.deductions.find(d => d.name.includes('PT'))).toBeUndefined();
    });
  });

  describe('Negative Net Pay Guard & Indian Currency Words', () => {
    test('clamps Net Pay to 0 when deductions exceed earnings', () => {
      const res = calculateEmployeePayroll('2026-03', {
        ...baseStructure,
        basic: 10000,
        hra: 2000,
        deductions_json: JSON.stringify({ 'Voluntary Contribution': 30000 })
      }, baseAttendance);

      expect(res.netPay).toBe(0);
      expect(res.netInWords).toBe('Rupees Zero Only');
    });

    test('correctly converts Indian currency words across all magnitude ranges', () => {
      expect(numberToIndianWords(0)).toBe('Rupees Zero Only');
      expect(numberToIndianWords(NaN)).toBe('Rupees Zero Only');
      expect(numberToIndianWords(1)).toBe('Rupees One Only');
      expect(numberToIndianWords(100)).toBe('Rupees One Hundred Only');
      expect(numberToIndianWords(105)).toBe('Rupees One Hundred and Five Only');
      expect(numberToIndianWords(1000)).toBe('Rupees One Thousand Only');
      expect(numberToIndianWords(100000)).toBe('Rupees One Lakh Only');
      expect(numberToIndianWords(9999999)).toBe('Rupees Ninety Nine Lakh Ninety Nine Thousand Nine Hundred and Ninety Nine Only');
      expect(numberToIndianWords(10000000)).toBe('Rupees One Crore Only');
    });
  });
});
