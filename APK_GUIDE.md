# Android APK & AAB Packaging Guide for Mastered Skill Academy HR (MSA HR)

This guide provides step-by-step instructions for generating a signed **Android APK (for direct installation on staff phones)** and **Google Play Store AAB (Android App Bundle)** from the deployed MSA HR Progressive Web App (PWA).

---

## Prerequisites & Requirements

1. **Production HTTPS URL**: The MSA HR app must be deployed and served over **HTTPS** (e.g., `https://msa-hr.onrender.com`). Modern Android camera (`getUserMedia`) and GPS Geolocation APIs strictly require a secure HTTPS origin.
2. **Web App Manifest**: Pre-configured in `/client/vite.config.ts` with name `"MSA HR"`, standalone display mode, orientation, theme color `#166534`, and 192x192 / 512x512 icons.
3. **Android Device Requirements**: Android 8.0 (Oreo) or higher with Google Chrome / Android System WebView.

---

## Option 1: PWABuilder (Recommended & Easiest — 3 Minutes)

PWABuilder is Microsoft's open-source tool that wraps your PWA into a native Android APK using Google's Trusted Web Activity (TWA).

### Step-by-Step Instructions:

1. Deploy your MSA HR application to Render, Railway, or your custom domain and copy the HTTPS URL (e.g., `https://msa-hr.onrender.com`).
2. Open [https://www.pwabuilder.com](https://www.pwabuilder.com) in your web browser.
3. Paste your URL into the input box and click **Start**.
4. PWABuilder will analyze your PWA manifest, service worker, and security. Ensure all checkmarks pass.
5. Click **Package For Stores** (or **Package Android**).
6. In the Android configuration modal:
   - **Package ID**: `com.masteredskill.hr`
   - **App Name**: `MSA HR`
   - **Short Name**: `MSA HR`
   - **Theme Color**: `#166534`
   - **Background Color**: `#ffffff`
   - **Nav Bar Color**: `#166534`
   - **Signing Key**: Select *Create New* (or let PWABuilder generate one). Download and safely store the generated `.keystore` file and password for future app updates.
7. Click **Generate Package**.
8. Download the resulting `.zip` file:
   - Inside the zip you will find:
     - `app-release-signed.apk`: Ready for direct sideloading / WhatsApp sharing to employee phones.
     - `app-release.aab`: Ready for publishing on Google Play Console.
     - `assetlinks.json`: Digital asset link verification file.

---

## Option 2: Bubblewrap CLI (Advanced Command Line TWA)

If you prefer building locally using Android SDK / CLI:

### 1. Install Bubblewrap CLI:
```bash
npm install -g @bubblewrap/cli
```

### 2. Initialize the Android Project:
```bash
bubblewrap init --manifest=https://your-domain.com/manifest.webmanifest
```
Bubblewrap will download the manifest and prompt for:
- Domain: `your-domain.com`
- Package Name: `com.masteredskill.hr`
- App Name: `MSA HR`
- KeyStore location and password

### 3. Build Signed APK & AAB:
```bash
bubblewrap build
```
The output APK (`app-release-signed.apk`) will be created in the current folder.

---

## Digital Asset Links Verification (`assetlinks.json`)

To remove the Chrome browser URL address bar in the installed Android APK and provide a 100% native full-screen experience:

1. Retrieve the SHA-256 fingerprint from your keystore:
   ```bash
   keytool -list -v -keystore my-release-key.keystore
   ```
2. Create or verify the `assetlinks.json` file on your server at:
   `https://your-domain.com/.well-known/assetlinks.json`
   ```json
   [
     {
       "relation": ["delegate_permission/common.handle_all_urls"],
       "target": {
         "namespace": "android_app",
         "package_name": "com.masteredskill.hr",
         "sha256_cert_fingerprints": [
           "YOUR_SHA256_FINGERPRINT_HERE_IN_CAPS_HEX"
         ]
       }
     }
   ]
   ```

---

## Camera & GPS Permissions in Android

When employees launch the installed APK for the first time and click **Punch Attendance**:
1. Android will display standard system runtime permission prompts:
   - *"Allow MSA HR to access camera?"* -> Tap **While using the app**
   - *"Allow MSA HR to access this device's location?"* -> Tap **Precise** and **While using the app**
2. In-app camera and GPS will seamlessly lock coordinates and stream front-camera selfie snapshots to Google Drive.

---

## Distributing the APK to Staff

- **Direct Download Link**: Host `msa-hr.apk` on your server or share via institute WhatsApp broadcast.
- **Instruct staff**: Tap on the downloaded APK -> Allow "Install from unknown sources" for Chrome/Files -> Tap **Install**.
