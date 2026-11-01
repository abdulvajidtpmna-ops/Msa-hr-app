import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SheetsRepo } from '../services/sheetsRepo';
import { AuditService } from '../services/auditService';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { Kra, Kpi, Employee, PerformanceDashboardStats } from '../types';

const router = Router();

router.use(authenticate);

/**
 * GET /api/performance/kras
 * List KRAs (supports filtering by department, assigned_to, period, status)
 * Employees see their assigned KRAs or organization/department-wide KRAs
 */
router.get('/kras', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { department, assigned_to, period, status } = req.query;

    let kras = await SheetsRepo.list<Kra>('KRAs');

    // Role-based visibility
    if (user.role === 'Employee') {
      const allEmployees = await SheetsRepo.list<Employee>('Employees');
      const currentEmp = allEmployees.find(e => e.employee_id === user.employeeId);
      const userDept = currentEmp?.department || '';
      kras = kras.filter(k => {
        const matchesAssignee = !k.assigned_to || k.assigned_to === 'ALL' || k.assigned_to === user.employeeId;
        const matchesDept = !k.department || k.department === 'All Departments' || (userDept && k.department === userDept);
        return matchesAssignee || matchesDept;
      });
    }

    // Apply explicit query filters
    if (department && department !== 'All' && department !== 'All Departments') {
      kras = kras.filter(k => k.department === department || k.department === 'All Departments');
    }
    if (assigned_to) {
      kras = kras.filter(k => k.assigned_to === assigned_to || k.assigned_to === 'ALL');
    }
    if (period) {
      kras = kras.filter(k => k.period === period);
    }
    if (status) {
      kras = kras.filter(k => k.status === status);
    }

    return res.json({ success: true, kras });
  } catch (err: any) {
    console.error('[PerformanceRoutes] Error fetching KRAs:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch KRAs' });
  }
});

/**
 * POST /api/performance/kras
 * Create or update KRA (HR only)
 */
router.post('/kras', requireRole('HR Manager', 'HR Executive'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const {
      id,
      title,
      description,
      department,
      designation,
      assigned_to,
      period,
      weightage,
      status
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'KRA title is required' });
    }

    const now = new Date().toISOString();

    if (id) {
      const existing = await SheetsRepo.findById<Kra>('KRAs', id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'KRA not found' });
      }

      const updated: Kra = {
        ...existing,
        title: title.trim(),
        description: description !== undefined ? description : existing.description,
        department: department || existing.department || 'All Departments',
        designation: designation || existing.designation || 'All Designations',
        assigned_to: assigned_to || existing.assigned_to || 'ALL',
        period: period || existing.period || '2026',
        weightage: weightage !== undefined ? Number(weightage) : existing.weightage,
        status: status || existing.status || 'Active',
        updated_at: now
      };

      await SheetsRepo.update<Kra>('KRAs', id, updated);

      await AuditService.log(
        user.employeeId,
        'UPDATE_KRA',
        'KRAs',
        id,
        existing,
        updated,
        req.ip
      );

      return res.json({ success: true, kra: updated, message: 'KRA updated successfully' });
    } else {
      const newKra: Kra = {
        id: `kra_${uuidv4().substring(0, 8)}`,
        title: title.trim(),
        description: description || '',
        department: department || 'All Departments',
        designation: designation || 'All Designations',
        assigned_to: assigned_to || 'ALL',
        assigned_by: user.employeeId,
        period: period || '2026',
        weightage: Number(weightage) || 0,
        status: status || 'Active',
        created_at: now,
        updated_at: now,
        created_by: user.employeeId,
        is_deleted: false
      };

      await SheetsRepo.create<Kra>('KRAs', newKra);

      await AuditService.log(
        user.employeeId,
        'CREATE_KRA',
        'KRAs',
        newKra.id,
        null,
        newKra,
        req.ip
      );

      return res.status(201).json({ success: true, kra: newKra, message: 'KRA created successfully' });
    }
  } catch (err: any) {
    console.error('[PerformanceRoutes] Error saving KRA:', err);
    return res.status(500).json({ success: false, message: 'Failed to save KRA' });
  }
});

