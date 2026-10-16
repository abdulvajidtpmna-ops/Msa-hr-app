// Use built-in fetch

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzUrEzvvlCjDDHTJJH94zRGWpqX525ekwMS3LeM5QiECO5rRVlkQJu7VGj1vivffSz_/exec';

async function testAppsScriptMutations() {
  console.log('=== TEST 1: Update Employee emp_001 in Google Sheets ===');
  try {
    const updateRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        tabName: 'Employees',
        id: 'emp_001',
        data: { blood_group: 'O+' }
      }),
      redirect: 'follow'
    });
    console.log('Update status:', updateRes.status);
    const updateJson = await updateRes.json();
    console.log('Update response:', updateJson);
  } catch (e) {
    console.error('Update failed:', e.message);
  }

  console.log('\n=== TEST 2: Verify emp_001 from Google Sheets ===');
  try {
    const listRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', tabName: 'Employees' }),
      redirect: 'follow'
    });
    const listJson = await listRes.json();
    const emp1 = listJson?.data?.find(e => e.id === 'emp_001');
    console.log('emp_001 after update:', {
      id: emp1?.id,
      employee_id: emp1?.employee_id,
      full_name: emp1?.full_name,
      blood_group: emp1?.blood_group
    });
  } catch (e) {
    console.error('Verify failed:', e.message);
  }

  console.log('\n=== TEST 3: Create & List in ExitRequests tab ===');
  const testExitId = 'test_exit_' + Date.now();
  try {
    const createRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        tabName: 'ExitRequests',
        data: {
          id: testExitId,
          employee_id: 'MSA-0003',
          employee_name: 'Staff Member',
          department: 'Academics',
          designation: 'Faculty / Trainer',
          request_type: 'Resignation',
          resignation_date: '2026-10-16',
          notice_period_days: 30,
          proposed_last_working_day: '2026-11-15',
          reason: 'Career Growth',
          reason_details: 'Test submission for verification',
          status: 'Pending Review',
          dept_clearance: false,
          it_clearance: false,
          finance_clearance: false,
          admin_clearance: false,
          exit_interview_status: 'Pending',
          fnf_status: 'Pending',
          relieving_letter_issued: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'test_runner',
          is_deleted: false
        }
      }),
      redirect: 'follow'
    });
    console.log('Create ExitRequest status:', createRes.status);
    const createJson = await createRes.json();
    console.log('Create ExitRequest response:', createJson);

    // List ExitRequests
    const listExits = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', tabName: 'ExitRequests' }),
      redirect: 'follow'
    });
    const exitData = await listExits.json();
    console.log('ExitRequests list count:', exitData?.data?.length);
    const found = exitData?.data?.find(x => x.id === testExitId);
    console.log('Found created ExitRequest in Google Sheets:', !!found, found?.status);

    // Delete test record
    if (found) {
      const delRes = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', tabName: 'ExitRequests', id: testExitId }),
        redirect: 'follow'
      });
      const delJson = await delRes.json();
      console.log('Cleaned up test record:', delJson);
    }
  } catch (e) {
    console.error('ExitRequests test failed:', e.message);
  }
}

testAppsScriptMutations();
