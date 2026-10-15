# 🚀 Setting Up MSA HR with Google Apps Script (Fast & Easy)

Google Apps Script allows your MSA HR Application to use **Google Sheets as its database** and **Google Drive as its file storage** without needing to configure Google Cloud Platform (GCP) or Service Account keys.

---

## ⚡ 60-Second Setup Guide

### Step 1: Create a Google Spreadsheet
1. Open [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Name it **"MSA HR Database"** (or any name you prefer).

---

### Step 2: Open the Script Editor
1. In the top menu of your Google Sheet, click **Extensions** &rarr; **Apps Script**.
2. A new tab will open with a code editor showing `Code.gs`.
3. Select all code inside `Code.gs` and delete it.
4. Open the file [`google_apps_script.js`](file:///c:/Users/user/Desktop/Msa%20hr%20app/google_apps_script.js) from this repository, copy its entire contents, and paste it into `Code.gs`.
5. Click the **Save (💾)** icon in the toolbar.

---

### Step 3: Run the One-Time Database Initialization
1. In the toolbar at the top of the Apps Script editor, look at the function dropdown (next to "Debug").
2. Select **`setupAllTabs`** and click **Run**.
3. Google will ask for authorization:
   * Click **Review permissions**.
   * Choose your Google account.
   * Click **Advanced** &rarr; click **"Go to Untitled project (unsafe)"**.
   * Click **Allow**.
4. The script will run for ~5 seconds.
5. Go back to your Google Sheet: You will see all **23 HR tabs** created with headers, styling, seed accounts, and your Google Drive folders (`Mastered Skill Academy HR/Recruitment`, `Employees`, `Templates`) ready!

---

### Step 4: Deploy as a Web App
1. At the top right of the Apps Script editor, click the blue **Deploy** button &rarr; **New deployment**.
2. Click the **Gear icon (⚙️)** next to "Select type" &rarr; select **Web app**.
3. Configure the settings:
   * **Description**: `MSA HR Production API`
   * **Execute as**: `Me (your Google email)`
   * **Who has access**: `Anyone` *(Crucial so your Vercel web app can communicate with it)*
4. Click **Deploy**.
5. Copy the generated **Web app URL**. It looks like:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```

---

### Step 5: Connect It to Your HR App

#### In Vercel (Live App):
1. Go to your [Vercel Dashboard](https://vercel.com) &rarr; Select your project (`Msa-hr-app`).
2. Go to **Settings** &rarr; **Environment Variables**.
3. Add a new variable:
   * **Key**: `GOOGLE_APPS_SCRIPT_URL`
   * **Value**: `https://script.google.com/macros/s/AKfycbx.../exec` *(Paste the URL from Step 4)*
4. Click **Save** and trigger a redeployment.

#### Locally (for testing):
In your `.env` file in the project root:
```env
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbx.../exec
```

---

## 🔒 Master Seed Login Credentials

Once initialized, the default accounts are:
* **HR Manager**: `hrmanager@masteredskill.com` &bull; Password: `MsaManager@2026#`
* **HR Executive**: `hrexec@masteredskill.com` &bull; Password: `MsaExec@2026#`
* **Employee**: `employee@masteredskill.com` &bull; Password: `MsaStaff@2026#`

---

## 💡 Spreadsheet Menu Shortcut
Whenever you open your Google Sheet, there is a dedicated menu in the top bar:
**🚀 MSA HR System**
* **Initialize All 23 Database Tabs**: Re-checks and ensures all tables exist.
* **Seed Master User Accounts**: Adds master admin users if missing.
* **Setup Google Drive Folders**: Creates the Drive folder structure.
* **Health Check & Stats**: Displays live record count and active tabs.