/**
 * DELETE /api/performance/kras/:id
 * Soft delete KRA and cascade to associated KPIs (HR only)
 */
router.delete('/kras/:id', requireRole('HR Manager', 'HR Executive'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const existing = await SheetsRepo.findById<Kra>('KRAs', id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'KRA not found' });
    }

    await SheetsRepo.softDelete('KRAs', id);

    // Cascade soft delete associated KPIs
    const childKpis = await SheetsRepo.find<Kpi>('KPIs', k => k.kra_id === id);
    for (const kpi of childKpis) {
      await SheetsRepo.softDelete('KPIs', kpi.id);
    }

    await AuditService.log(
      user.employeeId,
      'DELETE_KRA',
      'KRAs',
      id,
      existing,
      null,
      req.ip
    );

    return res.json({ success: true, message: 'KRA and associated KPIs deleted successfully' });
  } catch (err: any) {
    console.error('[PerformanceRoutes] Error deleting KRA:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete KRA' });
  }
});

/**
 * GET /api/performance/kpis
 * List KPIs (supports filtering by employee_id, kra_id, period, status)
 * Enriches KPI with kra_title, employee_name, and department
 */
router.get('/kpis', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { employee_id, kra_id, period, status, evaluation_status } = req.query;

    let kpis = await SheetsRepo.list<Kpi>('KPIs');
    const [kras, employees] = await Promise.all([
      SheetsRepo.list<Kra>('KRAs'),
      SheetsRepo.list<Employee>('Employees')
    ]);

    const kraMap = new Map(kras.map(k => [k.id, k]));
    const empMap = new Map(employees.map(e => [e.employee_id, e]));

    // If Employee, strictly scope to own employee_id
    if (user.role === 'Employee') {
      kpis = kpis.filter(k => k.employee_id === user.employeeId);
    } else if (employee_id) {
      kpis = kpis.filter(k => k.employee_id === employee_id);
    }

    if (kra_id) {
      kpis = kpis.filter(k => k.kra_id === kra_id);
    }
    if (status) {
      kpis = kpis.filter(k => k.status === status);
    }
    if (evaluation_status) {
      kpis = kpis.filter(k => k.evaluation_status === evaluation_status);
    }
    if (period) {
      kpis = kpis.filter(k => {
        const parentKra = kraMap.get(k.kra_id);
        return parentKra && parentKra.period === period;
      });
    }

    // Enrich with parent KRA title and employee name
    const enrichedKpis = kpis.map(k => {
      const parentKra = kraMap.get(k.kra_id);
      const emp = empMap.get(k.employee_id);
      return {
        ...k,
        kra_title: parentKra?.title || 'General KRA',
        employee_name: emp?.full_name || k.employee_id,
        department: emp?.department || parentKra?.department || 'Academics'
      };
    });

    return res.json({ success: true, kpis: enrichedKpis });
  } catch (err: any) {
    console.error('[PerformanceRoutes] Error fetching KPIs:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch KPIs' });
  }
});

/**
 * POST /api/performance/kpis
 * Create or update KPI (HR only)
 */
