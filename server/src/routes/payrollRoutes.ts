import { Router, Request, Response } from 'express';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import { SheetsRepo } from '../services/sheetsRepo';
import { DriveStorage } from '../services/driveStorage';
import { PdfService } from '../services/pdfService';
import { AuditService } from '../services/auditService';
import { calculateEmployeePayroll, AttendanceSummary } from '../utils/payrollCalculator';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import {
  SalaryStructure,
  Transaction,
  PayrollRun,
  Payslip,
  Employee,
  Attendance,
  LeaveRequest,
  Holiday,
  Setting
} from '../types';

const router = Router();
router.use(authenticate);

// -------------------------------------------------------------
// SALARY STRUCTURE & TRANSACTIONS (HR Manager only)
// -------------------------------------------------------------

/**
 * Get salary structure for employee
 */
router.get('/structures/:employeeId', requireRole('HR Manager'), async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const structures = await SheetsRepo.find<SalaryStructure>('SalaryStructures', s => s.employee_id === employeeId);
    return res.json({ success: true, structure: structures.length > 0 ? structures[0] : null });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch salary structure' });
  }
});

/**
 * Create or update salary structure
 */
router.post('/structures/:employeeId', requireRole('HR Manager'), async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { basic, hra, allowances, deductions, pf_enabled, esi_enabled, pt_enabled, overtime_rate, effective_from } = req.body;

    const existing = await SheetsRepo.find<SalaryStructure>('SalaryStructures', s => s.employee_id === employeeId);

    const payload: Partial<SalaryStructure> = {
      employee_id: employeeId,
      effective_from: effective_from || new Date().toISOString().split('T')[0],
      basic: Number(basic) || 0,
      hra: Number(hra) || 0,
      allowances_json: JSON.stringify(allowances || {}),
      deductions_json: JSON.stringify(deductions || {}),
      pf_enabled: pf_enabled === true || pf_enabled === 'true',
      esi_enabled: esi_enabled === true || esi_enabled === 'true',
      pt_enabled: pt_enabled === true || pt_enabled === 'true',
      overtime_rate: Number(overtime_rate) || 0
    };

    let result;
    if (existing.length > 0) {
      result = await SheetsRepo.update<SalaryStructure>('SalaryStructures', existing[0].id, payload, req.user!.employeeId);
    } else {
      result = await SheetsRepo.create<SalaryStructure>('SalaryStructures', payload, req.user!.employeeId);
    }

    await AuditService.log(req.user!.employeeId, 'SET_SALARY_STRUCTURE', 'SalaryStructures', result?.id || employeeId, undefined, payload, req.ip);

    return res.json({ success: true, message: 'Salary structure updated successfully', structure: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to save salary structure' });
  }
});

/**
 * Get advances / loans / bonuses ledger
 */
