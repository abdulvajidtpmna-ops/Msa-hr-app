const { SheetsRepo } = require('./server/dist/services/sheetsRepo');
const { calculateEmployeePayroll } = require('./server/dist/utils/payrollCalculator');

async function runE2ETests() {
  console.log('========================================================');
  console.log('🚀 MASTERED SKILL ACADEMY - END-TO-END STORAGE TEST');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(desc, condition, detail = '') {
    if (condition) {
      console.log(`✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${desc} - ${detail}`);
      failed++;
    }
  }

  // 1. Employees & Blood Group Persistence
  console.log('--- 1. Testing Employee Profile & Blood Group Persistence ---');
  try {
    const employees = await SheetsRepo.list('Employees');
    assert('Employees list loaded from Google Sheets', employees.length > 0, `Count: ${employees.length}`);
    const emp1 = employees.find(e => e.id === 'emp_001' || e.employee_id === 'MSA-0001');
    assert('Found HR Manager MSA-0001', !!emp1, 'Emp 001 not found');

    // Update blood group
    console.log('Updating blood group to O+ for MSA-0001...');
    await SheetsRepo.update('Employees', emp1.id, { blood_group: 'O+' });

    // Simulate page refresh: Force clear in-memory cache
    SheetsRepo.invalidateCache('Employees');
    SheetsRepo.invalidateCache('Settings');

    // Fetch again
    const employeesAfter = await SheetsRepo.list('Employees');
    const emp1After = employeesAfter.find(e => e.id === 'emp_001' || e.employee_id === 'MSA-0001');
    assert('Blood group persisted after cache invalidation (refresh)', emp1After?.blood_group === 'O+', `Got: ${emp1After?.blood_group}`);
  } catch (e) {
    assert('Employee test exception', false, e.message);
  }

  // 2. Exit & Resignation Management
  console.log('\n--- 2. Testing Exit & Resignation Management Persistence ---');
  const testExitId = 'exit_e2e_' + Date.now();
  try {
    const createdExit = await SheetsRepo.create('ExitRequests', {
      id: testExitId,
      employee_id: 'MSA-0003',
      employee_name: 'Staff Member',
      department: 'Academics',
      designation: 'Faculty / Trainer',
      request_type: 'Resignation',
      resignation_date: '2026-10-16',
      notice_period_days: 30,
      proposed_last_working_day: '2026-11-15',
      reason: 'Career Advancement',
      status: 'Pending Review',
      dept_clearance: false,
      it_clearance: false,
      finance_clearance: false,
      admin_clearance: false,
      exit_interview_status: 'Pending',
      fnf_status: 'Pending'
    }, 'MSA-0003');

    assert('Created ExitRequest', !!createdExit && createdExit.id === testExitId);

    // Simulate refresh
    SheetsRepo.invalidateCache('ExitRequests');
    SheetsRepo.invalidateCache('Settings');

    const exitList = await SheetsRepo.list('ExitRequests');
    const foundExit = exitList.find(x => x.id === testExitId);
    assert('ExitRequest persisted after cache invalidation (refresh)', !!foundExit, 'Record not found');
    assert('ExitRequest status is Pending Review', foundExit?.status === 'Pending Review', `Status: ${foundExit?.status}`);

    // Update Clearance
    await SheetsRepo.update('ExitRequests', testExitId, {
      dept_clearance: true,
      it_clearance: true,
      status: 'Clearance In Progress'
    });

    SheetsRepo.invalidateCache('ExitRequests');
    const updatedExit = await SheetsRepo.getById('ExitRequests', testExitId);
    assert('ExitRequest clearance update persisted', updatedExit?.dept_clearance === true && updatedExit?.status === 'Clearance In Progress');

    // Clean up test record
    await SheetsRepo.softDelete('ExitRequests', testExitId);
    SheetsRepo.invalidateCache('ExitRequests');
    const exitListFinal = await SheetsRepo.list('ExitRequests');
    const deletedFound = exitListFinal.find(x => x.id === testExitId);
    assert('ExitRequest soft delete verified', !deletedFound);
  } catch (e) {
    assert('ExitRequest test exception', false, e.message);
  }

  // 3. Attendance Persistence
  console.log('\n--- 3. Testing Attendance Direct Storage ---');
  const testAttId = 'att_e2e_' + Date.now();
  try {
    const attRecord = await SheetsRepo.create('Attendance', {
      id: testAttId,
      employee_id: 'MSA-0003',
      date: '2026-10-16',
      in_time: '09:30',
      out_time: '18:00',
      status: 'Present',
      remark: 'On-time checkin'
    }, 'MSA-0003');
    assert('Attendance created', !!attRecord);

    SheetsRepo.invalidateCache('Attendance');
    const attList = await SheetsRepo.list('Attendance');
    const foundAtt = attList.find(a => a.id === testAttId);
    assert('Attendance persisted after refresh', !!foundAtt && foundAtt.status === 'Present');

    // Clean up
    await SheetsRepo.softDelete('Attendance', testAttId);
  } catch (e) {
    assert('Attendance test exception', false, e.message);
  }

  // 4. Daily Tasks Direct Storage
  console.log('\n--- 4. Testing Tasks Direct Storage ---');
  const testTaskId = 'task_e2e_' + Date.now();
  try {
    const taskRecord = await SheetsRepo.create('Tasks', {
      id: testTaskId,
      title: 'Review System Database Sync',
      assigned_to: 'MSA-0003',
      assigned_by: 'MSA-0001',
      priority: 'High',
      status: 'In Progress'
    }, 'MSA-0001');
    assert('Task created', !!taskRecord);

    SheetsRepo.invalidateCache('Tasks');
    const taskList = await SheetsRepo.list('Tasks');
    const foundTask = taskList.find(t => t.id === testTaskId);
    assert('Task persisted after refresh', !!foundTask && foundTask.status === 'In Progress');

    // Clean up
    await SheetsRepo.softDelete('Tasks', testTaskId);
  } catch (e) {
    assert('Task test exception', false, e.message);
  }

  // 5. Leave Requests Direct Storage
  console.log('\n--- 5. Testing Leave Requests Direct Storage ---');
  const testLeaveId = 'leave_e2e_' + Date.now();
  try {
    const leaveRecord = await SheetsRepo.create('LeaveRequests', {
      id: testLeaveId,
      employee_id: 'MSA-0003',
      leave_type_id: 'lt_casual_leave',
      from_date: '2026-10-25',
      to_date: '2026-10-26',
      days: 2,
      reason: 'Personal work',
      status: 'Pending'
    }, 'MSA-0003');
    assert('Leave request created', !!leaveRecord);

    await new Promise(r => setTimeout(r, 1200));
    SheetsRepo.invalidateCache('LeaveRequests');
    const leaveList = await SheetsRepo.list('LeaveRequests');
    const foundLeave = leaveList.find(l => l.id === testLeaveId);
    assert('Leave request persisted after refresh', !!foundLeave && foundLeave.status === 'Pending', `Found: ${!!foundLeave}, status: ${foundLeave?.status}`);

    // Clean up
    await SheetsRepo.softDelete('LeaveRequests', testLeaveId);
  } catch (e) {
    assert('Leave request test exception', false, e.message);
  }

  // 6. KRAs Management Persistence & Filtering
  console.log('\n--- 6. Testing Key Result Areas (KRAs) Direct Storage & Filtering ---');
  const testKraId = 'kra_e2e_' + Date.now();
  try {
    const kraRecord = await SheetsRepo.create('KRAs', {
      id: testKraId,
      title: 'Academic Excellence & Curriculum Delivery',
      description: 'Oversee full-stack training modules and student capstone projects',
      department: 'Academics',
      designation: 'Faculty / Trainer',
      assigned_to: 'MSA-0003',
      assigned_by: 'MSA-0001',
      period: '2026',
      weightage: 50,
      status: 'Active'
    }, 'MSA-0001');
    assert('KRA created in SheetsRepo', !!kraRecord && kraRecord.id === testKraId);

    // Invalidate cache to simulate refresh
    SheetsRepo.invalidateCache('KRAs');
    const kraList = await SheetsRepo.list('KRAs');
    const foundKra = kraList.find(k => k.id === testKraId);
    assert('KRA persisted after cache invalidation', !!foundKra && foundKra.title === 'Academic Excellence & Curriculum Delivery');
    assert('KRA weightage and department match', Number(foundKra?.weightage) === 50 && foundKra?.department === 'Academics');

    // Test multi-parameter filtering
    const deptFiltered = kraList.filter(k => k.department === 'Academics');
    assert('KRA filtered by department (Academics)', deptFiltered.some(k => k.id === testKraId));

    const assigneeFiltered = kraList.filter(k => k.assigned_to === 'MSA-0003');
    assert('KRA filtered by assigned_to (MSA-0003)', assigneeFiltered.some(k => k.id === testKraId));

    const periodFiltered = kraList.filter(k => String(k.period) === '2026');
    assert('KRA filtered by period (2026)', periodFiltered.some(k => k.id === testKraId));

    // Update KRA
    console.log('Updating KRA weightage and status...');
    await SheetsRepo.update('KRAs', testKraId, {
      weightage: 60,
      status: 'Under Review',
      description: 'Expanded curriculum scope including cloud deployment'
    });

    SheetsRepo.invalidateCache('KRAs');
    const updatedKra = await SheetsRepo.getById('KRAs', testKraId);
    assert('KRA updates persisted', Number(updatedKra?.weightage) === 60 && updatedKra?.status === 'Under Review');
  } catch (e) {
    assert('KRA test exception', false, e.message);
  }

  // 7. KPIs Management, Evaluation Scoring & Linkage
  console.log('\n--- 7. Testing Key Performance Indicators (KPIs) & Evaluation Scoring ---');
  const testKpiId = 'kpi_e2e_' + Date.now();
  try {
    const kpiRecord = await SheetsRepo.create('KPIs', {
      id: testKpiId,
      kra_id: testKraId,
      employee_id: 'MSA-0003',
      title: 'Complete Syllabus Modules',
      description: 'Deliver 20 interactive laboratory modules',
      target_value: 20,
      current_value: 15,
      unit: 'Modules',
      weightage: 50,
      start_date: '2026-01-01',
      due_date: '2026-06-30',
      status: 'Pending',
      evaluation_status: 'Not Started'
    }, 'MSA-0001');
    assert('KPI created linked to KRA and Employee', !!kpiRecord && kpiRecord.kra_id === testKraId && kpiRecord.employee_id === 'MSA-0003');

    SheetsRepo.invalidateCache('KPIs');
    const kpiList = await SheetsRepo.list('KPIs');
    const foundKpi = kpiList.find(k => k.id === testKpiId);
    assert('KPI persisted after cache invalidation', !!foundKpi && Number(foundKpi.target_value) === 20);

    // Test Employee Self-Evaluation
    console.log('Submitting employee self-evaluation on KPI...');
    await SheetsRepo.update('KPIs', testKpiId, {
      self_rating: 4.5,
      self_comments: '18 modules delivered with full project deliverables.',
      current_value: 18,
      status: 'In Progress',
      evaluation_status: 'Self Submitted'
    });

    SheetsRepo.invalidateCache('KPIs');
    const selfEvalKpi = await SheetsRepo.getById('KPIs', testKpiId);
    assert('Self-evaluation persisted', Number(selfEvalKpi?.self_rating) === 4.5 && selfEvalKpi?.evaluation_status === 'Self Submitted');
    assert('KPI progress updated by self-eval', Number(selfEvalKpi?.current_value) === 18 && selfEvalKpi?.status === 'In Progress');

    // Test Manager Evaluation & Score Computation
    console.log('Recording manager evaluation and calculating weighted score...');
    const target = Number(selfEvalKpi?.target_value) || 20;
    const current = Number(selfEvalKpi?.current_value) || 18;
    const managerRating = 4.8;
    // Progress % = (18 / 20) * 100 = 90%
    // Rating % = (4.8 / 5) * 100 = 96%
    // Weighted score = Math.round((90 * 0.5) + (96 * 0.5)) = 45 + 48 = 93
    const progressPct = Math.min(100, (current / target) * 100);
    const ratingPct = (managerRating / 5) * 100;
    const computedScore = Math.round((progressPct * 0.5) + (ratingPct * 0.5));
    const determinedStatus = computedScore >= 85 ? 'Achieved' : 'Partially Achieved';

    await SheetsRepo.update('KPIs', testKpiId, {
      manager_rating: managerRating,
      manager_comments: 'Superb pedagogical outcomes and mentor feedback.',
      score: computedScore,
      status: determinedStatus,
      evaluation_status: 'Evaluated',
      evaluated_by: 'MSA-0001',
      evaluated_at: new Date().toISOString()
    });

    SheetsRepo.invalidateCache('KPIs');
    const evaluatedKpi = await SheetsRepo.getById('KPIs', testKpiId);
    assert('Manager evaluation persisted', Number(evaluatedKpi?.manager_rating) === 4.8 && evaluatedKpi?.evaluation_status === 'Evaluated');
    assert('KPI weighted score calculated correctly (93)', Number(evaluatedKpi?.score) === 93 && evaluatedKpi?.status === 'Achieved');

    // Soft delete KPI and KRA
    console.log('Soft-deleting KPI and parent KRA...');
    await SheetsRepo.softDelete('KPIs', testKpiId);
    await SheetsRepo.softDelete('KRAs', testKraId);

    SheetsRepo.invalidateCache('KPIs');
    SheetsRepo.invalidateCache('KRAs');

    const finalKpiList = await SheetsRepo.list('KPIs');
    const finalKraList = await SheetsRepo.list('KRAs');
    assert('KPI soft-deletion verified', !finalKpiList.some(k => k.id === testKpiId));
    assert('KRA soft-deletion verified', !finalKraList.some(k => k.id === testKraId));
  } catch (e) {
    assert('KPI test exception', false, e.message);
  }

  // 8. Salary Structure with Statutory Overrides & Calculation
  console.log('\n--- 8. Testing Salary Structure with Statutory Overrides Persistence & Calculation ---');
  const testSalaryId = 'sal_struct_e2e_' + Date.now();
  try {
    const salaryData = {
      id: testSalaryId,
      employee_id: 'MSA-E2E-TEST',
      effective_from: '2026-01-01',
      basic: 30000,
      hra: 10000,
      allowances_json: JSON.stringify({ 'Special Allowance': 5000, 'Medical Allowance': 2500 }),
      deductions_json: JSON.stringify({}),
      pf_enabled: true,
      esi_enabled: true,
      pt_enabled: true,
      overtime_rate: 200,
      pf_cap_enabled: true, // Wage ceiling cap of Rs. 15,000 -> PF = 12% of 15,000 = 1,800
      pf_override_type: 'percent',
      pf_override_value: 12,
      esi_override_type: 'exempt', // Exempt from ESI -> ESI = 0
      pt_override_type: 'fixed',
      pt_override_value: 200 // Fixed PT = 200
    };

    const createdSalary = await SheetsRepo.create('SalaryStructures', salaryData, 'MSA-0001');
    assert('Salary structure created in SheetsRepo', !!createdSalary && createdSalary.id === testSalaryId);

    SheetsRepo.invalidateCache('SalaryStructures');
    const fetchedStructure = await SheetsRepo.getById('SalaryStructures', testSalaryId);
    assert('Salary structure persisted after cache invalidation', !!fetchedStructure && Number(fetchedStructure.basic) === 30000);
    assert('Statutory overrides preserved in storage',
      (fetchedStructure.pf_cap_enabled === true || fetchedStructure.pf_cap_enabled === 'true' || fetchedStructure.pf_cap_enabled === 'TRUE') &&
      fetchedStructure.esi_override_type === 'exempt' &&
      Number(fetchedStructure.pt_override_value) === 200
    );

    // Execute statutory calculation
    const attendanceSummary = {
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

    const calcResult1 = calculateEmployeePayroll('2026-10', fetchedStructure, attendanceSummary);
    // Gross = 30000 (basic) + 10000 (hra) + 5000 (special) + 2500 (medical) = 47500
    assert('Gross earnings calculated correctly (47500)', calcResult1.totalEarnings === 47500, `Got: ${calcResult1.totalEarnings}`);

    // Statutory deductions checks:
    const pfDeduction = calcResult1.deductions.find(d => d.name === 'Provident Fund (PF)');
    const esiDeduction = calcResult1.deductions.find(d => d.name === 'Employee State Insurance (ESI)');
    const ptDeduction = calcResult1.deductions.find(d => d.name === 'Professional Tax (PT)');

    // PF must be 1800 (15000 * 0.12) because pf_cap_enabled is true, rather than 3600 (30000 * 0.12)
    assert('PF deduction capped at statutory Rs. 15,000 ceiling (1800)', pfDeduction?.amount === 1800, `Got: ${pfDeduction?.amount}`);
    // ESI must be 0 because esi_override_type is 'exempt'
    assert('ESI deduction exempt via override (0)', !esiDeduction || esiDeduction.amount === 0, `Got: ${esiDeduction?.amount}`);
    // PT must be 200 because pt_override_type is 'fixed' with 200
    assert('PT deduction matches fixed override (200)', ptDeduction?.amount === 200, `Got: ${ptDeduction?.amount}`);

    // Total deductions = 1800 + 200 = 2000, Net Pay = 47500 - 2000 = 45500
    assert('Net Pay calculated correctly with statutory overrides (45500)', calcResult1.netPay === 45500, `Got: ${calcResult1.netPay}`);

    // Update Salary Structure overrides to test alternative override modes (e.g., fixed PF and custom PT exemption)
    console.log('Updating salary structure to test fixed PF and PT exemption overrides...');
    await SheetsRepo.update('SalaryStructures', testSalaryId, {
      pf_override_type: 'fixed',
      pf_override_value: 2200,
      pt_override_type: 'exempt',
      esi_override_type: 'fixed',
      esi_override_value: 125
    });

    SheetsRepo.invalidateCache('SalaryStructures');
    const updatedStructure = await SheetsRepo.getById('SalaryStructures', testSalaryId);
    const calcResult2 = calculateEmployeePayroll('2026-10', updatedStructure, attendanceSummary);

    const pfUpdated = calcResult2.deductions.find(d => d.name === 'Provident Fund (PF)');
    const esiUpdated = calcResult2.deductions.find(d => d.name === 'Employee State Insurance (ESI)');
    const ptUpdated = calcResult2.deductions.find(d => d.name === 'Professional Tax (PT)');

    assert('Updated PF matches fixed override (2200)', pfUpdated?.amount === 2200, `Got: ${pfUpdated?.amount}`);
    assert('Updated ESI matches fixed override (125)', esiUpdated?.amount === 125, `Got: ${esiUpdated?.amount}`);
    assert('Updated PT is exempt (0)', !ptUpdated || ptUpdated.amount === 0, `Got: ${ptUpdated?.amount}`);
    assert('Updated Net Pay reflects revised statutory overrides (45175)', calcResult2.netPay === (47500 - 2200 - 125), `Got: ${calcResult2.netPay}`);

    // Clean up test record
    await SheetsRepo.softDelete('SalaryStructures', testSalaryId);
    SheetsRepo.invalidateCache('SalaryStructures');
    const finalStructures = await SheetsRepo.list('SalaryStructures');
    assert('Salary structure soft delete verified', !finalStructures.some(s => s.id === testSalaryId));
  } catch (e) {
    assert('Salary structure test exception', false, e.message);
  }

  console.log('\n========================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
