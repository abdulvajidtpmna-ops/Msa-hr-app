import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { SheetsRepo } from '../services/sheetsRepo';
import { DriveStorage } from '../services/driveStorage';
import { AuditService } from '../services/auditService';
import { checkGeofence, evaluatePunchStatus, AttendanceConfig } from '../utils/attendanceLogic';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { Attendance, AttendanceRequest, Employee, Setting, Holiday, LeaveRequest } from '../types';

const router = Router();
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.use(authenticate);

/**
 * Helper to load attendance settings from Settings tab
 */
async function getAttendanceConfig(): Promise<AttendanceConfig> {
  const settingsList = await SheetsRepo.list<Setting>('Settings');
  const findVal = (key: string, def: any) => {
    const s = settingsList.find(item => item.key === key);
    return s ? s.value : def;
  };

  return {
    officeStartTime: findVal('office_start_time', '09:30'),
    officeEndTime: findVal('office_end_time', '18:00'),
    graceMinutes: parseInt(findVal('grace_minutes', '15'), 10),
    minHoursPresent: parseInt(findVal('min_hours_present', '8'), 10),
    minHoursHalfDay: parseInt(findVal('min_hours_half_day', '4'), 10),
    officeLat: parseFloat(findVal('office_lat', '10.0159')), // e.g. Kochi / Kerala
    officeLng: parseFloat(findVal('office_lng', '76.3419')),
    geofenceRadiusMeters: parseInt(findVal('geofence_radius', '200'), 10),
    blockOutsideLocation: findVal('block_outside_geofence', 'false') === 'true'
  };
}

/**
 * Selfie Punch (IN or OUT)
 */