router.get('/transactions/:employeeId', requireRole('HR Manager'), async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const txs = await SheetsRepo.find<Transaction>('Transactions', t => t.employee_id === employeeId);
    return res.json({ success: true, transactions: txs.sort((a, b) => b.date.localeCompare(a.date)) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
});

/**
 * Add an advance / loan / bonus / fine entry
 */
router.post('/transactions/:employeeId', requireRole('HR Manager'), async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { type, amount, emi_amount, remark, date } = req.body;

    if (!type || !amount) {
      return res.status(400).json({ success: false, message: 'Type and amount are required' });
    }

    const numAmt = Number(amount);
    const created = await SheetsRepo.create<Transaction>('Transactions', {
      employee_id: employeeId,
      type,
      amount: numAmt,
      emi_amount: emi_amount ? Number(emi_amount) : numAmt,
      balance: ['advance', 'loan', 'fine'].includes(type) ? numAmt : 0,
      date: date || new Date().toISOString().split('T')[0],
      remark: remark || '',
      status: 'Active'
    }, req.user!.employeeId);

    await AuditService.log(req.user!.employeeId, 'CREATE_TRANSACTION', 'Transactions', created.id, undefined, created, req.ip);

    return res.status(201).json({ success: true, message: 'Transaction recorded successfully', transaction: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create transaction' });
  }
});

// -------------------------------------------------------------
// PAYROLL RUNS & CALCULATION (HR Manager only)
// -------------------------------------------------------------

/**
 * Calculate payroll preview for a given month
 */
router.post('/calculate-preview', requireRole('HR Manager'), async (req: Request, res: Response) => {
  try {
    const { month } = req.body; // "YYYY-MM"
    if (!month) {
      return res.status(400).json({ success: false, message: 'Month (YYYY-MM) is required' });
    }

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1; // 0-based
    const totalDaysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // Fetch batch tabs
    const [employees, structures, allAttendance, leaveRequests, holidays, transactions, settings] = await Promise.all([
      SheetsRepo.list<Employee>('Employees'),
      SheetsRepo.list<SalaryStructure>('SalaryStructures'),
      SheetsRepo.find<Attendance>('Attendance', a => a.date.startsWith(month)),
      SheetsRepo.find<LeaveRequest>('LeaveRequests', l => l.status === 'Approved' && (l.from_date.startsWith(month) || l.to_date.startsWith(month))),
      SheetsRepo.find<Holiday>('Holidays', h => h.date.startsWith(month)),
      SheetsRepo.find<Transaction>('Transactions', t => t.status === 'Active'),
      SheetsRepo.list<Setting>('Settings')
    ]);

    const activeEmployees = employees.filter(e => e.status === 'Active' || e.status === 'Probation');

    // Count weekly offs (e.g. Sundays in the month)
    let sundaysCount = 0;
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dayOfWeek = new Date(year, monthIndex, d).getDay();
      if (dayOfWeek === 0) sundaysCount++; // Sunday
    }

    const holidayCount = holidays.length;

    const previewList = activeEmployees.map(emp => {
      const struct = structures.find(s => s.employee_id === emp.employee_id) || {
        id: '',
        employee_id: emp.employee_id,
        effective_from: '',
        basic: 15000,
        hra: 5000,
        allowances_json: '{}',
        deductions_json: '{}',
        pf_enabled: true,
        esi_enabled: false,
        pt_enabled: true,
        overtime_rate: 0,
        created_at: '',
        updated_at: '',
        created_by: '',
        is_deleted: false
      };

      const empAtt = allAttendance.filter(a => a.employee_id === emp.employee_id);
      const presentDays = empAtt.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const halfDays = empAtt.filter(a => a.status === 'Half Day').length;

      const empLeaves = leaveRequests.filter(l => l.employee_id === emp.employee_id);
      const paidLeaveDays = empLeaves.reduce((sum, l) => sum + (Number(l.days) || 0), 0);

      const paidDays = Math.min(
        totalDaysInMonth,
        presentDays + (halfDays * 0.5) + paidLeaveDays + holidayCount + sundaysCount
      );

      const lopDays = Math.max(0, totalDaysInMonth - paidDays);

      const attSummary: AttendanceSummary = {
        totalCalendarDays: totalDaysInMonth,
        workingDays: totalDaysInMonth - sundaysCount,
        presentDays,
        halfDays,
        paidLeaveDays,
        unpaidLeaveDays: 0,
        holidays: holidayCount,
        weeklyOffs: sundaysCount,
        paidDays,
        lopDays,
        overtimeHours: 0
      };

      const empTransactions = transactions.filter(t => t.employee_id === emp.employee_id);
      const calcResult = calculateEmployeePayroll(month, struct, attSummary, empTransactions);

      return {
        employee_id: emp.employee_id,
        employee_name: emp.full_name,
        department: emp.department,
        designation: emp.designation,
        bank_name: emp.bank_name,
        ifsc: emp.ifsc,
        calcResult
      };
    });

    return res.json({ success: true, month, totalEmployees: previewList.length, payrollPreview: previewList });
  } catch (err: any) {
    console.error('Payroll preview error:', err);
    return res.status(500).json({ success: false, message: 'Failed to calculate payroll preview' });
  }
});

/**
 * Finalize and Lock Monthly Payroll Run
 */
