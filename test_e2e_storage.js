const { SheetsRepo } = require('./server/dist/services/sheetsRepo');

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
