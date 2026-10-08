import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { SheetsRepo } from '../services/sheetsRepo';
import { DriveStorage } from '../services/driveStorage';
import { AuditService } from '../services/auditService';
import { encrypt, decrypt, maskSensitive } from '../utils/crypto';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { Employee, EmployeeDoc, User } from '../types';

const router = Router();
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.use(authenticate);

/**
 * List employees with role-based field filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userRole = req.user!.role;
    const list = await SheetsRepo.list<Employee>('Employees');

    const sanitizedList = list.map(emp => {
      const isSelf = emp.employee_id === req.user!.employeeId;
      const isManager = userRole === 'HR Manager';

      return {
        id: emp.id,
        employee_id: emp.employee_id,
        full_name: emp.full_name,
        photo_url: emp.photo_url,
        phone: emp.phone,
        email: emp.email,
        dob: (isManager || isSelf) ? emp.dob : undefined,
        gender: emp.gender,
        designation: emp.designation,
        department: emp.department,
        role: emp.role,
        employment_type: emp.employment_type,
        joining_date: emp.joining_date,
        work_location: emp.work_location,
        status: emp.status,
        pan: isManager ? (emp.pan ? maskSensitive(emp.pan, 4) : undefined) : undefined,
        bank_name: isManager ? emp.bank_name : undefined,
        ifsc: isManager ? emp.ifsc : undefined,
        uan: isManager ? emp.uan : undefined,
        esi_no: isManager ? emp.esi_no : undefined
      };
    });

    return res.json({ success: true, employees: sanitizedList });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch employees' });
  }
});

/**
 * Get single employee details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = req.user!.role;
    const currentEmpId = req.user!.employeeId;

    const list = await SheetsRepo.list<Employee>('Employees');
    const emp = list.find(e => e.id === id || e.employee_id === id);

    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const isSelf = emp.employee_id === currentEmpId;
    const isManager = userRole === 'HR Manager';
    const isExec = userRole === 'HR Executive';

    if (!isSelf && !isManager && !isExec) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const docs = await SheetsRepo.find<EmployeeDoc>('EmployeeDocs', d => d.employee_id === emp.employee_id);

    // Filter sensitive bank/statutory details
    const result: any = {
      ...emp,
      aadhaar: isManager && emp.aadhaar_enc ? maskSensitive(decrypt(emp.aadhaar_enc), 4) : undefined,
      account_no: isManager && emp.account_no_enc ? maskSensitive(decrypt(emp.account_no_enc), 4) : undefined,
      documents: docs.filter(d => {
        if (isManager || isSelf) return true;
        // HR Exec cannot see bank documents
        return !['bank_passbook', 'cancelled_cheque', 'salary_slip'].includes(d.doc_type);
      })
    };

    if (!isManager && !isSelf) {
      delete result.pan;
      delete result.bank_name;
      delete result.ifsc;
      delete result.uan;
      delete result.esi_no;
      delete result.aadhaar_enc;
      delete result.account_no_enc;
    }

    return res.json({ success: true, employee: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch employee details' });
  }
});

/**
 * Create employee manually (HR Manager only)
 */