router.post('/punch', upload.single('selfie'), async (req: Request, res: Response) => {
  try {
    const { punch_type, latitude, longitude, accuracy, device_info, selfie_base64 } = req.body;
    const employeeId = req.user!.employeeId;

    if (!punch_type || !['IN', 'OUT'].includes(punch_type)) {
      return res.status(400).json({ success: false, message: 'Invalid punch type. Must be IN or OUT.' });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Location coordinates (GPS) are required. Please enable location permissions to punch attendance.'
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const acc = parseFloat(accuracy || '0');

    // Verify selfie provided either via file buffer or base64 data url
    let selfieBuffer: Buffer | null = null;
    if (req.file) {
      selfieBuffer = req.file.buffer;
    } else if (selfie_base64 && selfie_base64.startsWith('data:image')) {
      const base64Data = selfie_base64.replace(/^data:image\/\w+;base64,/, '');
      selfieBuffer = Buffer.from(base64Data, 'base64');
    }

    if (!selfieBuffer) {
      return res.status(400).json({
        success: false,
        message: 'Live camera selfie is mandatory for attendance check-in/out. Please allow camera access.'
      });
    }

    // Load Settings & Check Geofence
    const config = await getAttendanceConfig();
    const geofenceResult = checkGeofence(lat, lng, config);

    if (!geofenceResult.inside && config.blockOutsideLocation) {
      return res.status(403).json({
        success: false,
        message: `You are ${geofenceResult.distanceMeters}m away from office location. Punches outside office perimeter are blocked.`
      });
    }

    const geofenceFlag = geofenceResult.inside ? 'Inside' : 'Outside location';

    // Current Server Time
    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];
    const currentTimeStr = now.toTimeString().split(' ')[0]; // "HH:MM:SS"
    const currentMonthStr = todayDate.substring(0, 7); // "YYYY-MM"

    // Upload Selfie to Drive: Mastered Skill Academy HR/Employees/<ID - Name>/Attendance Selfies/<YYYY-MM>/
    let selfieDriveId = '';
    try {
      const emp = (await SheetsRepo.list<Employee>('Employees')).find(e => e.employee_id === employeeId);
      const empName = emp ? emp.full_name : employeeId;

      const folderId = await DriveStorage.resolveFolderPath([
        'Mastered Skill Academy HR',
        'Employees',
        `${employeeId} - ${empName}`,
        'Attendance Selfies',
        currentMonthStr
      ]);

      const uploadRes = await DriveStorage.uploadFile(
        `${todayDate}_${punch_type}_${employeeId}.jpg`,
        'image/jpeg',
        selfieBuffer,
        folderId
      );
      selfieDriveId = uploadRes.fileId;
    } catch (e) {
      selfieDriveId = `drive_selfie_mock_${uuidv4().slice(0, 8)}`;
    }

    // Check existing attendance for today
    const attendanceRecords = await SheetsRepo.find<Attendance>(
      'Attendance',
      a => a.employee_id === employeeId && a.date === todayDate
    );

    let record: Attendance;

    if (punch_type === 'IN') {
      if (attendanceRecords.length > 0 && attendanceRecords[0].in_time) {
        return res.status(400).json({
          success: false,
          message: `You have already checked in today at ${attendanceRecords[0].in_time}.`
        });
      }

      const statusEval = evaluatePunchStatus(currentTimeStr, undefined, config);

      if (attendanceRecords.length > 0) {
        // Update existing row
        record = (await SheetsRepo.update<Attendance>('Attendance', attendanceRecords[0].id, {
          in_time: currentTimeStr,
          in_lat: lat,
          in_lng: lng,
          in_accuracy: acc,
          in_selfie_drive_id: selfieDriveId,
          status: statusEval.status,
          geofence_flag: geofenceFlag,
          device_info: device_info || req.headers['user-agent']
        }, employeeId))!;
      } else {
        // Create new row
        record = await SheetsRepo.create<Attendance>('Attendance', {
          employee_id: employeeId,
          date: todayDate,
          in_time: currentTimeStr,
          in_lat: lat,
          in_lng: lng,
          in_accuracy: acc,
          in_selfie_drive_id: selfieDriveId,
          status: statusEval.status,
          geofence_flag: geofenceFlag,
          device_info: device_info || req.headers['user-agent']
        }, employeeId);
      }
    } else {
      // OUT Punch
      if (attendanceRecords.length === 0 || !attendanceRecords[0].in_time) {
        return res.status(400).json({
          success: false,
          message: 'You have not checked in yet today. Please Check-IN first.'
        });
      }

      const existing = attendanceRecords[0];
      if (existing.out_time) {
        return res.status(400).json({
          success: false,
          message: `You have already checked out today at ${existing.out_time}.`
        });
      }

      const statusEval = evaluatePunchStatus(existing.in_time || '09:30:00', currentTimeStr, config);

      record = (await SheetsRepo.update<Attendance>('Attendance', existing.id, {
        out_time: currentTimeStr,
        out_lat: lat,
        out_lng: lng,
        out_accuracy: acc,
        out_selfie_drive_id: selfieDriveId,
        status: statusEval.status,
        geofence_flag: geofenceFlag === 'Outside location' ? 'Outside location' : existing.geofence_flag,
        device_info: device_info || req.headers['user-agent']
      }, employeeId))!;
    }

    await AuditService.log(employeeId, `PUNCH_${punch_type}`, 'Attendance', record.id, undefined, { lat, lng, time: currentTimeStr }, req.ip);

    return res.json({
      success: true,
      message: `Checked ${punch_type} successfully at ${currentTimeStr}!`,
      attendance: record
    });
  } catch (err: any) {
    console.error('Punch attendance error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record attendance' });
  }
});

/**
 * Get today's punch card for logged in user
 */
