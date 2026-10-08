import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { SheetsRepo } from '../services/sheetsRepo';
import { DriveStorage } from '../services/driveStorage';
import { AuditService } from '../services/auditService';
import { authenticate } from '../middleware/auth';
import { Task, TaskUpdate, TaskEvidence, Employee } from '../types';

const router = Router();
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.use(authenticate);

/**
 * Get My Tasks (for logged in employee)
 */
router.get('/my-tasks', async (req: Request, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    const { status, date } = req.query;

    let tasks = await SheetsRepo.find<Task>('Tasks', t => t.assigned_to === employeeId);

    if (status) {
      tasks = tasks.filter(t => t.status === status);
    }
    if (date) {
      tasks = tasks.filter(t => t.task_date === date || t.due_date === date);
    }

    return res.json({ success: true, tasks });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
});

/**
 * Get Team Tasks (HR Manager / HR Executive)
 */
router.get('/team-tasks', async (req: Request, res: Response) => {
  try {
    const userRole = req.user!.role;
    if (userRole === 'Employee') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { employeeId, status, priority, date } = req.query;
    let tasks = await SheetsRepo.list<Task>('Tasks');
    const employees = await SheetsRepo.list<Employee>('Employees');

    if (employeeId) {
      tasks = tasks.filter(t => t.assigned_to === employeeId);
    }
    if (status) {
      tasks = tasks.filter(t => t.status === status);
    }
    if (priority) {
      tasks = tasks.filter(t => t.priority === priority);
    }
    if (date) {
      tasks = tasks.filter(t => t.task_date === date || t.due_date === date);
    }

    const enriched = tasks.map(t => {
      const emp = employees.find(e => e.employee_id === t.assigned_to);
      return {
        ...t,
        assignee_name: emp?.full_name || t.assigned_to,
        department: emp?.department
      };
    });

    return res.json({ success: true, tasks: enriched });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch team tasks' });
  }
});

/**
 * Create a new task
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const currentEmpId = req.user!.employeeId;
    const userRole = req.user!.role;

    if (!body.title) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    // Employees can only assign to themselves; HR can assign to anyone
    let assignedTo = currentEmpId;
    if (userRole !== 'Employee' && body.assigned_to) {
      assignedTo = body.assigned_to;
    }

    const todayDate = new Date().toISOString().split('T')[0];

    const newTask: Partial<Task> = {
      title: body.title,
      description: body.description || '',
      task_date: body.task_date || todayDate,
      due_date: body.due_date || body.task_date || todayDate,
      priority: body.priority || 'Medium',
      category: body.category || 'General',
      assigned_to: assignedTo,
      assigned_by: currentEmpId,
      status: 'Pending',
      review_status: 'Pending Review'
    };

    const created = await SheetsRepo.create<Task>('Tasks', newTask, currentEmpId);

    await SheetsRepo.create<TaskUpdate>('TaskUpdates', {
      task_id: created.id,
      employee_id: currentEmpId,
      update_type: 'progress',
      status_from: 'None',
      status_to: 'Pending',
      remark: 'Task created',
      evidence_json: '[]'
    }, currentEmpId);

    return res.status(201).json({ success: true, message: 'Task created successfully', task: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create task' });
  }
});

/**
 * Update task status (Pending -> In Progress -> Done / Blocked)
 * Marking 'Done' requires evidence and remark!
 */
