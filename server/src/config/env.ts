import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config(); // fallback to current dir .env

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'msa_hr_jwt_super_secret_key_change_in_production_2026',
  encryptionKey: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // 32-byte hex
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  
  // Google Sheets & Drive credentials
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
  googlePrivateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  googleSpreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '',
  googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
  
  // Seed User Passwords
  seedHrManagerEmail: process.env.SEED_HR_MANAGER_EMAIL || 'hrmanager@masteredskill.com',
  seedHrManagerPassword: process.env.SEED_HR_MANAGER_PASSWORD || 'MsaManager@2026#',
  seedHrExecEmail: process.env.SEED_HR_EXEC_EMAIL || 'hrexec@masteredskill.com',
  seedHrExecPassword: process.env.SEED_HR_EXEC_PASSWORD || 'MsaExec@2026#',
  seedEmployeeEmail: process.env.SEED_EMPLOYEE_EMAIL || 'employee@masteredskill.com',
  seedEmployeePassword: process.env.SEED_EMPLOYEE_PASSWORD || 'MsaStaff@2026#',

  // Optional SMTP
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'no-reply@masteredskill.com'
};
