import { Router, Request, Response } from 'express';
import { SheetsRepo } from '../services/sheetsRepo';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { Job, Application, Employee, Attendance, LeaveRequest, Task, Payslip } from '../types';

const router = Router();
router.use(authenticate);
router.use(requireRole('HR Manager', 'HR Executive'));

/**
 * Recruitment Funnel Report
 */
router.get('/recruitment-funnel', async (req: Request, res: Response) => {
  try {
    const [jobs, applications] = await Promise.all([
      SheetsRepo.list<Job>('Jobs'),
      SheetsRepo.list<Application>('Applications')
    ]);

    const statusCounts: Record<string, number> = {
      Applied: 0,
      Screened: 0,
      Shortlisted: 0,
      'Interview Scheduled': 0,
      Interviewed: 0,
      Selected: 0,
      'Offer Sent': 0,
      'Offer Accepted': 0,
      'Documents Collected': 0,
      Joined: 0,
      Rejected: 0,
      'On Hold': 0
    };

    applications.forEach(a => {
      if (statusCounts[a.status] !== undefined) {
        statusCounts[a.status]++;
      } else {
        statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
      }
    });

    const jobWise = jobs.map(j => {
      const jobApps = applications.filter(a => a.job_id === j.id);
      return {
        job_id: j.id,
        title: j.title,
        department: j.department,
        total_applications: jobApps.length,
        shortlisted: jobApps.filter(a => a.status === 'Shortlisted').length,
        interviewed: jobApps.filter(a => ['Interviewed', 'Selected', 'Offer Sent', 'Offer Accepted', 'Joined'].includes(a.status)).length,
        joined: jobApps.filter(a => a.status === 'Joined').length
      };
    });

    return res.json({ success: true, totalApplications: applications.length, funnel: statusCounts, jobWise });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to generate funnel report' });
  }
});

/**
 * Attendance Monthly Matrix Report
 */
router.get('/attendance-monthly', async (req: Request, res: Response) => {
  try {
    const { month } = req.query; // "YYYY-MM"
    const targetMonth = (month as string) || new Date().toISOString().substring(0, 7);

    const [employees, attendanceList] = await Promise.all([
      SheetsRepo.list<Employee>('Employees'),
      SheetsRepo.find<Attendance>('Attendance', a => a.date.startsWith(targetMonth))
    ]);

    const activeEmployees = employees.filter(e => e.status === 'Active' || e.status === 'Probation');

    const matrix = activeEmployees.map(emp => {
      const empAtt = attendanceList.filter(a => a.employee_id === emp.employee_id);
      return {
        employee_id: emp.employee_id,
        full_name: emp.full_name,
        department: emp.department,
        present_count: empAtt.filter(a => a.status === 'Present').length,
        late_count: empAtt.filter(a => a.status === 'Late').length,
        half_day_count: empAtt.filter(a => a.status === 'Half Day').length,
        punches: empAtt
      };
    });

    return res.json({ success: true, month: targetMonth, matrix });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to generate attendance report' });
  }
});

/**
 * Task Completion Report
 */
router.get('/task-completion', async (req: Request, res: Response) => {
  try {
    const [tasks, employees] = await Promise.all([
      SheetsRepo.list<Task>('Tasks'),
      SheetsRepo.list<Employee>('Employees')
    ]);

    const activeEmployees = employees.filter(e => e.status === 'Active' || e.status === 'Probation');

    const employeeTaskStats = activeEmployees.map(emp => {
      const empTasks = tasks.filter(t => t.assigned_to === emp.employee_id);
      const done = empTasks.filter(t => t.status === 'Done').length;
      const total = empTasks.length;

      return {
        employee_id: emp.employee_id,
        full_name: emp.full_name,
        department: emp.department,
        total_tasks: total,
        done_tasks: done,
        pending_tasks: empTasks.filter(t => t.status === 'Pending').length,
        completion_rate: total > 0 ? Math.round((done / total) * 100) : 0
      };
    });

    return res.json({ success: true, stats: employeeTaskStats });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to generate task completion report' });
  }
});

/**
 * Payroll Summary Report (HR Manager only)
 */
router.get('/payroll-summary', requireRole('HR Manager'), async (req: Request, res: Response) => {
  try {
    const { month } = req.query;
    let payslips = await SheetsRepo.list<Payslip>('Payslips');
    if (month) {
      payslips = payslips.filter(p => p.month === month);
    }

    const employees = await SheetsRepo.list<Employee>('Employees');

    const totalGross = payslips.reduce((sum, p) => sum + (Number(p.gross) || 0), 0);
    const totalDeductions = payslips.reduce((sum, p) => sum + (Number(p.total_deductions) || 0), 0);
    const totalNet = payslips.reduce((sum, p) => sum + (Number(p.net_pay) || 0), 0);

    return res.json({
      success: true,
      summary: {
        totalPayslips: payslips.length,
        totalGross,
        totalDeductions,
        totalNet
      },
      payslips: payslips.map(p => {
        const emp = employees.find(e => e.employee_id === p.employee_id);
        return {
          ...p,
          employee_name: emp?.full_name || p.employee_id,
          department: emp?.department
        };
      })
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to generate payroll summary report' });
  }
});

export default router;