router.put('/:id/status', upload.array('evidence_files', 5), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, remark, evidence_links } = req.body;
    const currentEmpId = req.user!.employeeId;

    const task = await SheetsRepo.getById<Task>('Tasks', id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Permission: assignee or HR can update
    const isAssignee = task.assigned_to === currentEmpId;
    const isHR = req.user!.role !== 'Employee';
    if (!isAssignee && !isHR) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this task' });
    }

    // Strict validation for 'Done' status
    if (status === 'Done') {
      if (!remark || remark.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'A completion remark is mandatory when marking a task as Done.'
        });
      }

      const files = (req.files as Express.Multer.File[]) || [];
      const links = typeof evidence_links === 'string' ? [evidence_links] : (evidence_links || []);

      if (files.length === 0 && links.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Evidence is required to mark a task as Done. Please upload a photo/document or provide an evidence link.'
        });
      }
    }

    // Process & Upload Evidence to Drive
    const evidenceList: TaskEvidence[] = [];
    const files = (req.files as Express.Multer.File[]) || [];

    if (files.length > 0) {
      const currentMonth = new Date().toISOString().substring(0, 7);
      const employees = await SheetsRepo.list<Employee>('Employees');
      const emp = employees.find(e => e.employee_id === task.assigned_to);
      const empName = emp ? emp.full_name : task.assigned_to;

      for (const file of files) {
        try {
          const folderId = await DriveStorage.resolveFolderPath([
            'Mastered Skill Academy HR',
            'Employees',
            `${task.assigned_to} - ${empName}`,
            'Task Evidence',
            currentMonth
          ]);

          const uploadRes = await DriveStorage.uploadFile(
            `Task_${task.id.slice(0, 6)}_${file.originalname}`,
            file.mimetype,
            file.buffer,
            folderId
          );

          evidenceList.push({
            type: file.mimetype.startsWith('image/') ? 'photo' : 'document',
            name: file.originalname,
            drive_id: uploadRes.fileId
          });
        } catch (e) {
          evidenceList.push({
            type: 'document',
            name: file.originalname,
            drive_id: `mock_evidence_${uuidv4().slice(0, 8)}`
          });
        }
      }
    }

    if (evidence_links) {
      const linkArr = Array.isArray(evidence_links) ? evidence_links : [evidence_links];
      linkArr.filter(Boolean).forEach((linkStr: string) => {
        evidenceList.push({
          type: 'link',
          name: 'Evidence Link',
          url: linkStr
        });
      });
    }

    const oldStatus = task.status;
    const updateData: Partial<Task> = {
      status,
      completion_remark: remark || task.completion_remark,
      completed_at: status === 'Done' ? new Date().toISOString() : task.completed_at
    };

    const updatedTask = await SheetsRepo.update<Task>('Tasks', id, updateData, currentEmpId);

    await SheetsRepo.create<TaskUpdate>('TaskUpdates', {
      task_id: id,
      employee_id: currentEmpId,
      update_type: 'status_change',
      status_from: oldStatus,
      status_to: status,
      remark: remark || `Status changed to ${status}`,
      evidence_json: JSON.stringify(evidenceList)
    }, currentEmpId);

    return res.json({ success: true, message: `Task marked as ${status}`, task: updatedTask, evidence: evidenceList });
  } catch (err: any) {
    console.error('Task status update error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update task status' });
  }
});

/**
 * HR Review Task (Approved / Needs Rework)
 */
router.post('/:id/review', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { review_status, review_remark } = req.body;
    const currentEmpId = req.user!.employeeId;

    if (!['Approved', 'Needs Rework'].includes(review_status)) {
      return res.status(400).json({ success: false, message: 'Review status must be Approved or Needs Rework' });
    }

    const task = await SheetsRepo.getById<Task>('Tasks', id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const updatedTask = await SheetsRepo.update<Task>('Tasks', id, {
      review_status,
      review_remark: review_remark || '',
      status: review_status === 'Needs Rework' ? 'In Progress' : task.status
    }, currentEmpId);

    await SheetsRepo.create<TaskUpdate>('TaskUpdates', {
      task_id: id,
      employee_id: currentEmpId,
      update_type: 'review',
      status_from: task.status,
      status_to: review_status === 'Needs Rework' ? 'In Progress' : task.status,
      remark: `Review: ${review_status}. Remarks: ${review_remark || 'None'}`
    }, currentEmpId);

    return res.json({ success: true, message: `Task review recorded as ${review_status}`, task: updatedTask });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to review task' });
  }
});

/**
 * Get Task Details with Updates and Evidence Timeline
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const task = await SheetsRepo.getById<Task>('Tasks', id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const updates = await SheetsRepo.find<TaskUpdate>('TaskUpdates', u => u.task_id === id);

    return res.json({
      success: true,
      task,
      updates: updates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch task details' });
  }
});

/**
 * Daily Task Summary counts
 */
router.get('/summary/daily', async (req: Request, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    const isHR = req.user!.role !== 'Employee';
    const todayStr = new Date().toISOString().split('T')[0];

    const allTasks = await SheetsRepo.list<Task>('Tasks');
    const relevantTasks = isHR ? allTasks : allTasks.filter(t => t.assigned_to === employeeId);

    const summary = {
      total: relevantTasks.length,
      today: relevantTasks.filter(t => t.task_date === todayStr || t.due_date === todayStr).length,
      done: relevantTasks.filter(t => t.status === 'Done').length,
      pending: relevantTasks.filter(t => t.status === 'Pending').length,
      in_progress: relevantTasks.filter(t => t.status === 'In Progress').length,
      overdue: relevantTasks.filter(t => t.status !== 'Done' && t.due_date < todayStr).length
    };

    return res.json({ success: true, summary });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
});

export default router;
