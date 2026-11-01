# Google Apps Script Changes & Deployment Report
**Application**: Mastered Skill Academy (MSA) HR Management System  
**Backend Component**: Google Apps Script Web App (`google_apps_script.js`)  
**Target Spreadsheet**: MSA HR Database  
**Author**: Quality Assurance / Test Engineering Team  
**Date**: October 31, 2026  
**Status**: Verified & Ready for Production Deployment  

---

## 1. Executive Summary

This report documents all structural and architectural changes introduced to `google_apps_script.js` to support:
1. **Key Result Areas (KRAs) & Key Performance Indicators (KPIs)** management, assignment, tracking, and weighted scoring evaluation.
2. **Statutory Salary Structure Overrides** (PF wage ceiling cap at ₹15,000, ESI overrides and exemptions, Professional Tax configurable overrides).
3. **Resignation & Exit Management** persistence with multi-department clearance tracking.
4. **Resilient Dynamic Column Expansion** in `createTabRecord` and `updateTabRecord` allowing backward- and forward-compatible schema growth without manual sheet schema resets.

All changes have been implemented directly in `google_apps_script.js` in the repository root and verified end-to-end against live Google Apps Script web endpoints.

---

## 2. Table Schema Changes (`SHEET_COLUMNS`)

The database table registry (`SHEET_COLUMNS`) in `google_apps_script.js` was expanded from **23 to 26 data tables**.

```javascript
// 26 Data Tables for Complete MSA HR Platform
var SHEET_COLUMNS = {
  Users: [...],
  Employees: [...],
  ...
  ExitRequests: [...],
  Settings: [...],
  AuditLog: [...],
  KRAs: [...],  // NEW TABLE
  KPIs: [...]   // NEW TABLE
};
```

### 2.1. New Table: `KRAs` (Key Result Areas)
* **Sheet Name**: `KRAs`
* **Column Count**: 14 columns
* **Column Order & Header Specifications**:
  1. `title`: Short descriptive title of the Key Result Area (e.g., "Academic Excellence & Curriculum Delivery").
  2. `description`: Detailed goals, deliverables, and performance benchmarks.
  3. `department`: Target department (e.g., "Academics", "Human Resources", "Marketing", or "All Departments").
  4. `designation`: Target designation (e.g., "Faculty / Trainer" or "All Designations").
  5. `assigned_to`: Assignee identifier — either `'ALL'` for company/department-wide KRAs, or specific `employee_id` (e.g., `'MSA-0003'`).
  6. `assigned_by`: `employee_id` of the HR Manager / Administrator creating or assigning the KRA.
  7. `period`: Appraisal cycle or timeframe (e.g., `"2026"`, `"Q1 2026"`, `"2025-2026"`).
  8. `weightage`: Integer percentage weight of the KRA in the overall appraisal (e.g., `50`).
  9. `status`: Current lifecycle status (`'Active'`, `'Draft'`, `'Under Review'`, `'Completed'`, `'Archived'`).
  10. `id`: Unique primary key string (e.g., `kra_1730360000`).
  11. `created_at`: ISO 8601 creation timestamp.
  12. `updated_at`: ISO 8601 last modified timestamp.
  13. `created_by`: User identifier who created the record.
  14. `is_deleted`: Soft-delete flag (`'FALSE'` or `'TRUE'`).

