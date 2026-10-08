export type UserRole = 'HR Manager' | 'HR Executive' | 'Employee';

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_deleted: boolean | string;
}

export interface User extends BaseEntity {
  employee_id: string;
  email: string;
  phone: string;
  password_hash: string;
  role: UserRole;
  must_change_password: boolean | string;
  is_active: boolean | string;
  last_login?: string;
}

export interface Employee extends BaseEntity {
  employee_id: string;
  full_name: string;
  photo_url?: string;
  phone: string;
  email: string;
  dob: string;
  gender: string;
  address: string;
  emergency_name: string;
  emergency_relation: string;
  emergency_phone: string;
  designation: string;
  department: string;
  role: UserRole;
  employment_type: 'Full-time' | 'Part-time' | 'Contract' | 'Intern' | string;
  joining_date: string;
  reporting_manager_id?: string;
  work_location: string;
  probation_end?: string;
  status: 'Active' | 'Probation' | 'Notice' | 'Resigned' | 'Terminated';
  pan?: string;
  aadhaar_enc?: string;
  bank_name?: string;
  account_no_enc?: string;
  ifsc?: string;
  uan?: string;
  esi_no?: string;
  exit_date?: string;
  exit_reason?: string;
  drive_folder_id?: string;
}

export interface EmployeeDoc extends BaseEntity {
  employee_id: string;
  doc_type: string;
  file_name: string;
  drive_file_id: string;
  drive_url?: string;
  uploaded_by: string;
  verified: boolean | string;
}

export interface JobCriteria {
  must_have_skills: string[];
  nice_to_have_skills: string[];
  min_experience: number;
  required_qualification: string;
  preferred_locations?: string[];
  max_expected_salary?: number;
  max_notice_period?: number;
  threshold_score: number;
}

export interface CustomFieldConfig {
  id: string;
  label: string;
  type: 'short_text' | 'long_text' | 'number' | 'dropdown' | 'yes_no';
  required: boolean;
  options?: string[]; // for dropdown
}

export interface Job extends BaseEntity {
  title: string;
  slug: string;
  department: string;
  location: string;
  type: string;
  vacancies: number | string;
  description: string;
  responsibilities: string;
  qualification: string;
  min_experience: number | string;
  required_skills: string; // comma separated or JSON array string
  preferred_skills: string;
  salary_range?: string;
  last_date: string;
  status: 'Draft' | 'Open' | 'Closed';
  form_config_json?: string; // CustomFieldConfig[]
  criteria_json?: string; // JobCriteria
  threshold: number | string;
}

export type ApplicationStatus =
  | 'Applied'
  | 'Screened'
  | 'Shortlisted'
  | 'Interview Scheduled'
  | 'Interviewed'
  | 'Selected'
  | 'Offer Sent'
  | 'Offer Accepted'
  | 'Documents Collected'
  | 'Joined'
  | 'On Hold'
  | 'Rejected'
  | 'Withdrawn'
  | 'No Show';

export interface ScoreBreakdown {
  total_score: number;
  passed_hard_criteria: boolean;
  disqualification_reasons: string[];
  must_have_score: number;
  experience_score: number;
  qualification_score: number;
  nice_to_have_score: number;
  fit_score: number;
  details: {
    matched_must_have: string[];
    missing_must_have: string[];
    matched_nice_to_have: string[];
    experience_years: number;
    experience_required: number;
    qualification_candidate: string;
    qualification_required: string;
    salary_fit: boolean;
    notice_fit: boolean;
    location_fit: boolean;
  };
}

export interface Application extends BaseEntity {
  job_id: string;
  ref_no: string;
  full_name: string;
  phone: string;
  email: string;
  dob: string;
  gender: string;
  location: string;
  qualification: string;
  specialization: string;
  experience_years: number | string;
  current_employer?: string;
  skills: string;
  current_salary?: number | string;
  expected_salary?: number | string;
  notice_period?: number | string;
  why_join?: string;
  custom_answers_json?: string;
  resume_drive_id: string;
  photo_drive_id?: string;
  score: number | string;
  score_breakdown_json?: string; // ScoreBreakdown
  status: ApplicationStatus;
  hr_notes?: string;
}

export interface ApplicationStatusLog extends BaseEntity {
  application_id: string;
  from_status: string;
  to_status: string;
  remark: string;
  changed_by: string;
}

export interface InterviewRating {
  communication: number; // 1-5
  technical_skill: number; // 1-5
  attitude: number; // 1-5
  overall: number; // 1-5
}

export interface Interview extends BaseEntity {
  application_id: string;
  round: number | string;
  date: string;
  time: string;
  mode: 'In-person' | 'Phone' | 'Video';
  location_or_link: string;
  interviewers: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled' | 'No Show';
  ratings_json?: string; // InterviewRating
  remarks?: string;
  recommendation?: 'Hire' | 'Hold' | 'Reject';
}

