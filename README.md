# Mastered Skill Academy (MSA) HR Management Web App & PWA

A complete, production-ready, simple-to-use HR management web application and mobile-first Progressive Web App (PWA) built for **Mastered Skill Academy** (Kerala, India).

The app uses **Google Sheets API v4** as its database and **Google Drive API v3** as its secure file storage, covering the entire employee lifecycle:

$$\text{Job Post} \longrightarrow \text{Public Apply} \longrightarrow \text{Auto Shortlist} \longrightarrow \text{Interview} \longrightarrow \text{Offer} \longrightarrow \text{Documents} \longrightarrow \text{Appoint/Join} \longrightarrow \text{Daily Selfie Attendance, Tasks, Leave \& Payroll}$$

---

## 🚀 Key Features

1. **Recruitment & Public Job Portal**:
   - Create job openings with customizable screening criteria and custom questions.
   - Generates unique public application links (`/apply/<jobSlug>`) with QR codes and one-click WhatsApp share.
   - Spam-protected registration form with live resume/photo uploads to Google Drive.
   - **One-Click Auto Screen & Shortlist**: Deterministic keyword and criteria scoring engine (Must-have skills: 40, Experience: 20, Qualification: 15, Nice-to-have: 10, Fit: 15) with transparent score breakdowns.
   - Kanban pipeline, interview scheduling with WhatsApp invitation templates, multi-round 1–5 ratings, and automated Offer Letter PDF generation.
   - **"Appoint as Employee"**: Converts candidate to active employee with a sequential `MSA-XXXX` ID, creates login credentials, and initializes Drive folders.

2. **Selfie-Only Attendance with GPS & Geofencing**:
   - Check-in and Check-out exclusively via live front camera (`getUserMedia`). Gallery uploads are blocked.
   - Real-time GPS coordinate capture, accuracy verification, and office perimeter geofencing.
   - Auto-calculated daily statuses: *Present, Late, Half Day, Absent, On Leave, Holiday, Weekly Off*.
   - Live HR monitoring dashboard with employee selfies and embedded Google Maps links.
   - Regularization request and approval workflow.

3. **Daily Tasks with Evidence**:
   - Add and assign tasks with due dates and priorities.
   - Marking **Done** strictly requires **evidence** (photo, document, or link) and a mandatory **completion remark**.
   - Evidence is automatically organized into Google Drive employee folders.
   - HR review system (*Approved* / *Needs Rework*).

4. **Leave Management & Holiday Calendar**:
   - Quotas for Casual, Sick, Earned, and Unpaid Leave with real-time balance tracking.
   - Multi-day and half-day leave applications with HR approvals.
   - Centralized Academy Holiday Calendar.

5. **Pagarbook-Style Payroll & PDF Payslips**:
   - Salary structures (Basic, HRA, named allowances, fixed deductions, PF, ESI, Professional Tax, overtime).
   - Staff ledger for salary advances, loan EMIs, bonuses, incentives, and fines. Advances & loan EMIs are automatically deducted each month.
   - Automated per-day rate and LOP (Loss of Pay) deduction calculations based on attendance.
   - Review table with editable lines before finalizing.
   - Finalize and lock monthly payroll with automated generation of official PDF payslips in Indian Rupees (INR) with number-to-words conversion.
   - Bulk download all payslips for a month as a ZIP archive.

6. **Security & Storage Layer**:
   - Role-based authorization on every endpoint (`HR Manager`, `HR Executive`, `Employee`).
   - Sensitive fields (`aadhaar_enc`, `account_no_enc`, `password_hash`) encrypted via AES-256-GCM and bcrypt (cost 12).
   - In-memory repository cache (30–60s) with write invalidation and exponential backoff retry on Google API limits.
   - Strict soft deletion (`is_deleted`) preventing data loss.
   - Zero demo/fake data. Seeded with exactly 3 administrative accounts.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, React Router, PWA via `vite-plugin-pwa`.
- **Backend**: Node.js, Express, TypeScript, PDFKit, Archiver, Zod, Helmet, CORS.
- **Database**: Google Sheets API v4 (Single spreadsheet, 23 structured tabs).
- **Storage**: Google Drive API v3 (Private hierarchical folders).
- **Authentication**: JWT with secure httpOnly cookie & Bearer token fallback.

---

## 📋 Non-Developer Setup Guide (Step-by-Step)

### Step 1: Create Google Cloud Service Account
1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a new project (e.g. `MSA-HR-System`).
2. Go to **APIs & Services** -> **Library**:
   - Search for **Google Sheets API** -> Click **Enable**.
   - Search for **Google Drive API** -> Click **Enable**.