router.post('/kpis', requireRole('HR Manager', 'HR Executive'), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const {
      id,
      kra_id,
      employee_id,
      title,
      description,
      target_value,
      current_value,
      unit,
      weightage,
      start_date,
      due_date,
      status,
      evaluation_status
    } = req.body;

    if (!kra_id) {
      return res.status(400).json({ success: false, message: 'Parent KRA is required' });
    }
    if (!employee_id) {
      return res.status(400).json({ success: false, message: 'Target Employee is required' });
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'KPI title is required' });
    }

    const now = new Date().toISOString();

    if (id) {
      const existing = await SheetsRepo.findById<Kpi>('KPIs', id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'KPI not found' });
      }

      const updated: Kpi = {
        ...existing,
        kra_id,
        employee_id,
        title: title.trim(),
        description: description !== undefined ? description : existing.description,
        target_value: target_value !== undefined ? target_value : existing.target_value,
        current_value: current_value !== undefined ? current_value : existing.current_value,
        unit: unit || existing.unit || '%',
        weightage: weightage !== undefined ? Number(weightage) : existing.weightage,
        start_date: start_date || existing.start_date,
        due_date: due_date || existing.due_date,
        status: status || existing.status || 'Pending',
        evaluation_status: evaluation_status || existing.evaluation_status || 'Not Started',
        updated_at: now
      };

      await SheetsRepo.update<Kpi>('KPIs', id, updated);

      await AuditService.log(
        user.employeeId,
        'UPDATE_KPI',
        'KPIs',
        id,
        existing,
        updated,
        req.ip
      );

      return res.json({ success: true, kpi: updated, message: 'KPI updated successfully' });
    } else {
      const newKpi: Kpi = {
        id: `kpi_${uuidv4().substring(0, 8)}`,
        kra_id,
        employee_id,
        title: title.trim(),
        description: description || '',
        target_value: target_value !== undefined ? target_value : 100,
        current_value: current_value !== undefined ? current_value : 0,
        unit: unit || '%',
        weightage: Number(weightage) || 0,
        start_date: start_date || now.split('T')[0],
        due_date: due_date || '',
        status: status || 'Pending',
        self_rating: '',
        self_comments: '',
        manager_rating: '',
        manager_comments: '',
        score: '',
        evaluation_status: evaluation_status || 'Not Started',
        evaluated_by: '',
        evaluated_at: '',
        created_at: now,
        updated_at: now,
        created_by: user.employeeId,
        is_deleted: false
      };

      await SheetsRepo.create<Kpi>('KPIs', newKpi);

      await AuditService.log(
        user.employeeId,
        'CREATE_KPI',
        'KPIs',
        newKpi.id,
        null,
        newKpi,
        req.ip
      );

      return res.status(201).json({ success: true, kpi: newKpi, message: 'KPI created successfully' });
    }
  } catch (err: any) {
    console.error('[PerformanceRoutes] Error saving KPI:', err);
    return res.status(500).json({ success: false, message: 'Failed to save KPI' });
  }
});

/**
 * DELETE /api/performance/kpis/:id
 * Soft delete KPI (HR only)
 */
router.delete('/kpis/:id', requireRole('HR Manager', 'HR Executive'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const existing = await SheetsRepo.findById<Kpi>('KPIs', id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'KPI not found' });
    }

    await SheetsRepo.softDelete('KPIs', id);

    await AuditService.log(
      user.employeeId,
      'DELETE_KPI',
      'KPIs',
      id,
      existing,
      null,
      req.ip
    );

    return res.json({ success: true, message: 'KPI deleted successfully' });
  } catch (err: any) {
    console.error('[PerformanceRoutes] Error deleting KPI:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete KPI' });
  }
});

/**
 * POST /api/performance/kpis/:id/self-evaluate
 * Submit employee self rating, comments, and updated progress
 */