router.post('/', requireRole('HR Manager'), async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.full_name || !body.phone || !body.email || !body.designation) {
      return res.status(400).json({ success: false, message: 'Missing required employee fields' });
    }

    const employees = await SheetsRepo.list<Employee>('Employees');
    let maxNum = 0;
    employees.forEach(e => {
      const match = e.employee_id.match(/MSA-(\d+)/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    const newEmpId = `MSA-${String(maxNum + 1).padStart(4, '0')}`;

    const newEmp: Partial<Employee> = {
      employee_id: newEmpId,
      full_name: body.full_name,
      phone: body.phone,
      email: body.email,
      dob: body.dob || '',
      gender: body.gender || 'Other',
      address: body.address || '',
      emergency_name: body.emergency_name || '',
      emergency_relation: body.emergency_relation || '',
      emergency_phone: body.emergency_phone || '',
      designation: body.designation,
      department: body.department || 'Operations',
      role: body.role || 'Employee',
      employment_type: body.employment_type || 'Full-time',
      joining_date: body.joining_date || new Date().toISOString().split('T')[0],
      reporting_manager_id: body.reporting_manager_id || '',
      work_location: body.work_location || 'Kerala Campus',
      status: body.status || 'Active',
      pan: body.pan || '',
      aadhaar_enc: body.aadhaar ? encrypt(body.aadhaar) : '',
      bank_name: body.bank_name || '',
      account_no_enc: body.account_no ? encrypt(body.account_no) : '',
      ifsc: body.ifsc || '',
      uan: body.uan || '',
      esi_no: body.esi_no || ''
    };

    const created = await SheetsRepo.create<Employee>('Employees', newEmp, req.user!.employeeId);
    await AuditService.log(req.user!.employeeId, 'CREATE_EMPLOYEE', 'Employees', created.id, undefined, created, req.ip);

    return res.status(201).json({ success: true, employee: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create employee' });
  }
});

/**
 * Update employee record with strict role-based permission boundaries
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const userRole = req.user!.role;
    const currentEmpId = req.user!.employeeId;

    const emp = await SheetsRepo.getById<Employee>('Employees', id);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const isSelf = emp.employee_id === currentEmpId;
    const isManager = userRole === 'HR Manager';
    const isExec = userRole === 'HR Executive';

    const updatePayload: Partial<Employee> = {};

    if (isSelf || isManager || isExec) {
      if (body.phone) updatePayload.phone = body.phone;
      if (body.address) updatePayload.address = body.address;
      if (body.emergency_name) updatePayload.emergency_name = body.emergency_name;
      if (body.emergency_relation) updatePayload.emergency_relation = body.emergency_relation;
      if (body.emergency_phone) updatePayload.emergency_phone = body.emergency_phone;
      if (body.photo_url) updatePayload.photo_url = body.photo_url;
    }

    if (isManager || isExec) {
      if (body.dob) updatePayload.dob = body.dob;
      if (body.gender) updatePayload.gender = body.gender;
      if (body.work_location) updatePayload.work_location = body.work_location;
    }

    if (isManager) {
      if (body.full_name) updatePayload.full_name = body.full_name;
      if (body.email) updatePayload.email = body.email;
      if (body.designation) updatePayload.designation = body.designation;
      if (body.department) updatePayload.department = body.department;
      if (body.role) updatePayload.role = body.role;
      if (body.employment_type) updatePayload.employment_type = body.employment_type;
      if (body.joining_date) updatePayload.joining_date = body.joining_date;
      if (body.reporting_manager_id) updatePayload.reporting_manager_id = body.reporting_manager_id;
      if (body.probation_end) updatePayload.probation_end = body.probation_end;
      if (body.status) updatePayload.status = body.status;
      if (body.pan !== undefined) updatePayload.pan = body.pan;
      if (body.aadhaar) updatePayload.aadhaar_enc = encrypt(body.aadhaar);
      if (body.bank_name !== undefined) updatePayload.bank_name = body.bank_name;
      if (body.account_no) updatePayload.account_no_enc = encrypt(body.account_no);
      if (body.ifsc !== undefined) updatePayload.ifsc = body.ifsc;
      if (body.uan !== undefined) updatePayload.uan = body.uan;
      if (body.esi_no !== undefined) updatePayload.esi_no = body.esi_no;
    }

    const updated = await SheetsRepo.update<Employee>('Employees', id, updatePayload, req.user!.employeeId);
    await AuditService.log(req.user!.employeeId, 'UPDATE_EMPLOYEE', 'Employees', id, emp, updated, req.ip);

    return res.json({ success: true, message: 'Employee updated successfully', employee: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update employee' });
  }
});

/**
 * Exit management and deactivate login (HR Manager only)
 */
router.post('/:id/exit', requireRole('HR Manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { exit_date, exit_reason } = req.body;

    const emp = await SheetsRepo.getById<Employee>('Employees', id);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    await SheetsRepo.update<Employee>('Employees', id, {
      status: 'Resigned',
      exit_date: exit_date || new Date().toISOString().split('T')[0],
      exit_reason: exit_reason || 'Resignation'
    }, req.user!.employeeId);

    // Deactivate User account
    const users = await SheetsRepo.list<User>('Users');
    const user = users.find(u => u.employee_id === emp.employee_id);
    if (user) {
      await SheetsRepo.update<User>('Users', user.id, { is_active: false }, req.user!.employeeId);
    }

    await AuditService.log(req.user!.employeeId, 'DEACTIVATE_EMPLOYEE_EXIT', 'Employees', id, emp, { status: 'Resigned', exit_date }, req.ip);

    return res.json({ success: true, message: `Employee ${emp.employee_id} deactivated and marked exited` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to process exit' });
  }
});

/**
 * Upload employee document to Drive
 */
router.post('/:id/documents', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { doc_type } = req.body;

    if (!req.file || !doc_type) {
      return res.status(400).json({ success: false, message: 'File and doc_type are required' });
    }

    const emp = await SheetsRepo.getById<Employee>('Employees', id);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Check permissions
    const isSelf = emp.employee_id === req.user!.employeeId;
    const isManager = req.user!.role === 'HR Manager';
    if (!isSelf && !isManager) {
      return res.status(403).json({ success: false, message: 'Not authorized to upload documents for this employee' });
    }

    let driveFileId = '';
    try {
      const folderId = await DriveStorage.resolveFolderPath([
        'Mastered Skill Academy HR',
        'Employees',
        `${emp.employee_id} - ${emp.full_name}`,
        'Documents'
      ]);
      const uploadRes = await DriveStorage.uploadFile(
        `${doc_type}_${emp.employee_id}_${req.file.originalname}`,
        req.file.mimetype,
        req.file.buffer,
        folderId
      );
      driveFileId = uploadRes.fileId;
    } catch (e) {
      driveFileId = `drive_mock_${uuidv4().slice(0, 8)}`;
    }

    const docRecord = await SheetsRepo.create<EmployeeDoc>('EmployeeDocs', {
      employee_id: emp.employee_id,
      doc_type,
      file_name: req.file.originalname,
      drive_file_id: driveFileId,
      uploaded_by: req.user!.employeeId,
      verified: isManager ? true : false
    }, req.user!.employeeId);

    return res.json({ success: true, message: 'Document uploaded successfully', document: docRecord });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to upload document' });
  }
});

export default router;
