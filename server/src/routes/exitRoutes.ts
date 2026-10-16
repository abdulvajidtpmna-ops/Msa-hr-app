import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { SheetsRepo } from '../services/sheetsRepo';
import { AuditService } from '../services/auditService';
import { Employee, User, ExitRequest, ExitRequestStatus } from '../types';

const router = express.Router();
router.use(authenticate);

/**
 * Submit employee resignation (Accessible by any employee)
 */
router.post('/resignation', async (req: Request, res: Response) => {
  try {
    const currentEmpId = req.user!.employeeId;
    const {
      resignation_date,
      notice_period_days,
      proposed_last_working_day,
      reason,
      reason_details
    } = req.body;

    const employees = await SheetsRepo.list<Employee>('Employees');
    const emp = employees.find(e => e.employee_id === currentEmpId);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    // Check for existing active exit requests
    const allExits = await SheetsRepo.list<ExitRequest>('ExitRequests').catch(() => [] as ExitRequest[]);
    const existingActive = allExits.find(
      x => x.employee_id === currentEmpId &&
      !['Completed / Exited', 'Rejected', 'Withdrawn'].includes(String(x.status))
    );

    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: `You already have an active resignation/exit request in status: ${existingActive.status}`,
        existingRequest: existingActive
      });
    }

    const resDate = resignation_date || new Date().toISOString().split('T')[0];
    const noticeDays = Number(notice_period_days) || 30;

    // Calculate default last working day if not provided
    let lwd = proposed_last_working_day;
    if (!lwd) {
      const dt = new Date(resDate);
      dt.setDate(dt.getDate() + noticeDays);
      lwd = dt.toISOString().split('T')[0];
    }

    const newRequest: Partial<ExitRequest> = {
      employee_id: emp.employee_id,
      employee_name: emp.full_name,
      department: emp.department,
      designation: emp.designation,
      request_type: 'Resignation',
      resignation_date: resDate,
      notice_period_days: noticeDays,
      proposed_last_working_day: lwd,
      approved_last_working_day: lwd,
      reason: reason || 'Personal / Career Growth',
      reason_details: reason_details || '',
      status: 'Pending Review',
      reviewer_id: '',
      review_notes: '',
      dept_clearance: false,
      dept_clearance_by: '',
      dept_clearance_notes: '',
      it_clearance: false,
      it_clearance_by: '',
      it_clearance_notes: '',
      finance_clearance: false,
      finance_clearance_by: '',
      finance_clearance_notes: '',
      admin_clearance: false,
      admin_clearance_by: '',
      admin_clearance_notes: '',
      exit_interview_status: 'Pending',
      feedback_rating: '',
      rehire_eligible: true,
      interview_notes: '',
      fnf_status: 'Pending',
      fnf_amount: 0,
      fnf_settlement_date: '',
      fnf_remarks: '',
      relieving_letter_issued: false
    };

    const created = await SheetsRepo.create<ExitRequest>('ExitRequests', newRequest as ExitRequest, currentEmpId);

    // Update employee status to Notice and track exit_reason
    await SheetsRepo.update<Employee>('Employees', emp.id, {
      status: 'Notice',
      exit_reason: reason || 'Resignation Submitted',
      exit_date: lwd
    }, currentEmpId);

    await AuditService.log(currentEmpId, 'SUBMIT_RESIGNATION', 'ExitRequests', created.id, undefined, created, req.ip);

    return res.status(201).json({
      success: true,
      message: 'Resignation submitted successfully and sent to HR for review',
      request: created
    });
  } catch (err: any) {
    console.error('[ExitRoutes] submit resignation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit resignation: ' + (err.message || '') });
  }
});

/**
 * Get current logged-in employee's active or latest exit/resignation request
 */
router.get('/my-resignation', async (req: Request, res: Response) => {
  try {
    const currentEmpId = req.user!.employeeId;
    const allExits = await SheetsRepo.list<ExitRequest>('ExitRequests').catch(() => [] as ExitRequest[]);
    const userExits = allExits.filter(x => x.employee_id === currentEmpId);

    // Return the latest active or most recent one
    if (userExits.length === 0) {
      return res.json({ success: true, request: null });
    }

    const active = userExits.find(x => !['Completed / Exited', 'Rejected', 'Withdrawn'].includes(String(x.status)));
    const latest = active || userExits[userExits.length - 1];

    return res.json({ success: true, request: latest });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch resignation details' });
  }
});