router.post('/kpis/:id/self-evaluate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { self_rating, self_comments, current_value } = req.body;

    const kpi = await SheetsRepo.findById<Kpi>('KPIs', id);
    if (!kpi) {
      return res.status(404).json({ success: false, message: 'KPI not found' });
    }

    // Authorization: employee can only self-evaluate own KPI
    if (user.role === 'Employee' && kpi.employee_id !== user.employeeId) {
      return res.status(403).json({ success: false, message: 'You can only evaluate your own assigned KPIs' });
    }

    const ratingNum = Number(self_rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: 'Self rating must be a number between 1.0 and 5.0' });
    }

    const now = new Date().toISOString();
    const updatedCurrentVal = current_value !== undefined ? Number(current_value) : Number(kpi.current_value || 0);

    let status = kpi.status;
    const targetVal = Number(kpi.target_value) || 100;
    if (targetVal > 0 && updatedCurrentVal >= targetVal && status === 'Pending') {
      status = 'In Progress';
    }

    const updated: Kpi = {
      ...kpi,
      self_rating: ratingNum,
      self_comments: self_comments || '',
      current_value: updatedCurrentVal,
      status,
      evaluation_status: 'Self Submitted',
      updated_at: now
    };

    await SheetsRepo.update<Kpi>('KPIs', id, updated);

    await AuditService.log(
      user.employeeId,
      'SELF_EVALUATE_KPI',
      'KPIs',
      id,
      kpi,
      updated,
      req.ip
    );

    return res.json({ success: true, kpi: updated, message: 'Self evaluation submitted successfully' });
  } catch (err: any) {
    console.error('[PerformanceRoutes] Error in self evaluation:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit self evaluation' });
  }
});

/**
 * POST /api/performance/kpis/:id/evaluate
 * Manager/HR evaluation with rating, comments, and weighted score calculation
 */
router.post('/kpis/:id/evaluate', requireRole('HR Manager', 'HR Executive'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const { manager_rating, manager_comments, score, status } = req.body;

    const kpi = await SheetsRepo.findById<Kpi>('KPIs', id);
    if (!kpi) {
      return res.status(404).json({ success: false, message: 'KPI not found' });
    }

    const ratingNum = Number(manager_rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: 'Manager rating must be a number between 1.0 and 5.0' });
    }

    // Score calculation logic:
    // Progress % = min(100, max(0, (current_value / target_value) * 100))
    // Rating % = (manager_rating / 5) * 100
    // Weighted Score = 0.5 * Progress % + 0.5 * Rating %
    const target = Number(kpi.target_value) || 100;
    const current = Number(kpi.current_value) || 0;
    const progressPct = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 100;
    const ratingPct = (ratingNum / 5) * 100;
    const calculatedScore = Math.round((progressPct * 0.5) + (ratingPct * 0.5));
    const finalScore = score !== undefined && score !== null && !isNaN(Number(score))
      ? Math.round(Number(score))
      : calculatedScore;

    // Automatic status determination if not explicitly passed
    let determinedStatus = status;
    if (!determinedStatus) {
      if (finalScore >= 85) determinedStatus = 'Achieved';
      else if (finalScore >= 50) determinedStatus = 'Partially Achieved';
      else determinedStatus = 'Missed';
    }

    const now = new Date().toISOString();
    const updated: Kpi = {
      ...kpi,
      manager_rating: ratingNum,
      manager_comments: manager_comments || '',
      score: finalScore,
      status: determinedStatus,
      evaluation_status: 'Evaluated',
      evaluated_by: user.employeeId,
      evaluated_at: now,
      updated_at: now
    };

    await SheetsRepo.update<Kpi>('KPIs', id, updated);

    await AuditService.log(
      user.employeeId,
      'EVALUATE_KPI',
      'KPIs',
      id,
      kpi,
      updated,
      req.ip
    );

    return res.json({ success: true, kpi: updated, message: 'Manager evaluation recorded successfully' });
  } catch (err: any) {
    console.error('[PerformanceRoutes] Error in manager evaluation:', err);
    return res.status(500).json({ success: false, message: 'Failed to record manager evaluation' });
  }
});