router.get('/today', async (req: Request, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    const todayDate = new Date().toISOString().split('T')[0];

    const records = await SheetsRepo.find<Attendance>(
      'Attendance',
      a => a.employee_id === employeeId && a.date === todayDate
    );

    return res.json({
      success: true,
      todayDate,
      attendance: records.length > 0 ? records[0] : null
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to get today attendance' });
  }
});

/**
 * Monthly attendance history for logged-in employee
 */
router.get('/my-history', async (req: Request, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    const { month } = req.query; // "YYYY-MM"
    const targetMonth = (month as string) || new Date().toISOString().substring(0, 7);

    const [attendanceList, holidays, leaveRequests] = await Promise.all([
      SheetsRepo.find<Attendance>('Attendance', a => a.employee_id === employeeId && a.date.startsWith(targetMonth)),
      SheetsRepo.find<Holiday>('Holidays', h => h.date.startsWith(targetMonth)),
      SheetsRepo.find<LeaveRequest>('LeaveRequests', l => l.employee_id === employeeId && l.status === 'Approved')
    ]);

    return res.json({
      success: true,
      month: targetMonth,
      attendance: attendanceList,
      holidays,
      approvedLeaves: leaveRequests
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch attendance history' });
  }
});

/**
 * Live team attendance view for HR (Who is in, late, absent, on leave)
 */
router.get('/live', requireRole('HR Manager', 'HR Executive'), async (req: Request, res: Response) => {
  try {
    const { date } = req.query;
    const targetDate = (date as string) || new Date().toISOString().split('T')[0];

    const [employees, attendanceList, holidays, leaveRequests] = await Promise.all([
      SheetsRepo.list<Employee>('Employees'),
      SheetsRepo.find<Attendance>('Attendance', a => a.date === targetDate),
      SheetsRepo.find<Holiday>('Holidays', h => h.date === targetDate),
      SheetsRepo.find<LeaveRequest>('LeaveRequests', l => l.status === 'Approved' && l.from_date <= targetDate && l.to_date >= targetDate)
    ]);

    const activeEmployees = employees.filter(e => e.status === 'Active' || e.status === 'Probation');
    const isHoliday = holidays.length > 0;

    const liveData = activeEmployees.map(emp => {
      const att = attendanceList.find(a => a.employee_id === emp.employee_id);
      const onLeave = leaveRequests.find(l => l.employee_id === emp.employee_id);

      let status = 'Absent';
      if (att) {
        status = att.status;
      } else if (onLeave) {
        status = 'On Leave';
      } else if (isHoliday) {
        status = 'Holiday';
      }

      return {
        employee_id: emp.employee_id,
        full_name: emp.full_name,
        photo_url: emp.photo_url,
        department: emp.department,
        designation: emp.designation,
        in_time: att?.in_time || null,
        in_lat: att?.in_lat || null,
        in_lng: att?.in_lng || null,
        in_selfie_drive_id: att?.in_selfie_drive_id || null,
        out_time: att?.out_time || null,
        out_lat: att?.out_lat || null,
        out_lng: att?.out_lng || null,
        out_selfie_drive_id: att?.out_selfie_drive_id || null,
        status,
        geofence_flag: att?.geofence_flag || 'N/A',
        map_link: att?.in_lat && att?.in_lng ? `https://www.google.com/maps?q=${att.in_lat},${att.in_lng}` : null
      };
    });

    const summary = {
      total: activeEmployees.length,
      present: liveData.filter(d => ['Present', 'Late', 'Half Day'].includes(d.status)).length,
      late: liveData.filter(d => d.status === 'Late').length,
      absent: liveData.filter(d => d.status === 'Absent').length,
      on_leave: liveData.filter(d => d.status === 'On Leave').length
    };

    return res.json({ success: true, date: targetDate, summary, liveData });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch live attendance' });
  }
});

/**
 * Request attendance regularization
 */
router.post('/request-regularization', async (req: Request, res: Response) => {
  try {
    const { date, requested_in, requested_out, reason } = req.body;
    const employeeId = req.user!.employeeId;

    if (!date || !reason) {
      return res.status(400).json({ success: false, message: 'Date and reason are required' });
    }

    const created = await SheetsRepo.create<AttendanceRequest>('AttendanceRequests', {
      employee_id: employeeId,
      date,
      requested_in: requested_in || '',
      requested_out: requested_out || '',
      reason,
      status: 'Pending'
    }, employeeId);

    return res.status(201).json({ success: true, message: 'Regularization request submitted', request: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to submit regularization request' });
  }
});

/**
 * List pending regularization requests (HR)
 */
router.get('/regularization-requests', requireRole('HR Manager', 'HR Executive'), async (req: Request, res: Response) => {
  try {
    const list = await SheetsRepo.list<AttendanceRequest>('AttendanceRequests');
    const employees = await SheetsRepo.list<Employee>('Employees');

    const result = list.map(reqItem => {
      const emp = employees.find(e => e.employee_id === reqItem.employee_id);
      return {
        ...reqItem,
        employee_name: emp?.full_name || reqItem.employee_id,
        department: emp?.department
      };
    });

    return res.json({ success: true, requests: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch regularization requests' });
  }
});

/**
 * Review regularization request (Approve / Reject)
 */
router.post('/regularization-requests/:id/review', requireRole('HR Manager', 'HR Executive'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, review_remark } = req.body;

    const requestItem = await SheetsRepo.getById<AttendanceRequest>('AttendanceRequests', id);
    if (!requestItem) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    await SheetsRepo.update<AttendanceRequest>('AttendanceRequests', id, {
      status,
      reviewed_by: req.user!.employeeId,
      review_remark: review_remark || ''
    }, req.user!.employeeId);

    if (status === 'Approved') {
      const existingAttendance = await SheetsRepo.find<Attendance>(
        'Attendance',
        a => a.employee_id === requestItem.employee_id && a.date === requestItem.date
      );

      if (existingAttendance.length > 0) {
        await SheetsRepo.update<Attendance>('Attendance', existingAttendance[0].id, {
          in_time: requestItem.requested_in || existingAttendance[0].in_time,
          out_time: requestItem.requested_out || existingAttendance[0].out_time,
          status: 'Present',
          regularized: true,
          remark: `Regularized by HR (${req.user!.employeeId}): ${review_remark || requestItem.reason}`
        }, req.user!.employeeId);
      } else {
        await SheetsRepo.create<Attendance>('Attendance', {
          employee_id: requestItem.employee_id,
          date: requestItem.date,
          in_time: requestItem.requested_in || '09:30:00',
          out_time: requestItem.requested_out || '18:00:00',
          status: 'Present',
          regularized: true,
          remark: `Regularized by HR (${req.user!.employeeId}): ${review_remark || requestItem.reason}`
        }, req.user!.employeeId);
      }
    }

    return res.json({ success: true, message: `Regularization request ${status.toLowerCase()}` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to review request' });
  }
});

/**
 * Manual attendance entry (HR Manager / HR Executive)
 */
router.post('/manual-entry', requireRole('HR Manager', 'HR Executive'), async (req: Request, res: Response) => {
  try {
    const { employee_id, date, in_time, out_time, status, remark } = req.body;

    if (!employee_id || !date || !remark) {
      return res.status(400).json({ success: false, message: 'Employee ID, date, and mandatory remark are required' });
    }

    const created = await SheetsRepo.create<Attendance>('Attendance', {
      employee_id,
      date,
      in_time: in_time || '09:30:00',
      out_time: out_time || '18:00:00',
      status: status || 'Present',
      regularized: true,
      remark: `Manual entry by ${req.user!.employeeId}: ${remark}`
    }, req.user!.employeeId);

    await AuditService.log(req.user!.employeeId, 'MANUAL_ATTENDANCE_ENTRY', 'Attendance', created.id, undefined, created, req.ip);

    return res.status(201).json({ success: true, message: 'Manual attendance entry recorded', attendance: created });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to record manual attendance' });
  }
});

export default router;