### 2.2. New Table: `KPIs` (Key Performance Indicators)
* **Sheet Name**: `KPIs`
* **Column Count**: 23 columns
* **Column Order & Header Specifications**:
  1. `kra_id`: Foreign key reference pointing to the parent record in the `KRAs` tab.
  2. `employee_id`: Employee identifier assigned to achieve this indicator (e.g., `'MSA-0003'`).
  3. `title`: Specific measurable KPI title (e.g., "Course Module Completion Rate").
  4. `description`: Milestone requirements and measurement criteria.
  5. `target_value`: Numeric or quantifiable target (e.g., `25`, `100`).
  6. `current_value`: Quantifiable progress achieved to date (e.g., `23`).
  7. `unit`: Measurement unit (e.g., `'%'`, `'Modules'`, `'Workshops'`, `'Hours'`, `'Count'`).
  8. `weightage`: Weight of this KPI within the parent KRA (e.g., `50`).
  9. `start_date`: Start date of the measurement interval (`YYYY-MM-DD`).
  10. `due_date`: Due / target date (`YYYY-MM-DD`).
  11. `status`: Achievement status (`'Pending'`, `'In Progress'`, `'Achieved'`, `'Partially Achieved'`, `'Missed'`).
  12. `self_rating`: Employee self-evaluation rating on a 1.0 to 5.0 scale.
  13. `self_comments`: Notes, evidence remarks, or deliverables provided by the employee.
  14. `manager_rating`: Evaluator / Manager rating on a 1.0 to 5.0 scale.
  15. `manager_comments`: Qualitative evaluation remarks provided by the reviewer.
  16. `score`: Calculated weighted score (0–100) combining progress completion % and manager rating %.
  17. `evaluation_status`: Evaluation lifecycle state (`'Not Started'`, `'Self Submitted'`, `'Evaluated'`, `'Approved'`).
  18. `evaluated_by`: `employee_id` of the reviewing manager or HR administrator.
  19. `evaluated_at`: ISO 8601 evaluation timestamp.
  20. `id`: Unique primary key string (e.g., `kpi_1730360000`).
  21. `created_at`: ISO 8601 creation timestamp.
  22. `updated_at`: ISO 8601 last modified timestamp.
  23. `created_by`: User identifier who created the record.
  24. `is_deleted`: Soft-delete flag (`'FALSE'` or `'TRUE'`).

### 2.3. Updated Tables
* **`Employees` Tab**: Added `blood_group` to the column list (`SHEET_COLUMNS.Employees`) to persist medical/emergency blood group information for all staff.
* **`ExitRequests` Tab**: Registered 37 schema columns supporting employee resignations, notice periods, departmental clearances (`dept_clearance`, `it_clearance`, `finance_clearance`, `admin_clearance`), exit interview feedback, and Full & Final (FnF) settlement tracking.
* **`SalaryStructures` Tab**: Supported via dynamic column expansion for statutory overrides (`pf_cap_enabled`, `pf_override_type`, `pf_override_value`, `esi_override_type`, `esi_override_value`, `pt_override_type`, `pt_override_value`), ensuring flexible configuration without breaking legacy rows.

---

## 3. Function & Engine Enhancements

### 3.1. Tab Auto-Provisioning (`setupAllTabs()`)
* Automatically iterates across all 26 registered tables in `SHEET_COLUMNS`.
* Inserts any missing sheets (including `KRAs` and `KPIs`) seamlessly without affecting existing data sheets.
* Sets header rows with MSA Brand Emerald Green (`#166534`), white bold typography, and freezes row 1.
* Cleans up default empty "Sheet1" sheets created on new spreadsheets.

### 3.2. Standardized Header Formatting Helper (`formatHeaderRow`)
* Modularized helper function to style and freeze header rows consistently on dynamically created sheets:
  ```javascript
  function formatHeaderRow(sheet, colCount) {
    if (!sheet || !colCount) return;
    var headerRange = sheet.getRange(1, 1, 1, colCount);
    headerRange.setBackground('#166534'); // MSA Brand Emerald Green
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  ```

### 3.3. Dynamic Column Auto-Expansion (`createTabRecord` & `updateTabRecord`)
* In `createTabRecord(tabName, itemData)`:
  - Dynamically inspects the properties of incoming objects.
  - Automatically appends missing column headers to Row 1 (`sheet.getRange(1, lastCol + 1, 1, newKeys.length).setValues([newKeys])`).
  - Ensures new features (such as statutory override parameters) can write new fields without manual spreadsheet schema migrations.
* In `updateTabRecord(tabName, id, updates)`:
  - Automatically expands the header row if update payloads contain newly configured columns.
  - Supports dual primary-key resolution: matches records by either `id` or `employee_id`.
  - Adjusts array length safely with empty cell buffers to prevent out-of-bounds spreadsheet range errors.

---

## 4. Step-by-Step Administrator Deployment Instructions

Follow these instructions to deploy the updated `google_apps_script.js` code to your Google Spreadsheet backend.

### Prerequisites
* Access to the Google account owning the **MSA HR Database** Google Spreadsheet.
* Web browser with Google Workspace access.

---

### Step 1: Open Apps Script Project
1. Open your Google Spreadsheet (**MSA HR Database**) in Google Sheets.
2. In the top navigation bar, click on **Extensions** > **Apps Script**.
3. A new browser tab will open showing the Apps Script editor with `Code.gs`.