/**
 * GET /api/performance/dashboard
 * Aggregate performance statistics (avg score, total KRAs, total KPIs, completion %, department breakdown, top performers)
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { period, department } = req.query;

    const [allKras, allKpis, employees] = await Promise.all([
      SheetsRepo.list<Kra>('KRAs'),
      SheetsRepo.list<Kpi>('KPIs'),
      SheetsRepo.list<Employee>('Employees')
    ]);

    const kraMap = new Map(allKras.map(k => [k.id, k]));
    const empMap = new Map(employees.map(e => [e.employee_id, e]));

    // Scope for role
    let filteredKpis = allKpis;
    let filteredKras = allKras;

    if (user.role === 'Employee') {
      filteredKpis = filteredKpis.filter(k => k.employee_id === user.employeeId);
      const userKraIds = new Set(filteredKpis.map(k => k.kra_id));
      const currentEmp = empMap.get(user.employeeId);
      const userDept = currentEmp?.department || '';
      filteredKras = filteredKras.filter(k => userKraIds.has(k.id) || k.assigned_to === 'ALL' || (userDept && k.department === userDept));
    } else {
      if (department && department !== 'All' && department !== 'All Departments') {
        filteredKras = filteredKras.filter(k => k.department === department || k.department === 'All Departments');
        filteredKpis = filteredKpis.filter(k => {
          const emp = empMap.get(k.employee_id);
          const kra = kraMap.get(k.kra_id);
          return emp?.department === department || kra?.department === department;
        });
      }
      if (period) {
        filteredKras = filteredKras.filter(k => k.period === period);
        const periodKraIds = new Set(filteredKras.map(k => k.id));
        filteredKpis = filteredKpis.filter(k => periodKraIds.has(k.kra_id));
      }
    }

    const totalKras = filteredKras.length;
    const totalKpis = filteredKpis.length;

    // Evaluated KPIs
    const evaluatedKpis = filteredKpis.filter(k =>
      k.evaluation_status === 'Evaluated' ||
      k.evaluation_status === 'Approved' ||
      (k.score !== undefined && k.score !== null && k.score !== '')
    );

    const totalScore = evaluatedKpis.reduce((sum, k) => sum + Number(k.score || 0), 0);
    const avgScore = evaluatedKpis.length > 0 ? Math.round((totalScore / evaluatedKpis.length) * 10) / 10 : 0;

    // Completion rate (% of KPIs achieved or evaluated)
    const completedCount = filteredKpis.filter(k =>
      k.status === 'Achieved' || k.evaluation_status === 'Evaluated'
    ).length;
    const completionRate = totalKpis > 0 ? Math.round((completedCount / totalKpis) * 100) : 0;

    // Status distribution
    const statusDistribution: Record<string, number> = {
      'Pending': 0,
      'In Progress': 0,
      'Achieved': 0,
      'Partially Achieved': 0,
      'Missed': 0
    };
    filteredKpis.forEach(k => {
      const st = k.status || 'Pending';
      if (statusDistribution[st] !== undefined) {
        statusDistribution[st]++;
      } else {
        statusDistribution[st] = 1;
      }
    });

    // Department breakdown
    const deptStatsMap = new Map<string, { totalKras: number; totalKpis: number; scores: number[] }>();

    // Seed known departments
    const knownDepts = ['Academics', 'Human Resources', 'Administration', 'Operations', 'Finance'];
    knownDepts.forEach(d => deptStatsMap.set(d, { totalKras: 0, totalKpis: 0, scores: [] }));

    filteredKras.forEach(k => {
      const dept = k.department && k.department !== 'All Departments' ? k.department : 'General';
      if (!deptStatsMap.has(dept)) {
        deptStatsMap.set(dept, { totalKras: 0, totalKpis: 0, scores: [] });
      }
      deptStatsMap.get(dept)!.totalKras++;
    });

    filteredKpis.forEach(k => {
      const emp = empMap.get(k.employee_id);
      const kra = kraMap.get(k.kra_id);
      const dept = emp?.department || kra?.department || 'General';
      if (!deptStatsMap.has(dept)) {
        deptStatsMap.set(dept, { totalKras: 0, totalKpis: 0, scores: [] });
      }
      const entry = deptStatsMap.get(dept)!;
      entry.totalKpis++;
      if (k.score !== undefined && k.score !== null && k.score !== '') {
        entry.scores.push(Number(k.score));
      }
    });

    const departmentBreakdown = Array.from(deptStatsMap.entries()).map(([dept, data]) => ({
      department: dept,
      totalKras: data.totalKras,
      totalKpis: data.totalKpis,
      avgScore: data.scores.length > 0
        ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10) / 10
        : 0
    })).filter(d => d.totalKras > 0 || d.totalKpis > 0);

    // Top performers (employees with highest average scores)
    const empScoreMap = new Map<string, { totalScore: number; count: number }>();
    filteredKpis.forEach(k => {
      if (k.score !== undefined && k.score !== null && k.score !== '') {
        const cur = empScoreMap.get(k.employee_id) || { totalScore: 0, count: 0 };
        cur.totalScore += Number(k.score);
        cur.count++;
        empScoreMap.set(k.employee_id, cur);
      }
    });

    const topPerformers = Array.from(empScoreMap.entries())
      .map(([empId, data]) => {
        const emp = empMap.get(empId);
        return {
          employee_id: empId,
          employee_name: emp?.full_name || empId,
          department: emp?.department || 'Academics',
          score: Math.round((data.totalScore / data.count) * 10) / 10,
          kpiCount: data.count
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const stats: PerformanceDashboardStats = {
      totalKras,
      totalKpis,
      avgScore,
      completionRate,
      statusDistribution,
      departmentBreakdown,
      topPerformers
    };

    return res.json({ success: true, stats });
  } catch (err: any) {
    console.error('[PerformanceRoutes] Error computing dashboard stats:', err);
    return res.status(500).json({ success: false, message: 'Failed to compute dashboard stats' });
  }
});

/**
 * POST /api/performance/seed
 * Seed realistic master KRAs and KPIs for testing and out-of-the-box demonstration (HR only)
 */
