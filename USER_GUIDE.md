# Mastered Skill Academy (MSA) HR App — User Guide

This guide outlines step-by-step instructions for each of the three user roles in the MSA HR system.

---

## 1. Staff Employee Guide

### First Login & Password Change
1. Open the app link on your phone browser or open the installed **MSA HR** app.
2. Enter your **Employee ID** (e.g., `MSA-0003`) or **Email** and your temporary password provided by HR.
3. Upon first login, a prompt will appear requiring you to set your own **new secure password** (minimum 8 characters).
4. Click **Save New Password & Continue**.

### Daily Selfie Attendance Check-IN & Check-OUT
1. Tap the **Punch** icon in the bottom navigation bar.
2. Allow browser permissions for **Camera** and **Location (GPS)** when prompted.
3. Align your face in the camera circle and tap **Take Selfie**.
4. The system automatically fetches your GPS coordinates and verifies office proximity.
5. Tap **Check IN** when starting your work day.
6. When leaving at the end of the day, open the screen and tap **Check OUT**.

### Logging Daily Tasks with Evidence
1. Tap the **Tasks** icon in the bottom navigation bar.
2. To create your own task for the day, tap **+ Add Task**, enter the title and priority, and save.
3. When you complete a task, tap **Mark Done**.
4. **Enter a completion remark** explaining what was done.
5. **Upload evidence**: Take/upload a photo of your work, upload a document, or paste a link. Evidence and remarks are mandatory.
6. Tap **Submit Evidence & Mark as Done**.

### Applying for Leave
1. Tap the **Leave** icon in the bottom navigation bar.
2. View your yearly remaining balances for Casual, Sick, Earned, or Unpaid Leave.
3. Tap **Apply Leave**, select the leave type and dates, choose full-day or half-day, enter the reason, and tap **Submit**.
4. You will see the approval status updated once reviewed by HR.

### Viewing & Downloading Payslips
1. Tap **Payroll & Slips** from the side menu or dashboard.
2. View all your monthly salary slips.
3. Tap **View Details** to see attendance days, gross salary, PF/ESI/PT deductions, and take-home pay.
4. Tap **Download PDF** to save an official computer-generated PDF payslip.

---

## 2. HR Executive Guide

### Creating Job Postings
1. Navigate to **Hiring** in the navigation bar.
2. Tap **+ Create Job Opening**.
3. Fill in Job Title, Department, Location, Vacancies, Minimum Experience, and Qualification.
4. Set **Auto-Shortlisting Screening Rules**:
   - Must-Have Skills (comma-separated, mandatory keyword match)
   - Nice-to-Have Skills (bonus scoring)
   - Shortlist Threshold Score (default 60%)
5. Optionally add custom questions (e.g. Yes/No, dropdowns).
6. Tap **Publish Job**.
7. Tap **Copy Apply Link** or open the **QR Code** to share with candidates on hiring posters or WhatsApp.

### Screening Candidates & Auto-Shortlisting
1. Tap **View Candidate Pipeline** or open the **Recruitment** tab.
2. Click **Auto Screen & Shortlist** to automatically score all new candidates against the job criteria.
   - Candidates scoring $\ge$ 60% with all must-have skills are moved to **Shortlisted**.
   - Candidates missing required criteria are moved to **Screened Out** with transparent reasons shown.
3. Click on any candidate to inspect their match score breakdown, answers, and resume.

### Scheduling Interviews & Recording Feedback
1. In the candidate details view, click **Schedule Interview**.
2. Select Date, Time, Mode (In-person/Video), and Venue.
3. Copy the generated WhatsApp invitation text to send to the candidate.
4. After conducting the interview, click **Record Feedback**:
   - Rate Communication, Technical Skill, Attitude, and Overall (1 to 5 stars).
   - Select Recommendation: **Hire**, **Hold**, or **Reject**.
   - Save feedback.

### Document Collection Checklist
1. Track submitted onboarding documents (Aadhaar, PAN, certificates, bank passbook).
2. Mark documents as received and verified.

---

## 3. HR Manager Guide (Administrator)

### Appointing Candidates as Employees
1. Open a candidate who has accepted their offer and completed document checks.
2. Click the **Appoint as Employee** button.
3. Select their assigned role (e.g., *Employee* or *HR Executive*).
4. The system automatically:
   - Generates the next sequential Employee ID (e.g., `MSA-0004`)
   - Creates the Employee profile and Drive folder
   - Generates a temporary login password
   - Moves candidate status to **Joined**
5. Copy the generated credentials to share with the new employee.

### Monthly Payroll Calculation & Finalization
1. Navigate to **Payroll & Slips** -> **Monthly Payroll Run**.
2. Select the month (e.g., `2026-03`) and click **Calculate Preview**.
3. The system pulls attendance records (present days, half days, paid leaves, holidays) and calculates:
   - Per-day rate ($\text{Gross} / \text{Days}$)
   - LOP (Loss of Pay) deductions for absent days
   - Statutory PF, ESI, and Professional Tax
   - Automatic deduction of pending salary advances and loan EMIs
4. Review the table and adjust any line item if necessary.
5. Click **Finalize & Lock Month** to seal the payroll run and automatically generate all official PDF payslips into Google Drive.
6. Click **Bulk Download ZIP** to download all staff payslips for the month in one file.
7. Click **Mark Month Paid** once bank transfers are completed.

### Managing Salary Advances & Loans
1. Go to **Advances & Ledger**.
2. Select a staff member and click **+ Add Advance / Loan / Bonus**.
3. Enter amount and monthly EMI recovery. The system will auto-deduct the EMI on each payroll run until the balance reaches zero.

### Academy & System Settings
1. Open **Settings** from the side menu.
2. Update Academy Name, Address, and HR email.
3. Set Office Start Time, Grace Minutes, and Minimum Working Hours.
4. Set Office GPS Coordinates and Geofence Radius in meters.
5. Customize Offer Letter default terms and text.