router.post('/finalize', requireRole('HR Manager'), async (req: Request, res: Response) => {
  try {
    const { month, payrollLines } = req.body; // Array of employee lines from review
    if (!month || !payrollLines || !Array.isArray(payrollLines)) {
      return res.status(400).json({ success: false, message: 'Month and finalized payroll lines are required' });
    }

    const existingRuns = await SheetsRepo.find<PayrollRun>('PayrollRuns', r => r.month === month && r.status === 'finalized');
    if (existingRuns.length > 0) {
      return res.status(400).json({ success: false, message: `Payroll for month ${month} is already finalized and locked.` });
    }

    // Create PayrollRun
    const payrollRun = await SheetsRepo.create<PayrollRun>('PayrollRuns', {
      month,
      status: 'finalized',
      finalized_by: req.user!.employeeId,
      finalized_at: new Date().toISOString()
    }, req.user!.employeeId);

    const employees = await SheetsRepo.list<Employee>('Employees');
    const settings = await SheetsRepo.list<Setting>('Settings');
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

    const createdPayslips: Payslip[] = [];

    for (const line of payrollLines) {
      const calc = line.calcResult;
      const emp = employees.find(e => e.employee_id === line.employee_id);
      if (!emp) continue;

      const payslipRecord: Partial<Payslip> = {
        payroll_run_id: payrollRun.id,
        employee_id: line.employee_id,
        month,
        attendance_json: JSON.stringify(calc.attendance),
        earnings_json: JSON.stringify(calc.earnings),
        deductions_json: JSON.stringify(calc.deductions),
        gross: calc.totalEarnings || calc.grossBase,
        total_deductions: calc.totalDeductions,
        net_pay: calc.netPay,
        net_in_words: calc.netInWords,
        paid_status: 'Unpaid'
      };

      // Generate Payslip PDF and upload to Drive: Mastered Skill Academy HR / Employees / <ID - Name> / Payslips / <YYYY> /
      try {
        const pdfBuffer = await PdfService.generatePayslipPdf(payslipRecord as Payslip, emp, settingsMap);
        const folderId = await DriveStorage.resolveFolderPath([
          'Mastered Skill Academy HR',
          'Employees',
          `${emp.employee_id} - ${emp.full_name}`,
          'Payslips',
          month.substring(0, 4)
        ]);

        const uploadRes = await DriveStorage.uploadFile(
          `Payslip_${month}_${emp.employee_id}.pdf`,
          'application/pdf',
          pdfBuffer,
          folderId
        );
        payslipRecord.pdf_drive_id = uploadRes.fileId;
      } catch (e) {
        payslipRecord.pdf_drive_id = `pdf_mock_${uuidv4().slice(0, 8)}`;
      }

      const created = await SheetsRepo.create<Payslip>('Payslips', payslipRecord, req.user!.employeeId);
      createdPayslips.push(created);

      // Update balances for processed advances/loans
      if (calc.activeTransactionsProcessed && Array.isArray(calc.activeTransactionsProcessed)) {
        for (const txProc of calc.activeTransactionsProcessed) {
          if (txProc.transactionId) {
            await SheetsRepo.update<Transaction>('Transactions', txProc.transactionId, {
              balance: txProc.newBalance,
              status: txProc.newBalance <= 0 ? 'Closed' : 'Active'
            }, req.user!.employeeId);
          }
        }
      }
    }

    await AuditService.log(req.user!.employeeId, 'FINALIZE_PAYROLL', 'PayrollRuns', payrollRun.id, undefined, { month, count: createdPayslips.length }, req.ip);

    return res.json({
      success: true,
      message: `Payroll for ${month} finalized and locked successfully with ${createdPayslips.length} payslips generated.`,
      payrollRun,
      payslipsCount: createdPayslips.length
    });
  } catch (err: any) {
    console.error('Finalize payroll error:', err);
    return res.status(500).json({ success: false, message: 'Failed to finalize payroll' });
  }
});

/**
 * Mark Payroll / Payslips as Paid
 */
