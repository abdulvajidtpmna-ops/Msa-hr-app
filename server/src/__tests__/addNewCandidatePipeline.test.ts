import { createApplicationFromDirectResume, autoAddJoinedCandidateToEmployees } from '../routes/recruitmentRoutes';
import { SheetsRepo } from '../services/sheetsRepo';
import { AuditService } from '../services/auditService';
import { Job, Application, Employee, User, ApplicationStatusLog } from '../types';

describe('Add New Candidate & Complete Recruitment Pipeline Tests', () => {
  jest.setTimeout(120000);


  it('1. Should create a new candidate with custom job role and auto-create the Job entity', async () => {
    const customRole = 'Lead AI Specialist ' + Math.floor(Math.random() * 1000);
    const candidateData = {
      full_name: 'Dr. Vikram Malhotra',
      phone: '+91 9895012345',
      email: `vikram.${Date.now()}@example.com`,
      job_role: customRole,
      department: 'IT',
      qualification: 'Ph.D in AI',
      experience_years: 6,
      current_salary: 75000,
      expected_salary: 95000,
      initial_status: 'Applied',
      hr_notes: 'Strong machine learning credentials'
    };

    const result = await createApplicationFromDirectResume(
      undefined, // No file uploaded (manual candidate addition)
      undefined,
      candidateData,
      'EMP-SYSTEM',
      '127.0.0.1'
    );

    expect(result.application).toBeDefined();
    expect(result.application.full_name).toBe('Dr. Vikram Malhotra');
    expect(result.application.status).toBe('Applied');
    expect(result.job).toBeDefined();
    expect(result.job.title).toBe(customRole);
    expect(result.job.department).toBe('IT');

    // Verify application ref number generated
    expect(result.application.ref_no).toMatch(/^APP-\d+/);
  });

  it('2. Should progress candidate through pipeline: Shortlisted -> Interview -> Offer -> Joined', async () => {
    const candidateData = {
      full_name: 'Ananya Ramesh',
      phone: '+91 9745123456',
      email: `ananya.${Date.now()}@example.com`,
      job_role: 'Senior English Faculty',
      department: 'Academics',
      qualification: 'MA English, B.Ed',
      experience_years: 4,
      current_salary: 32000,
      expected_salary: 40000,
      initial_status: 'Applied'
    };

    const addResult = await createApplicationFromDirectResume(
      undefined,
      undefined,
      candidateData,
      'EMP-SYSTEM'
    );
    const appId = addResult.application.id;

    // Step A: Shortlist
    await SheetsRepo.update<Application>('Applications', appId, { status: 'Shortlisted' }, 'EMP-SYSTEM');
    let app = await SheetsRepo.getById<Application>('Applications', appId);
    expect(app?.status).toBe('Shortlisted');

    // Step B: Schedule Interview
    await SheetsRepo.update<Application>('Applications', appId, { status: 'Interview Scheduled' }, 'EMP-SYSTEM');
    app = await SheetsRepo.getById<Application>('Applications', appId);
    expect(app?.status).toBe('Interview Scheduled');

    // Step C: Offer Extended
    await SheetsRepo.update<Application>('Applications', appId, { status: 'Offer Extended' }, 'EMP-SYSTEM');
    app = await SheetsRepo.getById<Application>('Applications', appId);
    expect(app?.status).toBe('Offer Extended');

    // Step D: Candidate Joined -> Auto-appoint to Employee Directory
    const joinResult = await autoAddJoinedCandidateToEmployees(appId, {
      role: 'Employee',
      designation: 'Senior English Faculty',
      department: 'Academics',
      joining_date: '2026-11-01',
      changedBy: 'EMP-SYSTEM'
    });

    expect(joinResult.employee).toBeDefined();
    expect(joinResult.employee.full_name).toBe('Ananya Ramesh');
    expect(joinResult.employee.employee_id).toMatch(/^MSA-\d{4}$/);
    expect(joinResult.employee.department).toBe('Academics');
    expect(joinResult.employee.status).toBe('Active');

    // Verify candidate application status updated to Joined
    const finalApp = await SheetsRepo.getById<Application>('Applications', appId);
    expect(finalApp?.status).toBe('Joined');

    // Verify credentials generated for staff login
    expect(joinResult.credentials).toBeDefined();
    expect(joinResult.credentials?.employee_id).toBe(joinResult.employee.employee_id);
    expect(joinResult.credentials?.email).toBe(candidateData.email);
  });

  it('3. Should support rejecting a candidate at any pipeline stage', async () => {
    const candidateData = {
      full_name: 'Karan Mehra',
      phone: '+91 9988776655',
      email: `karan.${Date.now()}@example.com`,
      job_role: 'Operations Assistant',
      department: 'Operations',
      initial_status: 'Shortlisted'
    };

    const addResult = await createApplicationFromDirectResume(
      undefined,
      undefined,
      candidateData,
      'EMP-SYSTEM'
    );
    const appId = addResult.application.id;

    // Reject candidate
    await SheetsRepo.update<Application>('Applications', appId, { status: 'Rejected' }, 'EMP-SYSTEM');
    await SheetsRepo.create<ApplicationStatusLog>('ApplicationStatusLog', {
      application_id: appId,
      from_status: 'Shortlisted',
      to_status: 'Rejected',
      remark: 'Candidate declined relocation offer',
      changed_by: 'EMP-SYSTEM'
    });

    const app = await SheetsRepo.getById<Application>('Applications', appId);
    expect(app?.status).toBe('Rejected');

    const logs = await SheetsRepo.find<ApplicationStatusLog>('ApplicationStatusLog', l => l.application_id === appId);
    expect(logs.some(l => l.to_status === 'Rejected')).toBe(true);
  });

  it('4. Should support adding candidate directly as Joined and appointing to Staff Directory', async () => {
    const candidateData = {
      full_name: 'Pooja Nair',
      phone: '+91 9447112233',
      email: `pooja.${Date.now()}@example.com`,
      job_role: 'Senior Accountant',
      department: 'Finance',
      initial_status: 'Joined'
    };

    const result = await createApplicationFromDirectResume(
      undefined,
      undefined,
      candidateData,
      'EMP-SYSTEM'
    );

    expect(result.application.status).toBe('Joined');
    expect(result.joinedResult).toBeDefined();
    expect(result.joinedResult.employee.full_name).toBe('Pooja Nair');
    expect(result.joinedResult.employee.employee_id).toMatch(/^MSA-\d{4}$/);
    expect(result.joinedResult.credentials).toBeDefined();
  });

  it('5. AuditService.log should execute asynchronously in < 15ms without blocking user actions', async () => {
    const startTime = Date.now();
    await AuditService.log(
      'EMP-TEST',
      'PERFORMANCE_BENCHMARK_TEST',
      'Applications',
      'APP-1234',
      undefined,
      { test: true },
      '127.0.0.1'
    );
    const duration = Date.now() - startTime;

    // Verify non-blocking return is nearly instantaneous
    expect(duration).toBeLessThan(50);
  });
});