export interface Offer extends BaseEntity {
  application_id: string;
  designation: string;
  department: string;
  role: UserRole;
  joining_date: string;
  salary_json: string; // breakdown
  probation_months: number | string;
  offer_pdf_drive_id?: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined';
  accepted_on?: string;
}

export interface OnboardingDoc extends BaseEntity {
  application_id: string;
  doc_type: string;
  received: boolean | string;
  drive_file_id?: string;
  received_on?: string;
}

export interface Attendance extends BaseEntity {
  employee_id: string;
  date: string; // YYYY-MM-DD
  in_time?: string;
  in_lat?: number | string;
  in_lng?: number | string;
  in_accuracy?: number | string;
  in_selfie_drive_id?: string;
  out_time?: string;
  out_lat?: number | string;
  out_lng?: number | string;
  out_accuracy?: number | string;
  out_selfie_drive_id?: string;
  status: 'Present' | 'Half Day' | 'Late' | 'Absent' | 'On Leave' | 'Holiday' | 'Weekly Off';
  geofence_flag?: 'Inside' | 'Outside location' | string;
  device_info?: string;
  regularized?: boolean | string;
  remark?: string;
}

export interface AttendanceRequest extends BaseEntity {
  employee_id: string;
  date: string;
  requested_in?: string;
  requested_out?: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewed_by?: string;
  review_remark?: string;
}

export interface LeaveType extends BaseEntity {
  name: string;
  yearly_quota: number | string;
  paid: boolean | string;
  carry_forward: boolean | string;
}

export interface LeaveBalance extends BaseEntity {
  employee_id: string;
  leave_type_id: string;
  year: number | string;
  opening: number | string;
  used: number | string;
  balance: number | string;
}

export interface LeaveRequest extends BaseEntity {
  employee_id: string;
  leave_type_id: string;
  from_date: string;
  to_date: string;
  half_day: boolean | string;
  days: number | string;
  reason: string;
  attachment_id?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  reviewed_by?: string;
  review_remark?: string;
}

export interface Holiday extends BaseEntity {
  date: string; // YYYY-MM-DD
  name: string;
}

export interface SalaryStructure extends BaseEntity {
  employee_id: string;
  effective_from: string;
  basic: number | string;
  hra: number | string;
  allowances_json: string; // Record<string, number>
  deductions_json: string; // Record<string, number>
  pf_enabled: boolean | string;
  esi_enabled: boolean | string;
  pt_enabled: boolean | string;
  overtime_rate?: number | string;
}

export interface Transaction extends BaseEntity {
  employee_id: string;
  type: 'advance' | 'loan' | 'bonus' | 'incentive' | 'fine' | 'reimbursement';
  amount: number | string;
  emi_amount?: number | string;
  balance: number | string;
  date: string;
  remark?: string;
  status: 'Active' | 'Paid' | 'Closed' | 'Cancelled';
}

export interface PayrollRun extends BaseEntity {
  month: string; // YYYY-MM
  status: 'draft' | 'finalized' | 'paid';
  finalized_by?: string;
  finalized_at?: string;
  paid_on?: string;
}

export interface Payslip extends BaseEntity {
  payroll_run_id: string;
  employee_id: string;
  month: string;
  attendance_json: string;
  earnings_json: string;
  deductions_json: string;
  gross: number | string;
  total_deductions: number | string;
  net_pay: number | string;
  net_in_words: string;
  pdf_drive_id?: string;
  paid_status: 'Unpaid' | 'Paid';
  paid_on?: string;
  mode?: string;
  reference?: string;
}

export interface Task extends BaseEntity {
  title: string;
  description: string;
  task_date: string;
  due_date: string;
  priority: 'Low' | 'Medium' | 'High';
  category?: string;
  assigned_to: string;
  assigned_by: string;
  status: 'Pending' | 'In Progress' | 'Done' | 'Blocked';
  completion_remark?: string;
  review_status?: 'Pending Review' | 'Approved' | 'Needs Rework';
  review_remark?: string;
  completed_at?: string;
}

export interface TaskEvidence {
  type: 'photo' | 'document' | 'link';
  name: string;
  url?: string;
  drive_id?: string;
}

export interface TaskUpdate extends BaseEntity {
  task_id: string;
  employee_id: string;
  update_type: 'status_change' | 'progress' | 'review' | 'evidence_added';
  status_from: string;
  status_to: string;
  remark: string;
  evidence_json?: string; // TaskEvidence[]
}

export interface Setting extends BaseEntity {
  key: string;
  value: string;
}

export interface AuditLog extends BaseEntity {
  actor_id: string;
  action: string;
  entity: string;
  entity_id: string;
  before_json?: string;
  after_json?: string;
  ip?: string;
  timestamp: string;
}
