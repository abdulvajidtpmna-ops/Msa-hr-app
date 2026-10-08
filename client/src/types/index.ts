export type UserRole = 'HR Manager' | 'HR Executive' | 'Employee';

export interface User {
  id: string;
  employee_id: string;
  email: string;
  phone: string;
  role: UserRole;
  must_change_password: boolean;
  name: string;
  designation: string;
  department: string;
  photo_url?: string;
}

export interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  photo_url?: string;
  phone: string;
  email: string;
  dob?: string;
  gender: string;
  address?: string;
  emergency_name?: string;
  emergency_relation?: string;
  emergency_phone?: string;
  designation: string;
  department: string;
  role: UserRole;
  employment_type: string;
  joining_date: string;
  reporting_manager_id?: string;
  work_location: string;
  probation_end?: string;
  status: 'Active' | 'Probation' | 'Notice' | 'Resigned' | 'Terminated';
  pan?: string;
  aadhaar?: string;
  bank_name?: string;
  account_no?: string;
  ifsc?: string;
  uan?: string;
  esi_no?: string;
  documents?: EmployeeDoc[];
}

export interface EmployeeDoc {
  id: string;
  employee_id: string;
  doc_type: string;
  file_name: string;
  drive_file_id: string;
  uploaded_by: string;
  verified: boolean;
  created_at: string;
}

export interface CustomFieldConfig {
  id: string;
  label: string;
  type: 'short_text' | 'long_text' | 'number' | 'dropdown' | 'yes_no';
  required: boolean;
  options?: string[];
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

export interface Job {
  id: string;
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
  required_skills: string;
  preferred_skills: string;
  salary_range?: string;
  last_date: string;
  status: 'Draft' | 'Open' | 'Closed';
  form_config_json?: string;
  criteria_json?: string;
  threshold: number | string;
  created_at: string;
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

export interface Application {
  id: string;
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
  score_breakdown_json?: string;
  status: ApplicationStatus;
  hr_notes?: string;
  created_at: string;
}

export interface Interview {
  id: string;
  application_id: string;
  round: number | string;
  date: string;
  time: string;
  mode: 'In-person' | 'Phone' | 'Video';
  location_or_link: string;
  interviewers: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled' | 'No Show';
  ratings_json?: string;
  remarks?: string;
  recommendation?: 'Hire' | 'Hold' | 'Reject';
}

export interface Offer {
  id: string;
  application_id: string;
  designation: string;
  department: string;
  role: UserRole;
  joining_date: string;
  salary_json: string;
  probation_months: number | string;
  offer_pdf_drive_id?: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined';
  accepted_on?: string;
}

export interface OnboardingDoc {
  id: string;
  application_id: string;
  doc_type: string;
  received: boolean;
  drive_file_id?: string;
  received_on?: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
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
  geofence_flag?: string;
  device_info?: string;
  regularized?: boolean;
  remark?: string;
}

export interface Task {
  id: string;
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
  assignee_name?: string;
  department?: string;
}

export interface LeaveType {
  id: string;
  name: string;
  yearly_quota: number;
  paid: boolean;
  carry_forward: boolean;
}

export interface LeaveBalance {
  leave_type_id: string;
  leave_type_name: string;
  paid: boolean;
  yearly_quota: number;
  opening: number;
  used: number;
  balance: number;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name?: string;
  department?: string;
  leave_type_id: string;
  leave_type_name?: string;
  from_date: string;
  to_date: string;
  half_day: boolean;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewed_by?: string;
  review_remark?: string;
  created_at: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
}

export interface SalaryStructure {
  id: string;
  employee_id: string;
  effective_from: string;
  basic: number;
  hra: number;
  allowances_json: string;
  deductions_json: string;
  pf_enabled: boolean;
  esi_enabled: boolean;
  pt_enabled: boolean;
  overtime_rate?: number;
}

export interface Transaction {
  id: string;
  employee_id: string;
  type: 'advance' | 'loan' | 'bonus' | 'incentive' | 'fine' | 'reimbursement';
  amount: number;
  emi_amount?: number;
  balance: number;
  date: string;
  remark?: string;
  status: 'Active' | 'Paid' | 'Closed' | 'Cancelled';
}

export interface Payslip {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  month: string;
  attendance_json: string;
  earnings_json: string;
  deductions_json: string;
  gross: number;
  total_deductions: number;
  net_pay: number;
  net_in_words: string;
  pdf_drive_id?: string;
  paid_status: 'Unpaid' | 'Paid';
  paid_on?: string;
  mode?: string;
  reference?: string;
  employee_name?: string;
  department?: string;
}