3. Go to **APIs & Services** -> **Credentials**:
   - Click **Create Credentials** -> **Service Account**.
   - Name it `msa-hr-service-account` and click **Create and Continue**.
   - Grant role: **Editor** (or Basic -> Editor) -> Click **Done**.
4. Click on the created service account email -> Go to the **Keys** tab:
   - Click **Add Key** -> **Create new key** -> Select **JSON** -> Click **Create**.
   - A `.json` key file will download to your computer. Open it with a text editor.
   - Note the `client_email` and `private_key`.

### Step 2: Create Google Sheet & Google Drive Folder
1. **Google Sheet**:
   - Open [Google Sheets](https://sheets.new) and create a new blank spreadsheet named `Mastered Skill Academy HR Database`.
   - Copy the **Spreadsheet ID** from the browser address bar:
     `https://docs.google.com/spreadsheets/d/`**`1a2b3c4d5e6f7g8h9i0j...`**`/edit`
   - Click **Share** (top right) -> Add the `client_email` from your JSON key -> Give **Editor** permission -> Click **Send**.
2. **Google Drive Folder**:
   - Open [Google Drive](https://drive.google.com) and create a folder named `Mastered Skill Academy HR`.
   - Open the folder and copy the **Folder ID** from the address bar:
     `https://drive.google.com/drive/folders/`**`1x2y3z4a5b6c7d8e9f...`**
   - Right-click the folder -> **Share** -> Add the `client_email` -> Give **Editor** permission -> Click **Send**.

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` in the root folder:
```bash
cp .env.example .env
```
Fill in the credentials from Step 1 and Step 2:
```env
PORT=5000
NODE_ENV=production
APP_URL=http://localhost:3000

JWT_SECRET=your_super_secret_jwt_key_here
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

GOOGLE_SERVICE_ACCOUNT_EMAIL=msa-hr-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_DRIVE_FOLDER_ID=your_drive_folder_id_here

SEED_HR_MANAGER_EMAIL=hrmanager@masteredskill.com
SEED_HR_MANAGER_PASSWORD=MsaManager@2026#

SEED_HR_EXEC_EMAIL=hrexec@masteredskill.com
SEED_HR_EXEC_PASSWORD=MsaExec@2026#

SEED_EMPLOYEE_EMAIL=employee@masteredskill.com
SEED_EMPLOYEE_PASSWORD=MsaStaff@2026#
```

### Step 4: Run the One-Time Setup Script
Run the automated initialization script to create all 23 database tabs with headers, default settings, and exactly 3 seeded user accounts:
```bash
npm run setup
```

### Step 5: Start the App
- **For Development**:
  ```bash
  npm run dev
  ```
- **For Production Build**:
  ```bash
  npm run build
  npm run start
  ```
The app will be available at `http://localhost:5000` (or `http://localhost:3000` in dev).

---

## 🔑 Initial Default Accounts

| Role | Email | Default Password | Access Level |
|---|---|---|---|
| **HR Manager** | `hrmanager@masteredskill.com` | `MsaManager@2026#` | Full Administrator (Payroll, Staff, Settings, Approvals) |
| **HR Executive** | `hrexec@masteredskill.com` | `MsaExec@2026#` | Recruitment, Screening, Interviews, Tasks, Attendance |
| **Employee** | `employee@masteredskill.com` | `MsaStaff@2026#` | Profile, Selfie Punch, Daily Tasks, Leave, Payslips |

*Note: All users will be prompted to change their temporary password on their first login.*

---

## 🌐 Deploying to Render

1. Push this repository to GitHub.
2. Log in to [Render](https://render.com) and click **New +** -> **Blueprint**.
3. Select your GitHub repository. Render will automatically read `render.yaml`.
4. Under Environment Variables, input your `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SPREADSHEET_ID`, and `GOOGLE_DRIVE_FOLDER_ID`.
5. Click **Apply**. Render will install, build both client and server, and deploy your live app over HTTPS.

---

## 📱 Android APK & Mobile Installation

- Refer to [`APK_GUIDE.md`](./APK_GUIDE.md) for generating signed Android APK & Play Store AAB bundles using PWABuilder or Bubblewrap CLI.
- Refer to [`USER_GUIDE.md`](./USER_GUIDE.md) for role-by-role usage walkthroughs.

---

## 🧪 Automated Testing

To run the automated test suite verifying the Scoring Engine, Payroll Calculations, Attendance Geofence Logic, and Role Middleware:
```bash
npm test
```
