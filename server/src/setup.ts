import { getSheetsClient } from './services/googleAuth';
import { DriveStorage } from './services/driveStorage';
import { SHEET_COLUMNS, SheetsRepo } from './services/sheetsRepo';
import { config } from './config/env';
import { hashPassword } from './utils/crypto';
import { User, Employee, Setting, LeaveType } from './types';

async function runSetup() {
  console.log('----------------------------------------------------');
  console.log('🚀 Starting Mastered Skill Academy HR Setup Script');
  console.log('----------------------------------------------------');

  const spreadsheetId = config.googleSpreadsheetId;
  if (!spreadsheetId) {
    console.error('❌ Error: GOOGLE_SPREADSHEET_ID is not set in environment variables.');
    process.exit(1);
  }

  const sheets = getSheetsClient();

  // 1. Fetch existing sheet tabs in spreadsheet
  console.log('📊 Fetching spreadsheet metadata...');
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = (meta.data.sheets || []).map(s => s.properties?.title || '');

  console.log(`Found ${existingTitles.length} existing tab(s):`, existingTitles.join(', '));

  // 2. Create missing tabs
  const tabNames = Object.keys(SHEET_COLUMNS);
  const requests: any[] = [];

  for (const tab of tabNames) {
    if (!existingTitles.includes(tab)) {
      requests.push({
        addSheet: {
          properties: { title: tab }
        }
      });
    }
  }

  if (requests.length > 0) {
    console.log(`Creating ${requests.length} missing tab(s)...`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    });
    console.log('✅ Tabs created successfully.');
  }

  // 3. Write / Update Headers for all tabs
  console.log('📝 Writing table column headers...');
  const headerData = tabNames.map(tab => ({
    range: `${tab}!A1`,
    values: [SHEET_COLUMNS[tab]]
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: headerData
    }
  });
  console.log('✅ Column headers initialized for all 23 tabs.');

  // 4. Initialize Default Settings (Configuration only, not demo data)
  console.log('⚙️ Initializing default Settings...');
  const existingSettings = await SheetsRepo.list<Setting>('Settings');
  if (existingSettings.length === 0) {
    const defaultSettings: [string, string][] = [
      ['company_name', 'Mastered Skill Academy'],
      ['company_address', 'Kerala, India'],
      ['company_email', 'hr@masteredskill.com'],
      ['company_phone', '+91 98765 43210'],
      ['office_start_time', '09:30'],
      ['office_end_time', '18:00'],
      ['grace_minutes', '15'],
      ['min_hours_present', '8'],
      ['min_hours_half_day', '4'],
      ['office_lat', '10.0159'],
      ['office_lng', '76.3419'],
      ['geofence_radius', '200'],
      ['block_outside_geofence', 'false'],
      ['shortlist_threshold', '60'],
      ['offer_letter_template', 'We are pleased to offer you the position at Mastered Skill Academy. We look forward to having you on board.']
    ];

    for (const [key, value] of defaultSettings) {
      await SheetsRepo.create<Setting>('Settings', { key, value }, 'setup_script');
    }
    console.log('✅ Default settings configured.');
  } else {
    console.log('ℹ️ Settings tab already has configuration. Skipping.');
  }

  // 5. Initialize Leave Types
  console.log('🏖️ Initializing Leave Types...');
  const existingLeaveTypes = await SheetsRepo.list<LeaveType>('LeaveTypes');
  if (existingLeaveTypes.length === 0) {
    const defaultLeaves = [
      { name: 'Casual Leave', yearly_quota: 12, paid: true, carry_forward: false },
      { name: 'Sick Leave', yearly_quota: 10, paid: true, carry_forward: true },
      { name: 'Earned Leave', yearly_quota: 15, paid: true, carry_forward: true },
      { name: 'Unpaid Leave', yearly_quota: 30, paid: false, carry_forward: false }
    ];

    for (const l of defaultLeaves) {
      await SheetsRepo.create<LeaveType>('LeaveTypes', l, 'setup_script');
    }
    console.log('✅ Default leave types created.');
  }

  // 6. Seed exactly 3 accounts (HR Manager, HR Executive, Employee)
  console.log('👥 Seeding initial 3 user accounts...');
  const existingUsers = await SheetsRepo.list<User>('Users');

  if (existingUsers.length === 0) {
    const managerPassHash = await hashPassword(config.seedHrManagerPassword);
    const execPassHash = await hashPassword(config.seedHrExecPassword);
    const employeePassHash = await hashPassword(config.seedEmployeePassword);

    // 1. HR Manager
    await SheetsRepo.create<Employee>('Employees', {
      employee_id: 'MSA-0001',
      full_name: 'HR Administrator',
      phone: '+919000000001',
      email: config.seedHrManagerEmail,
      dob: '1990-01-01',
      gender: 'Female',
      address: 'Kerala, India',
      emergency_name: 'Admin Contact',
      emergency_relation: 'Self',
      emergency_phone: '+919000000001',
      designation: 'HR Manager',
      department: 'Human Resources',
      role: 'HR Manager',
      employment_type: 'Full-time',
      joining_date: '2025-01-01',
      work_location: 'Kerala Campus',
      status: 'Active'
    }, 'setup_script');

    await SheetsRepo.create<User>('Users', {
      employee_id: 'MSA-0001',
      email: config.seedHrManagerEmail,
      phone: '+919000000001',
      password_hash: managerPassHash,
      role: 'HR Manager',
      must_change_password: true,
      is_active: true
    }, 'setup_script');

    // 2. HR Executive
    await SheetsRepo.create<Employee>('Employees', {
      employee_id: 'MSA-0002',
      full_name: 'Recruitment Executive',
      phone: '+919000000002',
      email: config.seedHrExecEmail,
      dob: '1993-05-15',
      gender: 'Male',
      address: 'Kerala, India',
      emergency_name: 'Exec Contact',
      emergency_relation: 'Self',
      emergency_phone: '+919000000002',
      designation: 'HR Executive',
      department: 'Human Resources',
      role: 'HR Executive',
      employment_type: 'Full-time',
      joining_date: '2025-02-01',
      work_location: 'Kerala Campus',
      status: 'Active'
    }, 'setup_script');

    await SheetsRepo.create<User>('Users', {
      employee_id: 'MSA-0002',
      email: config.seedHrExecEmail,
      phone: '+919000000002',
      password_hash: execPassHash,
      role: 'HR Executive',
      must_change_password: true,
      is_active: true
    }, 'setup_script');

    // 3. Employee
    await SheetsRepo.create<Employee>('Employees', {
      employee_id: 'MSA-0003',
      full_name: 'Staff Member',
      phone: '+919000000003',
      email: config.seedEmployeeEmail,
      dob: '1996-08-20',
      gender: 'Female',
      address: 'Kerala, India',
      emergency_name: 'Staff Contact',
      emergency_relation: 'Family',
      emergency_phone: '+919000000003',
      designation: 'Faculty / Trainer',
      department: 'Academics',
      role: 'Employee',
      employment_type: 'Full-time',
      joining_date: '2025-03-01',
      work_location: 'Kerala Campus',
      status: 'Active'
    }, 'setup_script');

    await SheetsRepo.create<User>('Users', {
      employee_id: 'MSA-0003',
      email: config.seedEmployeeEmail,
      phone: '+919000000003',
      password_hash: employeePassHash,
      role: 'Employee',
      must_change_password: true,
      is_active: true
    }, 'setup_script');

    console.log('✅ Exactly 3 user accounts seeded successfully with temporary passwords.');
  } else {
    console.log('ℹ️ Users tab already initialized. Skipping user seeding.');
  }

  // 7. Initialize Google Drive Folder Hierarchy
  console.log('📁 Initializing Google Drive folders...');
  try {
    const rootFolderId = await DriveStorage.getOrCreateFolder('Mastered Skill Academy HR');
    await Promise.all([
      DriveStorage.getOrCreateFolder('Recruitment', rootFolderId),
      DriveStorage.getOrCreateFolder('Employees', rootFolderId),
      DriveStorage.getOrCreateFolder('Templates', rootFolderId)
    ]);
    console.log('✅ Google Drive folder hierarchy verified.');
  } catch (driveErr) {
    console.warn('⚠️ Google Drive folder setup notice (check credentials if live):', driveErr);
  }

  console.log('----------------------------------------------------');
  console.log('🎉 Setup Completed Successfully!');
  console.log('Initial Login Accounts:');
  console.log(`1. HR Manager:   ${config.seedHrManagerEmail} (Password: ${config.seedHrManagerPassword})`);
  console.log(`2. HR Executive: ${config.seedHrExecEmail} (Password: ${config.seedHrExecPassword})`);
  console.log(`3. Employee:     ${config.seedEmployeeEmail} (Password: ${config.seedEmployeePassword})`);
  console.log('----------------------------------------------------');
}

runSetup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
