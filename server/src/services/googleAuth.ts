import { google } from 'googleapis';
import { config } from '../config/env';

let sheetsClient: ReturnType<typeof google.sheets> | null = null;
let driveClient: ReturnType<typeof google.drive> | null = null;

export function getGoogleAuth() {
  if (!config.googleServiceAccountEmail || !config.googlePrivateKey) {
    console.warn('Google Service Account credentials not provided in environment variables.');
  }

  const auth = new google.auth.JWT({
    email: config.googleServiceAccountEmail,
    key: config.googlePrivateKey,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  });

  return auth;
}

export function getSheetsClient() {
  if (!sheetsClient) {
    const auth = getGoogleAuth();
    sheetsClient = google.sheets({ version: 'v4', auth });
  }
  return sheetsClient;
}

export function getDriveClient() {
  if (!driveClient) {
    const auth = getGoogleAuth();
    driveClient = google.drive({ version: 'v3', auth });
  }
  return driveClient;
}