### Step 2: Paste the Updated Code
1. Open `google_apps_script.js` from the MSA HR project root on your local computer.
2. Select and copy the **entire file contents** (Ctrl+A, Ctrl+C).
3. In the Google Apps Script editor, clear any existing code in `Code.gs` (Ctrl+A, Delete).
4. Paste the copied code into `Code.gs` (Ctrl+V).
5. Click the **Save project** icon (floppy disk) or press Ctrl+S.

### Step 3: Run Setup to Provision New Tabs
1. In the Apps Script toolbar, locate the **Run** dropdown menu (which lists available functions).
2. Select the function **`setupAllTabs`** from the dropdown.
3. Click the **Run** button.
4. **Authorization Prompt** (if this is the first run or scopes have changed):
   - A dialog titled *"Authorization Required"* will appear. Click **Review Permissions**.
   - Select your Google account.
   - If Google displays *"Google hasn't verified this app"*, click **Advanced** at the bottom left, then click **Go to Untitled project (unsafe)**.
   - Click **Allow** to grant permissions for Spreadsheets and Drive access.
5. In the Execution log at the bottom, verify the output:
   ```text
   Execution started
   All 26 MSA HR tabs initialized successfully.
   Execution completed
   ```
6. Switch back to your Google Spreadsheet tab. Confirm that two new tabs named **`KRAs`** and **`KPIs`** now appear at the bottom with emerald green header formatting.

### Step 4: Deploy the Web App
1. In the Apps Script editor, click the blue **Deploy** button in the top right corner.
2. Select **Manage deployments**.
3. In the Manage deployments modal:
   - Click the **Edit** (pencil) icon next to the active deployment.
   - Under **Version**, select **New version**.
   - In the **Description** field, enter: `Version with KRAs, KPIs, and Statutory Overrides`.
   - Ensure **Execute as** is set to: `Me (<your-email>)`.
   - Ensure **Who has access** is set to: `Anyone`.
   - Click **Deploy**.
4. Copy the resulting **Web app URL** (format: `https://script.google.com/macros/s/AKfycb.../exec`).
5. Click **Done**.

### Step 5: Update Application Environment Variables
1. On your hosting platform (Vercel, Railway, or local development `.env`):
   - Locate the variable `GOOGLE_APPS_SCRIPT_URL`.
   - Update it with your Web app URL:
     ```env
     GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_NEW_DEPLOYMENT_ID/exec
     ```
2. Restart the Node.js backend server or redeploy your hosting environment.

---

## 5. Post-Deployment Verification Checklist

Verify that the deployment was successful by performing the following checks:

| # | Check Description | Verification Method | Expected Result |
|---|-------------------|---------------------|-----------------|
| 1 | **API Ping Check** | Open Web App URL in browser: `<URL>?action=ping` | `{"success":true,"message":"MSA HR Apps Script API is running"}` |
| 2 | **KRAs Tab Initialized** | View Google Spreadsheet tabs | Sheet `KRAs` exists with 14 emerald green columns |
| 3 | **KPIs Tab Initialized** | View Google Spreadsheet tabs | Sheet `KPIs` exists with 23 emerald green columns |
| 4 | **Employees Blood Group** | Check Column AJ in `Employees` sheet | Header `blood_group` exists |
| 5 | **E2E Storage Integration** | Run `node test_e2e_storage.js` | 27+ assertions pass with 0 failures |
| 6 | **Server Test Suite** | Run `npm.cmd --prefix server run test` | All Jest suites pass cleanly |
| 7 | **Production Build** | Run `npm.cmd run build` | Client bundle & TypeScript server compile without errors |
| 8 | **In-App Performance View** | Log in as HR Manager and navigate to `/performance` | KRAs and KPIs load, add modal creates records in Sheets |
| 9 | **Interactive Salary Slip** | Navigate to `/payroll` and view/print payslip | Statutory PF cap (₹15k) and overrides apply accurately |

---

## 6. Rollback Procedures

If an unexpected error occurs during deployment:
1. In the Apps Script editor, select **Deploy** > **Manage deployments**.
2. Select the previous active deployment version.
3. Switch the deployment back to the previous version and click **Deploy**.
4. The previous stable deployment URL will remain active and serve traffic without data disruption.