router.post('/seed', requireRole('HR Manager', 'HR Executive'), async (req: Request, res: Response) => {
  try {
    const existingKras = await SheetsRepo.list<Kra>('KRAs');
    if (existingKras.length > 0) {
      return res.json({ success: true, message: 'Performance data already initialized', count: existingKras.length });
    }

    const now = new Date().toISOString();
    const period = '2026';

    const sampleKras: Kra[] = [
      {
        id: 'kra_academics_01',
        title: 'Curriculum Delivery & Student Learning Excellence',
        description: 'Ensure 100% syllabus coverage and maintain student satisfaction index above 90%',
        department: 'Academics',
        designation: 'Faculty / Trainer',
        assigned_to: 'ALL',
        assigned_by: 'MSA-0001',
        period,
        weightage: 40,
        status: 'Active',
        created_at: now,
        updated_at: now,
        created_by: 'MSA-0001',
        is_deleted: false
      },
      {
        id: 'kra_academics_02',
        title: 'Student Placement & Industry Readiness',
        description: 'Prepare students for placement interviews and facilitate mock evaluations',
        department: 'Academics',
        designation: 'Faculty / Trainer',
        assigned_to: 'MSA-0003',
        assigned_by: 'MSA-0001',
        period,
        weightage: 35,
        status: 'Active',
        created_at: now,
        updated_at: now,
        created_by: 'MSA-0001',
        is_deleted: false
      },
      {
        id: 'kra_hr_01',
        title: 'Talent Acquisition & Employee Engagement',
        description: 'Maintain hiring SLA within 21 days and drive monthly employee engagement sessions',
        department: 'Human Resources',
        designation: 'HR Executive',
        assigned_to: 'MSA-0002',
        assigned_by: 'MSA-0001',
        period,
        weightage: 50,
        status: 'Active',
        created_at: now,
        updated_at: now,
        created_by: 'MSA-0001',
        is_deleted: false
      }
    ];

    for (const kra of sampleKras) {
      await SheetsRepo.create<Kra>('KRAs', kra);
    }

    const sampleKpis: Kpi[] = [
      {
        id: 'kpi_acad_01',
        kra_id: 'kra_academics_01',
        employee_id: 'MSA-0003',
        title: 'Syllabus Completion Rate',
        description: 'Complete scheduled academic curriculum on or before semester deadline',
        target_value: 100,
        current_value: 95,
        unit: '%',
        weightage: 50,
        start_date: '2026-01-01',
        due_date: '2026-06-30',
        status: 'Achieved',
        self_rating: 4.5,
        self_comments: 'Covered 19 out of 20 modules with practical labs.',
        manager_rating: 4.8,
        manager_comments: 'Excellent pace and student comprehension.',
        score: 96,
        evaluation_status: 'Evaluated',
        evaluated_by: 'MSA-0001',
        evaluated_at: now,
        created_at: now,
        updated_at: now,
        created_by: 'MSA-0001',
        is_deleted: false
      },
      {
        id: 'kpi_acad_02',
        kra_id: 'kra_academics_01',
        employee_id: 'MSA-0003',
        title: 'Student Feedback Rating',
        description: 'Maintain course evaluation feedback average above 4.2 out of 5',
        target_value: 5,
        current_value: 4.6,
        unit: 'Score (1-5)',
        weightage: 50,
        start_date: '2026-01-01',
        due_date: '2026-06-30',
        status: 'Achieved',
        self_rating: 4.6,
        self_comments: 'Positive ratings from batch 2026-A.',
        manager_rating: 4.7,
        manager_comments: 'Consistently praised for clear mentorship.',
        score: 93,
        evaluation_status: 'Evaluated',
        evaluated_by: 'MSA-0001',
        evaluated_at: now,
        created_at: now,
        updated_at: now,
        created_by: 'MSA-0001',
        is_deleted: false
      },
      {
        id: 'kpi_acad_03',
        kra_id: 'kra_academics_02',
        employee_id: 'MSA-0003',
        title: 'Mock Placement Interviews Conducted',
        description: 'Conduct at least 25 individual mock technical interviews',
        target_value: 25,
        current_value: 18,
        unit: 'Count',
        weightage: 60,
        start_date: '2026-01-01',
        due_date: '2026-06-30',
        status: 'In Progress',
        self_rating: 4.0,
        self_comments: '18 interviews completed, remaining 7 scheduled for next week.',
        manager_rating: '',
        manager_comments: '',
        score: '',
        evaluation_status: 'Self Submitted',
        evaluated_by: '',
        evaluated_at: '',
        created_at: now,
        updated_at: now,
        created_by: 'MSA-0001',
        is_deleted: false
      },
      {
        id: 'kpi_hr_01',
        kra_id: 'kra_hr_01',
        employee_id: 'MSA-0002',
        title: 'Time-to-Hire SLA Adherence',
        description: 'Fill open faculty vacancies within 21 days from requisition',
        target_value: 21,
        current_value: 18,
        unit: 'Days',
        weightage: 50,
        start_date: '2026-01-01',
        due_date: '2026-06-30',
        status: 'Achieved',
        self_rating: 4.8,
        self_comments: 'Averaged 18 days across 4 successful hires.',
        manager_rating: 4.9,
        manager_comments: 'Outstanding pipeline management.',
        score: 98,
        evaluation_status: 'Evaluated',
        evaluated_by: 'MSA-0001',
        evaluated_at: now,
        created_at: now,
        updated_at: now,
        created_by: 'MSA-0001',
        is_deleted: false
      }
    ];

    for (const kpi of sampleKpis) {
      await SheetsRepo.create<Kpi>('KPIs', kpi);
    }

    return res.status(201).json({
      success: true,
      message: 'Realistic performance sample data successfully initialized',
      krasCount: sampleKras.length,
      kpisCount: sampleKpis.length
    });
  } catch (err: any) {
    console.error('[PerformanceRoutes] Error seeding performance data:', err);
    return res.status(500).json({ success: false, message: 'Failed to seed performance data' });
  }
});

export default router;
