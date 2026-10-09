import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getSheetsClient } from './googleAuth';
import { config } from '../config/env';
import { BaseEntity, User, Employee, Setting, LeaveType } from '../types';
import { hashPassword } from '../utils/crypto';

export const SHEET_COLUMNS: Record<string, string[]> = {
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

import os from 'os';

// Local storage directory & file
function getStorageDir(sub: string): string {
  try {
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      return path.join(os.tmpdir(), 'msa_hr', sub);
    }
    return path.resolve(process.cwd(), 'server', sub);
  } catch {
    return path.join(os.tmpdir(), 'msa_hr', sub);
  }
}

const DATA_DIR = getStorageDir('data');
const LOCAL_DB_FILE = path.join(DATA_DIR, 'local_db.json');

interface LocalDB {
  [tabName: string]: any[];
}

let localStore: LocalDB | null = null;
let isInitialized = false;

function createInitialStore(): LocalDB {
  const store: LocalDB = {};
  for (const tab of Object.keys(SHEET_COLUMNS)) {
    store[tab] = [];
  }

  const now = new Date().toISOString();

  // 1. HR Manager
  store.Employees.push({
    id: 'emp_001',
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
    status: 'Active',
    created_at: now,
    updated_at: now,
    created_by: 'system_seed',
    is_deleted: false
  });

  store.Users.push({
    id: 'user_001',
    employee_id: 'MSA-0001',
    email: config.seedHrManagerEmail,
    phone: '+919000000001',
    password_hash: '$2a$10$JgiO8iePWbh7YaxZHIACf.JjaO0LrPzmOleucXRPcXMqwkW1AVjyq', // MsaManager@2026#
    role: 'HR Manager',
    must_change_password: false,
    is_active: true,
    created_at: now,
    updated_at: now,
    created_by: 'system_seed',
    is_deleted: false
  });

  // 2. HR Executive
  store.Employees.push({
    id: 'emp_002',
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
    status: 'Active',
    created_at: now,
    updated_at: now,
    created_by: 'system_seed',
    is_deleted: false
  });

  store.Users.push({
    id: 'user_002',
    employee_id: 'MSA-0002',
    email: config.seedHrExecEmail,
    phone: '+919000000002',
    password_hash: '$2a$10$Rdyx.QmWrpdxv9cqGy460eAngm1rRIbPWLFq.nCodPlsdJrmFDGxS', // MsaExec@2026#
    role: 'HR Executive',
    must_change_password: false,
    is_active: true,
    created_at: now,
    updated_at: now,
    created_by: 'system_seed',
    is_deleted: false
  });

  // 3. Employee
  store.Employees.push({
    id: 'emp_003',
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
    status: 'Active',
    created_at: now,
    updated_at: now,
    created_by: 'system_seed',
    is_deleted: false
  });

  store.Users.push({
    id: 'user_003',
    employee_id: 'MSA-0003',
    email: config.seedEmployeeEmail,
    phone: '+919000000003',
    password_hash: '$2a$10$liZklLR864lyzuNNz9bMQeV90WQUWFfShrYNJp7RwH6DonhW9Ya7u', // MsaStaff@2026#
    role: 'Employee',
    must_change_password: false,
    is_active: true,
    created_at: now,
    updated_at: now,
    created_by: 'system_seed',
    is_deleted: false
  });

  // Settings
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
    store.Settings.push({
      id: `set_${key}`,
      key,
      value,
      created_at: now,
      updated_at: now,
      created_by: 'system_seed',
      is_deleted: false
    });
  }

  // Leave Types
  const defaultLeaves = [
    { name: 'Casual Leave', yearly_quota: 12, paid: true, carry_forward: false },
    { name: 'Sick Leave', yearly_quota: 10, paid: true, carry_forward: true },
    { name: 'Earned Leave', yearly_quota: 15, paid: true, carry_forward: true },
    { name: 'Unpaid Leave', yearly_quota: 30, paid: false, carry_forward: false }
  ];

  for (const l of defaultLeaves) {
    store.LeaveTypes.push({
      id: `lt_${l.name.toLowerCase().replace(/\s+/g, '_')}`,
      ...l,
      created_at: now,
      updated_at: now,
      created_by: 'system_seed',
      is_deleted: false
    });
  }

  return store;
}

function ensureLocalStore(): LocalDB {
  if (localStore) return localStore;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(LOCAL_DB_FILE)) {
      const content = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.Users) && parsed.Users.length > 0) {
        localStore = parsed;
        return localStore!;
      }
    }
  } catch (e) {
    console.warn('[SheetsRepo] Read notice for local db (using in-memory):', (e as any)?.message);
  }

  localStore = createInitialStore();
  saveLocalStore();
  return localStore;
}

function saveLocalStore() {
  if (!localStore) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(localStore, null, 2), 'utf-8');
  } catch (err) {
    // In-memory active
  }
}

export async function autoSeedInitialData() {
  ensureLocalStore();
}

export class SheetsRepo {
  private static invalidateCache(_tabName: string) {
    // Local in-memory sync
  }

  static async list<T extends BaseEntity>(tabName: string, includeDeleted = false): Promise<T[]> {
    const store = ensureLocalStore();
    const items = (store[tabName] || []) as T[];
    return includeDeleted ? [...items] : items.filter(i => !i.is_deleted || String(i.is_deleted).toLowerCase() === 'false');
  }

  static async getById<T extends BaseEntity>(tabName: string, id: string): Promise<T | null> {
    const list = await this.list<T>(tabName);
    return list.find(item => item.id === id) || null;
  }

  static async find<T extends BaseEntity>(
    tabName: string,
    predicate: (item: T) => boolean
  ): Promise<T[]> {
    const list = await this.list<T>(tabName);
    return list.filter(predicate);
  }

  static async create<T extends BaseEntity>(
    tabName: string,
    data: Partial<T>,
    createdBy = 'system'
  ): Promise<T> {
    const nowIso = new Date().toISOString();

    const record: any = {
      ...data,
      id: data.id || uuidv4(),
      created_at: data.created_at || nowIso,
      updated_at: data.updated_at || nowIso,
      created_by: createdBy,
      is_deleted: false
    };

    const store = ensureLocalStore();
    if (!store[tabName]) store[tabName] = [];
    store[tabName].push(record);
    saveLocalStore();

    this.invalidateCache(tabName);
    return record as T;
  }

  static async update<T extends BaseEntity>(
    tabName: string,
    id: string,
    data: Partial<T>,
    updatedBy = 'system'
  ): Promise<T | null> {
    const nowIso = new Date().toISOString();
    const store = ensureLocalStore();
    if (!store[tabName]) store[tabName] = [];
    
    const localIdx = store[tabName].findIndex((i: any) => i.id === id);
    if (localIdx >= 0) {
      store[tabName][localIdx] = {
        ...store[tabName][localIdx],
        ...data,
        updated_at: nowIso
      };
      saveLocalStore();
      this.invalidateCache(tabName);
      return store[tabName][localIdx] as T;
    }

    return null;
  }

  static async softDelete<T extends BaseEntity>(tabName: string, id: string): Promise<boolean> {
    const updated = await this.update<T>(tabName, id, { is_deleted: true } as any);
    return !!updated;
  }

  static async batchGetTabs(tabNames: string[]): Promise<Record<string, any[]>> {
    const result: Record<string, any[]> = {};
    for (const tab of tabNames) {
      result[tab] = await this.list(tab);
    }
    return result;
  }
}