/**
 * Withdraw resignation (if still in Pending Review)
 */
router.post('/withdraw', async (req: Request, res: Response) => {
  try {
    const currentEmpId = req.user!.employeeId;
    const allExits = await SheetsRepo.list<ExitRequest>('ExitRequests').catch(() => [] as ExitRequest[]);
    const pendingExit = allExits.find(
      x => x.employee_id === currentEmpId && String(x.status) === 'Pending Review'
    );

    if (!pendingExit) {
      return res.status(400).json({ success: false, message: 'No pending resignation found to withdraw' });
    }

    await SheetsRepo.update<ExitRequest>('ExitRequests', pendingExit.id, {
      status: 'Withdrawn',
      review_notes: 'Withdrawn by employee'
    }, currentEmpId);

    // Restore employee status to Active
    const employees = await SheetsRepo.list<Employee>('Employees');
    const emp = employees.find(e => e.employee_id === currentEmpId);
    if (emp) {
      await SheetsRepo.update<Employee>('Employees', emp.id, {
        status: 'Active',
        exit_date: '',
        exit_reason: ''
      }, currentEmpId);
    }

    await AuditService.log(currentEmpId, 'WITHDRAW_RESIGNATION', 'ExitRequests', pendingExit.id, pendingExit, { status: 'Withdrawn' }, req.ip);

    return res.json({ success: true, message: 'Resignation withdrawn successfully' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to withdraw resignation' });
  }
});

/**
 * Get all exit requests (HR Manager & HR Executive)
 */
router.get('/all', requireRole('HR Manager', 'HR Executive'), async (req: Request, res: Response) => {
  try {
    const allExits = await SheetsRepo.list<ExitRequest>('ExitRequests').catch(() => [] as ExitRequest[]);
    const employees = await SheetsRepo.list<Employee>('Employees');
    const empMap = new Map(employees.map(e => [e.employee_id, e]));

    const enriched = allExits.map(ex => {
      const emp = empMap.get(ex.employee_id);
      return {
        ...ex,
        photo_url: emp?.photo_url,
        joining_date: emp?.joining_date,
        employment_type: emp?.employment_type,
        current_status: emp?.status
      };
    }).sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());

    return res.json({ success: true, requests: enriched });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch exit requests' });
  }
});

/**
 * Initiate Exit by HR for an employee (Termination, Mutual Separation, Contract Expiry, etc.)
 */
router.post('/initiate', requireRole('HR Manager', 'HR Executive'), async (req: Request, res: Response) => {
  try {
    const {
      employee_id,
      request_type,
      resignation_date,
      notice_period_days,
      proposed_last_working_day,
      reason,
      reason_details
    } = req.body;

    if (!employee_id) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }

    const employees = await SheetsRepo.list<Employee>('Employees');
    const emp = employees.find(e => e.employee_id === employee_id || e.id === employee_id);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const resDate = resignation_date || new Date().toISOString().split('T')[0];
    const noticeDays = Number(notice_period_days) || 0;
    const lwd = proposed_last_working_day || resDate;

    const newRequest: Partial<ExitRequest> = {
      employee_id: emp.employee_id,
      employee_name: emp.full_name,
      department: emp.department,
      designation: emp.designation,
      request_type: request_type || 'Mutual Separation',
      resignation_date: resDate,
      notice_period_days: noticeDays,
      proposed_last_working_day: lwd,
      approved_last_working_day: lwd,
      reason: reason || 'HR Initiated Separation',
      reason_details: reason_details || '',
      status: 'Notice Period Active',
      reviewer_id: req.user!.employeeId,
      review_notes: 'Initiated by HR',
      dept_clearance: false,
      dept_clearance_by: '',
      dept_clearance_notes: '',
      it_clearance: false,
      it_clearance_by: '',
      it_clearance_notes: '',
      finance_clearance: false,
      finance_clearance_by: '',
      finance_clearance_notes: '',
      admin_clearance: false,
      admin_clearance_by: '',
      admin_clearance_notes: '',
      exit_interview_status: 'Pending',
      feedback_rating: '',
      rehire_eligible: true,
      interview_notes: '',
      fnf_status: 'Pending',
      fnf_amount: 0,
      fnf_settlement_date: '',
      fnf_remarks: '',
      relieving_letter_issued: false
    };

    const created = await SheetsRepo.create<ExitRequest>('ExitRequests', newRequest as ExitRequest, req.user!.employeeId);

    // Update Employee record
    await SheetsRepo.update<Employee>('Employees', emp.id, {
      status: 'Notice',
      exit_date: lwd,
      exit_reason: reason || request_type
    }, req.user!.employeeId);

    await AuditService.log(req.user!.employeeId, 'INITIATE_EXIT', 'ExitRequests', created.id, undefined, created, req.ip);

    return res.status(201).json({ success: true, message: 'Exit process initiated successfully', request: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to initiate exit' });
  }
});

/**
 * HR Review & Decision on Resignation (Approve / Reject)
 */
router.put('/:id/review', requireRole('HR Manager', 'HR Executive'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, approved_last_working_day, review_notes } = req.body;

    const request = await SheetsRepo.getById<ExitRequest>('ExitRequests', id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Exit request not found' });
    }

    const updates: Partial<ExitRequest> = {
      status: status || 'Notice Period Active',
      reviewer_id: req.user!.employeeId,
      review_notes: review_notes || request.review_notes
    };

    if (approved_last_working_day) {
      updates.approved_last_working_day = approved_last_working_day;
    }

    const updated = await SheetsRepo.update<ExitRequest>('ExitRequests', id, updates, req.user!.employeeId);

    // If approved into Notice Period Active, sync employee
    const employees = await SheetsRepo.list<Employee>('Employees');
    const emp = employees.find(e => e.employee_id === request.employee_id);
    if (emp) {
      if (status === 'Notice Period Active') {
        await SheetsRepo.update<Employee>('Employees', emp.id, {
          status: 'Notice',
          exit_date: updates.approved_last_working_day || request.proposed_last_working_day
        }, req.user!.employeeId);
      } else if (status === 'Rejected') {
        await SheetsRepo.update<Employee>('Employees', emp.id, {
          status: 'Active',
          exit_date: '',
          exit_reason: ''
        }, req.user!.employeeId);
      }
    }

    await AuditService.log(req.user!.employeeId, 'REVIEW_EXIT_REQUEST', 'ExitRequests', id, request, updated, req.ip);

    return res.json({ success: true, message: `Resignation ${status}`, request: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to review exit request' });
  }
});

/**
 * Update Clearance Checklist (NOC)
 */
router.put('/:id/clearance', requireRole('HR Manager', 'HR Executive'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const request = await SheetsRepo.getById<ExitRequest>('ExitRequests', id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Exit request not found' });
    }

    const updates: Partial<ExitRequest> = {};

    if (body.dept_clearance !== undefined) {
      updates.dept_clearance = body.dept_clearance;
      updates.dept_clearance_by = body.dept_clearance ? req.user!.employeeId : '';
      if (body.dept_clearance_notes !== undefined) updates.dept_clearance_notes = body.dept_clearance_notes;
    }

    if (body.it_clearance !== undefined) {
      updates.it_clearance = body.it_clearance;
      updates.it_clearance_by = body.it_clearance ? req.user!.employeeId : '';
      if (body.it_clearance_notes !== undefined) updates.it_clearance_notes = body.it_clearance_notes;
    }

    if (body.finance_clearance !== undefined) {
      updates.finance_clearance = body.finance_clearance;
      updates.finance_clearance_by = body.finance_clearance ? req.user!.employeeId : '';
      if (body.finance_clearance_notes !== undefined) updates.finance_clearance_notes = body.finance_clearance_notes;
    }

    if (body.admin_clearance !== undefined) {
      updates.admin_clearance = body.admin_clearance;
      updates.admin_clearance_by = body.admin_clearance ? req.user!.employeeId : '';
      if (body.admin_clearance_notes !== undefined) updates.admin_clearance_notes = body.admin_clearance_notes;
    }

    // Automatically transition to 'Clearance In Progress' if currently in Notice
    if (request.status === 'Notice Period Active') {
      updates.status = 'Clearance In Progress';
    }

    const updated = await SheetsRepo.update<ExitRequest>('ExitRequests', id, updates, req.user!.employeeId);
    await AuditService.log(req.user!.employeeId, 'UPDATE_EXIT_CLEARANCE', 'ExitRequests', id, request, updated, req.ip);

    return res.json({ success: true, message: 'Clearances updated successfully', request: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update clearance checklist' });
  }
});

/**
 * Record Exit Interview Feedback
 */
router.put('/:id/interview', requireRole('HR Manager', 'HR Executive'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { exit_interview_status, feedback_rating, rehire_eligible, interview_notes } = req.body;

    const request = await SheetsRepo.getById<ExitRequest>('ExitRequests', id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Exit request not found' });
    }

    const updates: Partial<ExitRequest> = {
      exit_interview_status: exit_interview_status || 'Conducted',
      feedback_rating: feedback_rating !== undefined ? feedback_rating : request.feedback_rating,
      rehire_eligible: rehire_eligible !== undefined ? rehire_eligible : request.rehire_eligible,
      interview_notes: interview_notes !== undefined ? interview_notes : request.interview_notes
    };

    const updated = await SheetsRepo.update<ExitRequest>('ExitRequests', id, updates, req.user!.employeeId);
    await AuditService.log(req.user!.employeeId, 'RECORD_EXIT_INTERVIEW', 'ExitRequests', id, request, updated, req.ip);

    return res.json({ success: true, message: 'Exit interview recorded successfully', request: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to record exit interview' });
  }
});

/**
 * Record Full & Final (FnF) Settlement (HR Manager only)
 */
router.put('/:id/fnf', requireRole('HR Manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fnf_status, fnf_amount, fnf_settlement_date, fnf_remarks } = req.body;

    const request = await SheetsRepo.getById<ExitRequest>('ExitRequests', id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Exit request not found' });
    }

    const updates: Partial<ExitRequest> = {
      fnf_status: fnf_status || 'Settled',
      fnf_amount: fnf_amount !== undefined ? fnf_amount : request.fnf_amount,
      fnf_settlement_date: fnf_settlement_date || new Date().toISOString().split('T')[0],
      fnf_remarks: fnf_remarks !== undefined ? fnf_remarks : request.fnf_remarks
    };

    const updated = await SheetsRepo.update<ExitRequest>('ExitRequests', id, updates, req.user!.employeeId);
    await AuditService.log(req.user!.employeeId, 'UPDATE_FNF_SETTLEMENT', 'ExitRequests', id, request, updated, req.ip);

    return res.json({ success: true, message: 'FnF settlement details updated', request: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update FnF settlement' });
  }
});

/**
 * Complete Exit & Deactivate Employee System Access (HR Manager only)
 */
router.post('/:id/finalize', requireRole('HR Manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { final_exit_date } = req.body;

    const request = await SheetsRepo.getById<ExitRequest>('ExitRequests', id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Exit request not found' });
    }

    const exitDate = final_exit_date || request.approved_last_working_day || request.proposed_last_working_day || new Date().toISOString().split('T')[0];

    // Mark exit request completed
    const updatedRequest = await SheetsRepo.update<ExitRequest>('ExitRequests', id, {
      status: 'Completed / Exited',
      relieving_letter_issued: true
    }, req.user!.employeeId);

    // Update Employee record to Resigned / Inactive
    const employees = await SheetsRepo.list<Employee>('Employees');
    const emp = employees.find(e => e.employee_id === request.employee_id);
    if (emp) {
      await SheetsRepo.update<Employee>('Employees', emp.id, {
        status: 'Resigned',
        exit_date: exitDate,
        exit_reason: request.reason || 'Resignation'
      }, req.user!.employeeId);
    }

    // Deactivate User account
    const users = await SheetsRepo.list<User>('Users');
    const user = users.find(u => u.employee_id === request.employee_id);
    if (user) {
      await SheetsRepo.update<User>('Users', user.id, {
        is_active: false
      }, req.user!.employeeId);
    }

    await AuditService.log(req.user!.employeeId, 'FINALIZE_EMPLOYEE_EXIT', 'ExitRequests', id, request, updatedRequest, req.ip);

    return res.json({
      success: true,
      message: `Employee ${request.employee_id} (${request.employee_name}) exit completed and login deactivated successfully.`,
      request: updatedRequest
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to finalize employee exit: ' + (err.message || '') });
  }
});

export default router;
