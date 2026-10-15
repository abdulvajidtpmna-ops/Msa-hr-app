/**
 * =========================================================================================
 * MASTERED SKILL ACADEMY (MSA) HR MANAGEMENT SYSTEM - GOOGLE APPS SCRIPT WEB APP BACKEND
 * =========================================================================================
 * 
 * Instructions:
 * 1. Create a new Google Spreadsheet in your Google Drive (e.g. named "MSA HR Database").
 * 2. In Google Sheets, click "Extensions" > "Apps Script".
 * 3. Delete any default code in Code.gs and paste this entire file.
 * 4. In the top toolbar, select function "setupAllTabs" and click "Run" (Authorize permissions when prompted).
 * 5. Click "Deploy" > "New deployment".
 * 6. Under "Select type" click the Gear icon > "Web app".
 * 7. Set:
 *      - Description: "MSA HR Production API"
 *      - Execute as: "Me (your email)"
 *      - Who has access: "Anyone"
 * 8. Click "Deploy" and copy the "Web app URL" (ends in /exec).
 * 9. In your .env file or Vercel Environment Variables, set:
 *      GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
 * =========================================================================================
 */

// 23 Data Tables for Complete MSA HR Platform
var SHEET_COLUMNS = {
  Users: ['employee_id', 'email', 'phone', 'password_hash', 'role', 'must_change_password', 'is_active', 'last_login', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  Employees: ['employee_id', 'full_name', 'photo_url', 'phone', 'email', 'dob', 'gender', 'address', 'emergency_name', 'emergency_relation', 'emergency_phone', 'designation', 'department', 'role', 'employment_type', 'joining_date', 'reporting_manager_id', 'work_location', 'probation_end', 'status', 'pan', 'aadhaar_enc', 'bank_name', 'account_no_enc', 'ifsc', 'uan', 'esi_no', 'exit_date', 'exit_reason', 'drive_folder_id', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  EmployeeDocs: ['employee_id', 'doc_type', 'file_name', 'drive_file_id', 'drive_url', 'uploaded_by', 'verified', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  Jobs: ['title', 'slug', 'department', 'location', 'type', 'vacancies', 'description', 'responsibilities', 'qualification', 'min_experience', 'required_skills', 'preferred_skills', 'salary_range', 'last_date', 'status', 'form_config_json', 'criteria_json', 'threshold', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  Applications: ['job_id', 'ref_no', 'full_name', 'phone', 'email', 'dob', 'gender', 'location', 'qualification', 'specialization', 'experience_years', 'current_employer', 'skills', 'current_salary', 'expected_salary', 'notice_period', 'why_join', 'custom_answers_json', 'resume_drive_id', 'photo_drive_id', 'score', 'score_breakdown_json', 'status', 'hr_notes', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  ApplicationStatusLog: ['application_id', 'from_status', 'to_status', 'remark', 'changed_by', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  Interviews: ['application_id', 'round', 'date', 'time', 'mode', 'location_or_link', 'interviewers', 'status', 'ratings_json', 'remarks', 'recommendation', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  Offers: ['application_id', 'designation', 'department', 'role', 'joining_date', 'salary_json', 'probation_months', 'offer_pdf_drive_id', 'status', 'accepted_on', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  OnboardingDocs: ['application_id', 'doc_type', 'received', 'drive_file_id', 'received_on', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  Attendance: ['employee_id', 'date', 'in_time', 'in_lat', 'in_lng', 'in_accuracy', 'in_selfie_drive_id', 'out_time', 'out_lat', 'out_lng', 'out_accuracy', 'out_selfie_drive_id', 'status', 'geofence_flag', 'device_info', 'regularized', 'remark', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  AttendanceRequests: ['employee_id', 'date', 'requested_in', 'requested_out', 'reason', 'status', 'reviewed_by', 'review_remark', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  LeaveTypes: ['name', 'yearly_quota', 'paid', 'carry_forward', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  LeaveBalances: ['employee_id', 'leave_type_id', 'year', 'opening', 'used', 'balance', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  LeaveRequests: ['employee_id', 'leave_type_id', 'from_date', 'to_date', 'half_day', 'days', 'reason', 'attachment_id', 'status', 'reviewed_by', 'review_remark', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  Holidays: ['date', 'name', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  SalaryStructures: ['employee_id', 'effective_from', 'basic', 'hra', 'allowances_json', 'deductions_json', 'pf_enabled', 'esi_enabled', 'pt_enabled', 'overtime_rate', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  Transactions: ['employee_id', 'type', 'amount', 'emi_amount', 'balance', 'date', 'remark', 'status', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  PayrollRuns: ['month', 'status', 'finalized_by', 'finalized_at', 'paid_on', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  Payslips: ['payroll_run_id', 'employee_id', 'month', 'attendance_json', 'earnings_json', 'deductions_json', 'gross', 'total_deductions', 'net_pay', 'net_in_words', 'pdf_drive_id', 'paid_status', 'paid_on', 'mode', 'reference', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  Tasks: ['title', 'description', 'task_date', 'due_date', 'priority', 'category', 'assigned_to', 'assigned_by', 'status', 'completion_remark', 'review_status', 'review_remark', 'completed_at', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  TaskUpdates: ['task_id', 'employee_id', 'update_type', 'status_from', 'status_to', 'remark', 'evidence_json', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  Settings: ['key', 'value', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted'],
  AuditLog: ['actor_id', 'action', 'entity', 'entity_id', 'before_json', 'after_json', 'ip', 'timestamp', 'id', 'created_at', 'updated_at', 'created_by', 'is_deleted']
};

/**
 * Custom UI menu inside Google Sheets
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 MSA HR System')
    .addItem('Initialize All 23 Database Tabs', 'setupAllTabs')
    .addItem('Seed Master User Accounts', 'seedMasterUsers')
    .addItem('Setup Google Drive Folders', 'setupDriveFolders')
    .addSeparator()
    .addItem('Health Check & Stats', 'showHealthStats')
    .addToUi();
}

/**
 * Initializes all 23 tabs, headers, styling, and removes default blank sheet
 */
function setupAllTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabs = Object.keys(SHEET_COLUMNS);
  
  for (var i = 0; i < tabs.length; i++) {
    var tabName = tabs[i];
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    }
    
    // Set headers
    var columns = SHEET_COLUMNS[tabName];
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
    
    // Format header row
    var headerRange = sheet.getRange(1, 1, 1, columns.length);
    headerRange.setBackground('#166534'); // MSA Brand Emerald Green
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  
  // Clean default Sheet1 if exists and other sheets present
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1) {
    try { ss.deleteSheet(sheet1); } catch (e) {}
  }
  
  seedMasterUsers();
  setupDriveFolders();
  
  return { success: true, message: 'All 23 MSA HR tabs initialized successfully.' };
}

/**
 * Seeds initial accounts, settings, and leave types if empty
 */
function seedMasterUsers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var now = new Date().toISOString();
  
  // 1. Check Users tab
  var usersSheet = ss.getSheetByName('Users');
  var empSheet = ss.getSheetByName('Employees');
  
  if (usersSheet && usersSheet.getLastRow() <= 1) {
    var initialEmployees = [
      ['MSA-0001', 'HR Administrator', '', '+919000000001', 'hrmanager@masteredskill.com', '1990-01-01', 'Female', 'Kerala, India', 'Admin Contact', 'Self', '+919000000001', 'HR Manager', 'Human Resources', 'HR Manager', 'Full-time', '2025-01-01', '', 'Kerala Campus', '', 'Active', '', '', '', '', '', '', '', '', '', '', 'emp_001', now, now, 'system_seed', 'FALSE'],
      ['MSA-0002', 'Recruitment Executive', '', '+919000000002', 'hrexec@masteredskill.com', '1993-05-15', 'Male', 'Kerala, India', 'Exec Contact', 'Self', '+919000000002', 'HR Executive', 'Human Resources', 'HR Executive', 'Full-time', '2025-02-01', '', 'Kerala Campus', '', 'Active', '', '', '', '', '', '', '', '', '', '', 'emp_002', now, now, 'system_seed', 'FALSE'],
      ['MSA-0003', 'Staff Member', '', '+919000000003', 'employee@masteredskill.com', '1996-08-20', 'Female', 'Kerala, India', 'Staff Contact', 'Family', '+919000000003', 'Faculty / Trainer', 'Academics', 'Employee', 'Full-time', '2025-03-01', '', 'Kerala Campus', '', 'Active', '', '', '', '', '', '', '', '', '', '', 'emp_003', now, now, 'system_seed', 'FALSE']
    ];
    
    var initialUsers = [
      ['MSA-0001', 'hrmanager@masteredskill.com', '+919000000001', '$2a$10$JgiO8iePWbh7YaxZHIACf.JjaO0LrPzmOleucXRPcXMqwkW1AVjyq', 'HR Manager', 'FALSE', 'TRUE', '', 'user_001', now, now, 'system_seed', 'FALSE'],
      ['MSA-0002', 'hrexec@masteredskill.com', '+919000000002', '$2a$10$Rdyx.QmWrpdxv9cqGy460eAngm1rRIbPWLFq.nCodPlsdJrmFDGxS', 'HR Executive', 'FALSE', 'TRUE', '', 'user_002', now, now, 'system_seed', 'FALSE'],
      ['MSA-0003', 'employee@masteredskill.com', '+919000000003', '$2a$10$liZklLR864lyzuNNz9bMQeV90WQUWFfShrYNJp7RwH6DonhW9Ya7u', 'Employee', 'FALSE', 'TRUE', '', 'user_003', now, now, 'system_seed', 'FALSE']
    ];
    
    for (var i = 0; i < initialEmployees.length; i++) {
      empSheet.appendRow(initialEmployees[i]);
      usersSheet.appendRow(initialUsers[i]);
    }
  }
  
  // 2. Settings tab
  var setSheet = ss.getSheetByName('Settings');
  if (setSheet && setSheet.getLastRow() <= 1) {
    var defaultSettings = [
      ['company_name', 'Mastered Skill Academy', 'set_1', now, now, 'system_seed', 'FALSE'],
      ['company_address', 'Kerala, India', 'set_2', now, now, 'system_seed', 'FALSE'],
      ['company_email', 'hr@masteredskill.com', 'set_3', now, now, 'system_seed', 'FALSE'],
      ['company_phone', '+91 98765 43210', 'set_4', now, now, 'system_seed', 'FALSE'],
      ['office_start_time', '09:30', 'set_5', now, now, 'system_seed', 'FALSE'],
      ['office_end_time', '18:00', 'set_6', now, now, 'system_seed', 'FALSE'],
      ['grace_minutes', '15', 'set_7', now, now, 'system_seed', 'FALSE'],
      ['min_hours_present', '8', 'set_8', now, now, 'system_seed', 'FALSE'],
      ['min_hours_half_day', '4', 'set_9', now, now, 'system_seed', 'FALSE'],
      ['office_lat', '10.0159', 'set_10', now, now, 'system_seed', 'FALSE'],
      ['office_lng', '76.3419', 'set_11', now, now, 'system_seed', 'FALSE'],
      ['geofence_radius', '200', 'set_12', now, now, 'system_seed', 'FALSE'],
      ['block_outside_geofence', 'false', 'set_13', now, now, 'system_seed', 'FALSE'],
      ['shortlist_threshold', '60', 'set_14', now, now, 'system_seed', 'FALSE']
    ];
    for (var s = 0; s < defaultSettings.length; s++) {
      setSheet.appendRow(defaultSettings[s]);
    }
  }
  
  // 3. Leave Types tab
  var leaveSheet = ss.getSheetByName('LeaveTypes');
  if (leaveSheet && leaveSheet.getLastRow() <= 1) {
    var defaultLeaves = [
      ['Casual Leave', '12', 'TRUE', 'FALSE', 'lt_cl', now, now, 'system_seed', 'FALSE'],
      ['Sick Leave', '10', 'TRUE', 'TRUE', 'lt_sl', now, now, 'system_seed', 'FALSE'],
      ['Earned Leave', '15', 'TRUE', 'TRUE', 'lt_el', now, now, 'system_seed', 'FALSE'],
      ['Unpaid Leave', '30', 'FALSE', 'FALSE', 'lt_ul', now, now, 'system_seed', 'FALSE']
    ];
    for (var l = 0; l < defaultLeaves.length; l++) {
      leaveSheet.appendRow(defaultLeaves[l]);
    }
  }
}

/**
 * Creates folder structure in Google Drive
 */
function setupDriveFolders() {
  try {
    var root = getOrCreateFolder('Mastered Skill Academy HR');
    getOrCreateFolder('Recruitment', root);
    getOrCreateFolder('Employees', root);
    getOrCreateFolder('Templates', root);
  } catch (err) {}
}

function getOrCreateFolder(name, parent) {
  var folders = parent ? parent.getFoldersByName(name) : DriveApp.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parent ? parent.createFolder(name) : DriveApp.createFolder(name);
}

function showHealthStats() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabs = Object.keys(SHEET_COLUMNS);
  var totalRows = 0;
  for (var i = 0; i < tabs.length; i++) {
    var sheet = ss.getSheetByName(tabs[i]);
    if (sheet) {
      totalRows += (sheet.getLastRow() - 1 > 0 ? sheet.getLastRow() - 1 : 0);
    }
  }
  SpreadsheetApp.getUi().alert('MSA HR System Status:\nTabs: ' + tabs.length + ' active\nTotal Records: ' + totalRows);
}

/**
 * GET Web App handler
 */
function doGet(e) {
  try {
    var params = e && e.parameter ? e.parameter : {};
    var action = params.action || 'ping';
    
    if (action === 'ping') {
      return jsonResponse({ success: true, message: 'MSA HR Apps Script API is running' });
    }
    
    if (action === 'list') {
      var tabName = params.tab || params.tabName;
      var data = listTabRecords(tabName);
      return jsonResponse({ success: true, data: data });
    }
    
    if (action === 'batchGet') {
      var tabNamesStr = params.tabs || '';
      var tabNames = tabNamesStr ? tabNamesStr.split(',') : Object.keys(SHEET_COLUMNS);
      var result = {};
      for (var i = 0; i < tabNames.length; i++) {
        var t = tabNames[i].trim();
        if (t) result[t] = listTabRecords(t);
      }
      return jsonResponse({ success: true, data: result });
    }
    
    return jsonResponse({ success: false, error: 'Unknown GET action: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * POST Web App handler (Main API bridge)
 */
function doPost(e) {
  try {
    var contents = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var payload = JSON.parse(contents);
    var action = payload.action;
    
    if (action === 'ping') {
      return jsonResponse({ success: true, message: 'Pong from MSA HR Apps Script' });
    }
    
    if (action === 'setup') {
      var setupRes = setupAllTabs();
      return jsonResponse(setupRes);
    }
    
    if (action === 'list') {
      var listData = listTabRecords(payload.tabName || payload.tab);
      return jsonResponse({ success: true, data: listData });
    }
    
    if (action === 'batchGet') {
      var bTabs = payload.tabNames || Object.keys(SHEET_COLUMNS);
      var bResult = {};
      for (var b = 0; b < bTabs.length; b++) {
        var tab = bTabs[b];
        bResult[tab] = listTabRecords(tab);
      }
      return jsonResponse({ success: true, data: bResult });
    }
    
    if (action === 'create') {
      var createdItem = createTabRecord(payload.tabName || payload.tab, payload.data);
      return jsonResponse({ success: true, data: createdItem });
    }
    
    if (action === 'update') {
      var updatedItem = updateTabRecord(payload.tabName || payload.tab, payload.id, payload.data);
      return jsonResponse({ success: true, data: updatedItem });
    }
    
    if (action === 'delete') {
      var deletedOk = deleteTabRecord(payload.tabName || payload.tab, payload.id);
      return jsonResponse({ success: true, deleted: deletedOk });
    }
    
    if (action === 'uploadFile') {
      var uploadRes = uploadBase64File(payload.fileName, payload.mimeType, payload.base64, payload.folderName);
      return jsonResponse({ success: true, data: uploadRes });
    }
    
    return jsonResponse({ success: false, error: 'Unsupported POST action: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Lists rows of a tab as JSON objects
 */
function listTabRecords(tabName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];
  
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var columns = SHEET_COLUMNS[tabName] || [];
  
  var items = [];
  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    if (!row || row.length === 0 || row[0] === '') continue;
    
    var obj = { _rowIndex: r + 2 };
    for (var c = 0; c < columns.length; c++) {
      var key = columns[c];
      var cellVal = row[c];
      
      if (cellVal === undefined || cellVal === null) cellVal = '';
      if (cellVal === true || cellVal === 'TRUE' || cellVal === 'true') cellVal = true;
      else if (cellVal === false || cellVal === 'FALSE' || cellVal === 'false') cellVal = false;
      
      obj[key] = cellVal;
    }
    items.push(obj);
  }
  return items;
}

/**
 * Appends record into tab
 */
function createTabRecord(tabName, itemData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    var cols = SHEET_COLUMNS[tabName] || [];
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
  }
  
  var columns = SHEET_COLUMNS[tabName] || [];
  var rowValues = [];
  
  for (var i = 0; i < columns.length; i++) {
    var col = columns[i];
    var val = itemData[col];
    if (val === undefined || val === null) val = '';
    else if (typeof val === 'boolean') val = val ? 'TRUE' : 'FALSE';
    else if (typeof val === 'object') val = JSON.stringify(val);
    else val = String(val);
    rowValues.push(val);
  }
  
  sheet.appendRow(rowValues);
  return itemData;
}

/**
 * Updates existing record by ID
 */
function updateTabRecord(tabName, id, updates) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return null;
  
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return null;
  
  var columns = SHEET_COLUMNS[tabName] || [];
  var idColIdx = columns.indexOf('id');
  if (idColIdx === -1) idColIdx = 0;
  
  var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  for (var r = 0; r < values.length; r++) {
    if (String(values[r][idColIdx]) === String(id)) {
      var targetRow = r + 2;
      var currentRowData = values[r];
      
      for (var c = 0; c < columns.length; c++) {
        var col = columns[c];
        if (updates[col] !== undefined) {
          var val = updates[col];
          if (val === undefined || val === null) val = '';
          else if (typeof val === 'boolean') val = val ? 'TRUE' : 'FALSE';
          else if (typeof val === 'object') val = JSON.stringify(val);
          else val = String(val);
          currentRowData[c] = val;
        }
      }
      
      sheet.getRange(targetRow, 1, 1, columns.length).setValues([currentRowData]);
      return updates;
    }
  }
  return null;
}

/**
 * Soft deletes record by ID
 */
function deleteTabRecord(tabName, id) {
  return !!updateTabRecord(tabName, id, { is_deleted: 'TRUE' });
}

/**
 * Uploads a base64 encoded file into target Google Drive folder
 */
function uploadBase64File(fileName, mimeType, base64Content, targetFolderName) {
  var root = getOrCreateFolder('Mastered Skill Academy HR');
  var targetFolder = targetFolderName ? getOrCreateFolder(targetFolderName, root) : root;
  
  var bytes = Utilities.base64Decode(base64Content);
  var blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', fileName);
  var file = targetFolder.createFile(blob);
  
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}
  
  return {
    fileId: file.getId(),
    fileName: file.getName(),
    size: file.getSize(),
    mimeType: file.getMimeType(),
    webViewLink: file.getUrl(),
    downloadUrl: file.getDownloadUrl()
  };
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
