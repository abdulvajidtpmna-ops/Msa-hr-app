import { Router, Request, Response } from 'express';
import { SheetsRepo } from '../services/sheetsRepo';
import { AuditService } from '../services/auditService';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { LeaveType, LeaveBalance, LeaveRequest, Holiday, Employee } from '../types';

const router = Router();
router.use(authenticate);

/**
 * List all leave types
 */
router.get('/types', async (req: Request, res: Response) => {
  try {
    const types = await SheetsRepo.list<LeaveType>('LeaveTypes');
    return res.json({ success: true, leaveTypes: types });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch leave types' });
  }
});

/**
 * Get leave balances for logged in user
 */
router.get('/my-balances', async (req: Request, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    const currentYear = new Date().getFullYear();

    const [types, balances] = await Promise.all([
      SheetsRepo.list<LeaveType>('LeaveTypes'),
      SheetsRepo.find<LeaveBalance>('LeaveBalances', b => b.employee_id === employeeId && String(b.year) === String(currentYear))
    ]);

    const result = types.map(t => {
      const bal = balances.find(b => b.leave_type_id === t.id || b.leave_type_id === t.name);
      const yearlyQuota = Number(t.yearly_quota) || 12;
      return {
        leave_type_id: t.id,
        leave_type_name: t.name,
        paid: t.paid === true || t.paid === 'TRUE' || t.paid === 'true',
        yearly_quota: yearlyQuota,
        opening: bal ? Number(bal.opening) : yearlyQuota,
        used: bal ? Number(bal.used) : 0,
        balance: bal ? Number(bal.balance) : yearlyQuota
      };
    });

    return res.json({ success: true, year: currentYear, balances: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch balances' });
  }
});

/**
 * Apply for leave
 */
router.post('/apply', async (req: Request, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    const { leave_type_id, from_date, to_date, half_day, reason } = req.body;

    if (!leave_type_id || !from_date || !to_date || !reason) {
      return res.status(400).json({ success: false, message: 'Please provide leave type, dates, and reason' });
    }

    // Calculate days
    const start = new Date(from_date);
    const end = new Date(to_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    let days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (half_day === true || half_day === 'true') {
      days = 0.5;
    }

    const created = await SheetsRepo.create<LeaveRequest>('LeaveRequests', {
      employee_id: employeeId,
      leave_type_id,
      from_date,
      to_date,
      half_day: half_day === true || half_day === 'true',
      days,
      reason,
      status: 'Pending'
    }, employeeId);

    return res.status(201).json({ success: true, message: 'Leave request submitted successfully', leaveRequest: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to apply for leave' });
  }
});

/**
 * Get my leave requests
 */
router.get('/my-requests', async (req: Request, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    const requests = await SheetsRepo.find<LeaveRequest>('LeaveRequests', r => r.employee_id === employeeId);
    const types = await SheetsRepo.list<LeaveType>('LeaveTypes');

    const result = requests.map(r => {
      const t = types.find(type => type.id === r.leave_type_id || type.name === r.leave_type_id);
      return {
        ...r,
        leave_type_name: t?.name || r.leave_type_id
      };
    });

    return res.json({ success: true, leaveRequests: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch my requests' });
  }
});

/**
 * List all leave requests for HR review
 */
router.get('/requests', requireRole('HR Manager', 'HR Executive'), async (req: Request, res: Response) => {
  try {
    const [requests, employees, types] = await Promise.all([
      SheetsRepo.list<LeaveRequest>('LeaveRequests'),
      SheetsRepo.list<Employee>('Employees'),
      SheetsRepo.list<LeaveType>('LeaveTypes')
    ]);

    const result = requests.map(r => {
      const emp = employees.find(e => e.employee_id === r.employee_id);
      const t = types.find(type => type.id === r.leave_type_id || type.name === r.leave_type_id);
      return {
        ...r,
        employee_name: emp?.full_name || r.employee_id,
        department: emp?.department,
        designation: emp?.designation,
        leave_type_name: t?.name || r.leave_type_id
      };
    });

    return res.json({ success: true, leaveRequests: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch leave requests' });
  }
});

/**
 * Approve or Reject leave request (HR Manager / HR Executive)
 */
router.post('/requests/:id/review', requireRole('HR Manager', 'HR Executive'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, review_remark } = req.body; // 'Approved' | 'Rejected'
    const reviewerId = req.user!.employeeId;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const requestItem = await SheetsRepo.getById<LeaveRequest>('LeaveRequests', id);
    if (!requestItem) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    await SheetsRepo.update<LeaveRequest>('LeaveRequests', id, {
      status,
      reviewed_by: reviewerId,
      review_remark: review_remark || ''
    }, reviewerId);

    // If Approved, update LeaveBalances
    if (status === 'Approved') {
      const currentYear = new Date().getFullYear();
      const balances = await SheetsRepo.find<LeaveBalance>(
        'LeaveBalances',
        b => b.employee_id === requestItem.employee_id &&
             (b.leave_type_id === requestItem.leave_type_id || b.leave_type_id.toLowerCase() === requestItem.leave_type_id.toLowerCase()) &&
             String(b.year) === String(currentYear)
      );

      const daysUsed = Number(requestItem.days) || 1;

      if (balances.length > 0) {
        const bal = balances[0];
        const newUsed = (Number(bal.used) || 0) + daysUsed;
        const newBal = Math.max(0, (Number(bal.opening) || 12) - newUsed);
        await SheetsRepo.update<LeaveBalance>('LeaveBalances', bal.id, {
          used: newUsed,
          balance: newBal
        }, reviewerId);
      } else {
        const types = await SheetsRepo.list<LeaveType>('LeaveTypes');
        const t = types.find(type => type.id === requestItem.leave_type_id || type.name === requestItem.leave_type_id);
        const quota = Number(t?.yearly_quota) || 12;
        await SheetsRepo.create<LeaveBalance>('LeaveBalances', {
          employee_id: requestItem.employee_id,
          leave_type_id: requestItem.leave_type_id,
          year: currentYear,
          opening: quota,
          used: daysUsed,
          balance: Math.max(0, quota - daysUsed)
        }, reviewerId);
      }
    }

    await AuditService.log(reviewerId, `LEAVE_${status.toUpperCase()}`, 'LeaveRequests', id, undefined, { status, review_remark }, req.ip);

    return res.json({ success: true, message: `Leave request has been ${status.toLowerCase()}` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to review leave request' });
  }
});

/**
 * List holidays
 */
router.get('/holidays', async (req: Request, res: Response) => {
  try {
    const holidays = await SheetsRepo.list<Holiday>('Holidays');
    return res.json({ success: true, holidays: holidays.sort((a, b) => a.date.localeCompare(b.date)) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch holidays' });
  }
});

/**
 * Add holiday (HR Manager)
 */
router.post('/holidays', requireRole('HR Manager'), async (req: Request, res: Response) => {
  try {
    const { date, name } = req.body;
    if (!date || !name) {
      return res.status(400).json({ success: false, message: 'Date and name are required' });
    }

    const created = await SheetsRepo.create<Holiday>('Holidays', { date, name }, req.user!.employeeId);
    return res.status(201).json({ success: true, holiday: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to add holiday' });
  }
});

export default router;