router.post('/mark-paid', requireRole('HR Manager'), async (req: Request, res: Response) => {
  try {
    const { month, paid_on, mode, reference } = req.body;
    if (!month) {
      return res.status(400).json({ success: false, message: 'Month is required' });
    }

    const payslips = await SheetsRepo.find<Payslip>('Payslips', p => p.month === month);
    const paidDate = paid_on || new Date().toISOString().split('T')[0];

    for (const p of payslips) {
      await SheetsRepo.update<Payslip>('Payslips', p.id, {
        paid_status: 'Paid',
        paid_on: paidDate,
        mode: mode || 'Bank Transfer (NEFT/IMPS)',
        reference: reference || 'SALARY-BATCH'
      }, req.user!.employeeId);
    }

    const runs = await SheetsRepo.find<PayrollRun>('PayrollRuns', r => r.month === month);
    if (runs.length > 0) {
      await SheetsRepo.update<PayrollRun>('PayrollRuns', runs[0].id, {
        status: 'paid',
        paid_on: paidDate
      }, req.user!.employeeId);
    }

    await AuditService.log(req.user!.employeeId, 'MARK_PAYROLL_PAID', 'PayrollRuns', month, undefined, { mode, reference, paidDate }, req.ip);

    return res.json({ success: true, message: `All payslips for ${month} marked as Paid.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to mark payroll paid' });
  }
});

// -------------------------------------------------------------
// PAYSLIP VIEWS & DOWNLOADS
// -------------------------------------------------------------

/**
 * Get logged in employee's payslips
 */
router.get('/payslips/my', async (req: Request, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    const payslips = await SheetsRepo.find<Payslip>('Payslips', p => p.employee_id === employeeId);
    return res.json({ success: true, payslips: payslips.sort((a, b) => b.month.localeCompare(a.month)) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch payslips' });
  }
});

/**
 * Get single payslip by ID
 */
router.get('/payslips/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payslip = await SheetsRepo.getById<Payslip>('Payslips', id);
    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    const isSelf = payslip.employee_id === req.user!.employeeId;
    const isManager = req.user!.role === 'HR Manager';

    if (!isSelf && !isManager) {
      return res.status(403).json({ success: false, message: 'Access denied to this payslip' });
    }

    const employees = await SheetsRepo.list<Employee>('Employees');
    const employee = employees.find(e => e.employee_id === payslip.employee_id);

    return res.json({ success: true, payslip, employee });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch payslip' });
  }
});

/**
 * Generate/Stream Payslip PDF on the fly or from Drive
 */
router.get('/payslips/:id/pdf', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payslip = await SheetsRepo.getById<Payslip>('Payslips', id);
    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    const isSelf = payslip.employee_id === req.user!.employeeId;
    const isManager = req.user!.role === 'HR Manager';
    if (!isSelf && !isManager) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const employees = await SheetsRepo.list<Employee>('Employees');
    const employee = employees.find(e => e.employee_id === payslip.employee_id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee record not found' });
    }

    const settings = await SheetsRepo.list<Setting>('Settings');
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

    const pdfBuffer = await PdfService.generatePayslipPdf(payslip, employee, settingsMap);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Payslip_${payslip.month}_${employee.employee_id}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Payslip PDF download error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
});

/**
 * Bulk download all payslips for a month as a ZIP archive (HR Manager only)
 */
router.get('/bulk-download/:month', requireRole('HR Manager'), async (req: Request, res: Response) => {
  try {
    const { month } = req.params;
    const [payslips, employees, settings] = await Promise.all([
      SheetsRepo.find<Payslip>('Payslips', p => p.month === month),
      SheetsRepo.list<Employee>('Employees'),
      SheetsRepo.list<Setting>('Settings')
    ]);

    if (payslips.length === 0) {
      return res.status(404).json({ success: false, message: `No payslips found for month ${month}` });
    }

    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="MSA_Payslips_${month}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (const payslip of payslips) {
      const emp = employees.find(e => e.employee_id === payslip.employee_id);
      if (!emp) continue;

      const pdfBuffer = await PdfService.generatePayslipPdf(payslip, emp, settingsMap);
      archive.append(pdfBuffer, { name: `Payslip_${month}_${emp.employee_id}_${emp.full_name.replace(/\s+/g, '_')}.pdf` });
    }

    await archive.finalize();
  } catch (err: any) {
    console.error('Bulk ZIP download error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate ZIP archive' });
  }
});

export default router;
