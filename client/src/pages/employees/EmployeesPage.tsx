import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit3,
  UserX,
  FileText,
  Upload,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building,
  Briefcase,
  CreditCard,
  Folder,
  ExternalLink,
  Clock,
  HeartPulse,
  Save,
  X,
  ShieldCheck,
  UserCheck,
  Palmtree,
  Wallet,
  Droplet
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Employee, EmployeeDoc } from '../../types';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { ExitManagementModal } from '../../components/exit/ExitManagementModal';
import { ResignationModal } from '../../components/exit/ResignationModal';

export const EmployeesPage: React.FC = () => {
  const { user } = useAuth();
  const isHRManager = user?.role === 'HR Manager';
  const isHRExecutive = user?.role === 'HR Executive';
  const canEdit = isHRManager || isHRExecutive;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected Employee Details Modal
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [profileTab, setProfileTab] = useState<'overview' | 'personal' | 'statutory' | 'leaves' | 'documents'>('overview');
  const [showMaskedAadhaar, setShowMaskedAadhaar] = useState(false);
  const [showMaskedAccount, setShowMaskedAccount] = useState(false);

  // Edit Employee State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editTab, setEditTab] = useState<'employment' | 'personal' | 'statutory'>('employment');

  // Create Employee Modal (HR Manager only)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('Academics');
  const [role, setRole] = useState<'Employee' | 'HR Executive'>('Employee');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCreating, setIsCreating] = useState(false);

  // Global Exit & Resignation Management Modals
  const [showExitManagementModal, setShowExitManagementModal] = useState(false);
  const [showResignationModal, setShowResignationModal] = useState(false);

  // Exit Modal (HR Manager only)
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitReason, setExitReason] = useState('');
  const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
  const [isExiting, setIsExiting] = useState(false);

  // Document Upload State
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [docType, setDocType] = useState('aadhaar');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ success: boolean; employees: Employee[] }>('/employees');
      if (res.success) setEmployees(res.employees);
    } catch (e) {}
    finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const loadEmployeeDetails = async (id: string) => {
    setIsLoadingDetails(true);
    try {
      const res = await api.get<{ success: boolean; employee: Employee }>(`/employees/${id}`);
      if (res.success) {
        setSelectedEmployee(res.employee);
        setProfileTab('overview');
      }
    } catch (e) {}
    finally {
      setIsLoadingDetails(false);
    }
  };

  const openEditModal = (emp: Employee) => {
    setEditForm({
      full_name: emp.full_name || '',
      email: emp.email || '',
      phone: emp.phone || '',
      dob: emp.dob ? emp.dob.split('T')[0] : '',
      gender: emp.gender || 'Other',
      blood_group: emp.blood_group || '',
      address: emp.address || '',
      emergency_name: emp.emergency_name || '',
      emergency_relation: emp.emergency_relation || '',
      emergency_phone: emp.emergency_phone || '',
      designation: emp.designation || '',
      department: emp.department || 'Academics',
      role: emp.role || 'Employee',
      employment_type: emp.employment_type || 'Full-time',
      work_location: emp.work_location || 'Kerala Campus',
      joining_date: emp.joining_date ? emp.joining_date.split('T')[0] : '',
      probation_end: emp.probation_end ? emp.probation_end.split('T')[0] : '',
      reporting_manager_id: emp.reporting_manager_id || '',
      pan: emp.pan || '',
      aadhaar: emp.aadhaar || '',
      bank_name: emp.bank_name || '',
      account_no: emp.account_no || '',
      ifsc: emp.ifsc || '',
      uan: emp.uan || '',
      esi_no: emp.esi_no || ''
    });
    setEditTab('employment');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setIsSavingEdit(true);

    try {
      const res = await api.put<{ success: boolean; message: string; employee: Employee }>(
        `/employees/${selectedEmployee.id}`,
        editForm
      );
      if (res.success) {
        setShowEditModal(false);
        await loadEmployeeDetails(selectedEmployee.id);
        await fetchEmployees();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update employee');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await api.post('/employees', {
        full_name: fullName,
        phone,
        email,
        blood_group: bloodGroup,
        designation,
        department,
        role,
        joining_date: joiningDate
      });
      if (res.success) {
        setShowCreateModal(false);
        setFullName('');
        setPhone('');
        setEmail('');
        setBloodGroup('');
        setDesignation('');
        fetchEmployees();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create employee');
    } finally {
      setIsCreating(false);
    }
  };

  const handleProcessExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setIsExiting(true);
    try {
      const res = await api.post(`/employees/${selectedEmployee.id}/exit`, {
        exit_date: exitDate,
        exit_reason: exitReason
      });
      if (res.success) {
        setShowExitModal(false);
        setSelectedEmployee(null);
        fetchEmployees();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to process exit');
    } finally {
      setIsExiting(false);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !docFile) return;
    setIsUploadingDoc(true);

    try {
      const formData = new FormData();
      formData.append('doc_type', docType);
      formData.append('file', docFile);

      const res = await api.post(`/employees/${selectedEmployee.id}/documents`, formData);
      if (res.success) {
        setShowUploadDocModal(false);
        setDocFile(null);
        loadEmployeeDetails(selectedEmployee.id);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to upload document');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    if (departmentFilter && emp.department !== departmentFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (
        emp.full_name.toLowerCase().includes(s) ||
        emp.employee_id.toLowerCase().includes(s) ||
        emp.email.toLowerCase().includes(s) ||
        emp.designation.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" /> Employee Directory
          </h2>
          <p className="text-xs text-slate-500">Master database of all academy staff members, emergency profiles & documents</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowExitManagementModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition shadow-xs"
          >
            <UserX className="w-4 h-4 text-rose-600" /> Exit & Resignations
          </button>

          {isHRManager && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition"
            >
              <Plus className="w-4 h-4" /> Add Employee Manually
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, employee ID, designation..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <select
          value={departmentFilter}
          onChange={e => setDepartmentFilter(e.target.value)}
          className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
        >
          <option value="">All Departments</option>
          <option value="Academics">Academics</option>
          <option value="Human Resources">Human Resources</option>
          <option value="Administration">Administration</option>
          <option value="Marketing">Marketing</option>
          <option value="Operations">Operations</option>
        </select>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees found"
            description="No staff members match the selected search or filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Designation & Dept</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Joining Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-brand-100 text-brand-700 font-black flex items-center justify-center text-xs shadow-sm">
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{emp.full_name}</p>
                          <p className="text-[10px] font-mono font-bold text-brand-700">{emp.employee_id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{emp.designation}</p>
                      <p className="text-[10px] text-slate-400">{emp.department}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-700">
                        {emp.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <p className="font-medium">{emp.phone}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{emp.email}</p>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-medium">{emp.joining_date ? emp.joining_date.split('T')[0] : 'N/A'}</td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          emp.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : emp.status === 'Probation'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => loadEmployeeDetails(emp.id)}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comprehensive View Profile Modal */}
      <Modal
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        title={selectedEmployee ? `${selectedEmployee.full_name} (${selectedEmployee.employee_id})` : 'Employee Details'}
        maxWidth="max-w-4xl"
      >
        {isLoadingDetails || !selectedEmployee ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading full profile details...</div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Header Profile Hero Card */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-brand-950 text-white rounded-3xl shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 text-white font-black text-xl flex items-center justify-center shadow-inner">
                    {selectedEmployee.full_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black tracking-tight">{selectedEmployee.full_name}</h3>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-black">
                        {selectedEmployee.status}
                      </span>
                      <span className="px-2 py-0.5 bg-white/10 rounded-lg text-[10px] font-semibold text-slate-300">
                        {selectedEmployee.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {selectedEmployee.designation} &bull; <span className="text-brand-300 font-semibold">{selectedEmployee.department}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {selectedEmployee.employee_id}</p>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openEditModal(selectedEmployee)}
                      className="px-3.5 py-2 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-xs shadow-sm transition inline-flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-brand-700" /> Edit Profile
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowUploadDocModal(true)}
                    className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-xs shadow-sm transition inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Document
                  </button>
                  {isHRManager && selectedEmployee.status === 'Active' && (
                    <button
                      type="button"
                      onClick={() => setShowExitModal(true)}
                      className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 rounded-xl font-bold text-xs transition inline-flex items-center gap-1.5"
                    >
                      <UserX className="w-3.5 h-3.5 text-rose-300" /> Exit
                    </button>
                  )}
                </div>
              </div>

              {/* Contact Strip */}
              <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-4 text-[11px] text-slate-300">
                <a
                  href={`tel:${selectedEmployee.phone}`}
                  className="flex items-center gap-1.5 hover:text-white transition"
                >
                  <Phone className="w-3.5 h-3.5 text-brand-400" /> {selectedEmployee.phone}
                </a>
                <a
                  href={`mailto:${selectedEmployee.email}`}
                  className="flex items-center gap-1.5 hover:text-white transition"
                >
                  <Mail className="w-3.5 h-3.5 text-brand-400" /> {selectedEmployee.email}
                </a>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-brand-400" /> {selectedEmployee.work_location || 'Kerala Campus'}
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-brand-400" /> Joined {selectedEmployee.joining_date ? selectedEmployee.joining_date.split('T')[0] : 'N/A'}
                </span>
              </div>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1">
              {[
                { id: 'overview', label: 'Employment Details', icon: Briefcase },
                { id: 'personal', label: 'Personal & Emergency', icon: Users },
                { id: 'statutory', label: 'Statutory & Banking', icon: CreditCard },
                { id: 'leaves', label: 'Leave Balances', icon: Palmtree },
                { id: 'documents', label: `Documents (${selectedEmployee.documents?.length || 0})`, icon: FileText }
              ].map(t => {
                const Icon = t.icon;
                const active = profileTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setProfileTab(t.id as any)}
                    className={`px-3.5 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 transition whitespace-nowrap ${
                      active
                        ? 'bg-brand-50 text-brand-700 border border-brand-200 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {t.label}
                  </button>
                );
              })}
            </div>

            {/* TAB 1: EMPLOYMENT DETAILS */}
            {profileTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee ID</span>
                    <p className="font-mono font-bold text-slate-900 mt-1">{selectedEmployee.employee_id}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Designation</span>
                    <p className="font-bold text-slate-900 mt-1">{selectedEmployee.designation}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</span>
                    <p className="font-bold text-slate-900 mt-1">{selectedEmployee.department}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employment Type</span>
                    <p className="font-bold text-slate-900 mt-1">{selectedEmployee.employment_type || 'Full-time'}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role Access Level</span>
                    <p className="font-bold text-slate-900 mt-1">{selectedEmployee.role}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Joining</span>
                    <p className="font-bold text-slate-900 mt-1">
                      {selectedEmployee.joining_date ? selectedEmployee.joining_date.split('T')[0] : 'N/A'}
                    </p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Location / Campus</span>
                    <p className="font-bold text-slate-900 mt-1">{selectedEmployee.work_location || 'Kerala Campus'}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reporting Manager</span>
                    <p className="font-bold text-slate-900 mt-1">{selectedEmployee.reporting_manager_name || selectedEmployee.reporting_manager_id || 'Top Management'}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Probation End Date</span>
                    <p className="font-bold text-slate-900 mt-1">
                      {selectedEmployee.probation_end ? selectedEmployee.probation_end.split('T')[0] : 'Completed / Confirmed'}
                    </p>
                  </div>
                </div>

                {selectedEmployee.status !== 'Active' && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
                    <p className="font-bold text-rose-800">Exit Information</p>
                    <p className="text-rose-700"><strong>Exit Date:</strong> {selectedEmployee.exit_date ? selectedEmployee.exit_date.split('T')[0] : 'N/A'}</p>
                    <p className="text-rose-700"><strong>Reason:</strong> {selectedEmployee.exit_reason || 'N/A'}</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PERSONAL & EMERGENCY */}
            {profileTab === 'personal' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</span>
                    <p className="font-bold text-slate-900 mt-1">{selectedEmployee.dob ? selectedEmployee.dob.split('T')[0] : 'Not specified'}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender</span>
                    <p className="font-bold text-slate-900 mt-1">{selectedEmployee.gender || 'Not specified'}</p>
                  </div>
                  <div className="p-3.5 bg-rose-50/50 rounded-2xl border border-rose-100">
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1">
                      <Droplet className="w-3 h-3 fill-current" /> Blood Group
                    </span>
                    <p className="font-black text-rose-700 mt-1">{selectedEmployee.blood_group || 'Not specified'}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primary Phone</span>
                    <p className="font-bold text-slate-900 mt-1">{selectedEmployee.phone}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Residential Address</span>
                  <p className="font-bold text-slate-800 mt-1 text-xs leading-relaxed">{selectedEmployee.address || 'Address not updated'}</p>
                </div>

                {/* Emergency Contact Card */}
                <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold">
                    <HeartPulse className="w-4 h-4 text-amber-600" /> Emergency Contact Profile
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mt-2">
                    <div>
                      <span className="text-amber-800/70 text-[10px] font-semibold">Contact Person</span>
                      <p className="font-bold text-amber-950 mt-0.5">{selectedEmployee.emergency_name || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-amber-800/70 text-[10px] font-semibold">Relationship</span>
                      <p className="font-bold text-amber-950 mt-0.5">{selectedEmployee.emergency_relation || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-amber-800/70 text-[10px] font-semibold">Emergency Phone</span>
                      <p className="font-bold text-amber-950 mt-0.5">
                        {selectedEmployee.emergency_phone ? (
                          <a href={`tel:${selectedEmployee.emergency_phone}`} className="underline hover:text-amber-700">
                            {selectedEmployee.emergency_phone}
                          </a>
                        ) : 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: STATUTORY & BANKING */}
            {profileTab === 'statutory' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-100/70 rounded-2xl text-[11px] text-slate-600">
                  <span className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Confidential Statutory & Payroll Data
                  </span>
                  <span className="text-slate-400 text-[10px]">Restricted to HR Management</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Identity Card Numbers */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs">National Identification</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">PAN Card Number</span>
                        <p className="font-mono font-bold text-slate-800 text-sm">{selectedEmployee.pan || 'N/A'}</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Aadhaar Number</span>
                          {selectedEmployee.aadhaar && (
                            <button
                              type="button"
                              onClick={() => setShowMaskedAadhaar(!showMaskedAadhaar)}
                              className="text-[10px] font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                            >
                              {showMaskedAadhaar ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              {showMaskedAadhaar ? 'Hide' : 'Show'}
                            </button>
                          )}
                        </div>
                        <p className="font-mono font-bold text-slate-800 text-sm">
                          {selectedEmployee.aadhaar
                            ? showMaskedAadhaar
                              ? selectedEmployee.aadhaar
                              : `XXXX-XXXX-${selectedEmployee.aadhaar.slice(-4)}`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Social Security & Insurance */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <h4 className="font-bold text-slate-900 text-xs">Provident Fund & ESI</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">UAN (Universal Account Number)</span>
                        <p className="font-mono font-bold text-slate-800 text-sm">{selectedEmployee.uan || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">ESI Registration Number</span>
                        <p className="font-mono font-bold text-slate-800 text-sm">{selectedEmployee.esi_no || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank Account Information */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-brand-600" /> Bank Disbursement Account
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Bank Name</span>
                      <p className="font-bold text-slate-800 mt-0.5">{selectedEmployee.bank_name || 'N/A'}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Account Number</span>
                        {selectedEmployee.account_no && (
                          <button
                            type="button"
                            onClick={() => setShowMaskedAccount(!showMaskedAccount)}
                            className="text-[10px] font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                          >
                            {showMaskedAccount ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                      <p className="font-mono font-bold text-slate-800 mt-0.5">
                        {selectedEmployee.account_no
                          ? showMaskedAccount
                            ? selectedEmployee.account_no
                            : `••••••••${selectedEmployee.account_no.slice(-4)}`
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">IFSC Code</span>
                      <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedEmployee.ifsc || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                      <p className="font-bold text-emerald-600 mt-0.5">Direct Deposit Verified</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: LEAVE BALANCES */}
            {profileTab === 'leaves' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs">Annual Leave Quotas & Current Balances</h4>
                  <span className="text-[10px] text-slate-400">Year {new Date().getFullYear()}</span>
                </div>

                {!selectedEmployee.leave_balances || selectedEmployee.leave_balances.length === 0 ? (
                  <p className="text-slate-400 italic">No leave quotas configured for this role.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedEmployee.leave_balances.map(lb => {
                      const pctUsed = Math.min(100, Math.round((lb.used / (lb.yearly_quota || 1)) * 100));
                      return (
                        <div key={lb.name} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{lb.name}</span>
                            <span className="font-bold text-brand-700 font-mono text-sm">{lb.balance} Left</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div className="bg-brand-600 h-full rounded-full" style={{ width: `${pctUsed}%` }}></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                            <span>Used: {lb.used} days</span>
                            <span>Total Quota: {lb.yearly_quota} days</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: DOCUMENTS & DRIVE */}
            {profileTab === 'documents' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs">Verified Google Drive Documents</h4>
                  <button
                    type="button"
                    onClick={() => setShowUploadDocModal(true)}
                    className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1 shadow-sm transition"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload New
                  </button>
                </div>

                {!selectedEmployee.documents || selectedEmployee.documents.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 font-medium text-xs">No documents uploaded to Google Drive yet.</p>
                    <button
                      type="button"
                      onClick={() => setShowUploadDocModal(true)}
                      className="mt-3 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs"
                    >
                      Upload First Document
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {selectedEmployee.documents.map((doc: EmployeeDoc) => (
                      <div key={doc.id} className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/70 flex items-center justify-between transition">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wide">{doc.doc_type.replace(/_/g, ' ')}</p>
                            <p className="text-[10px] text-slate-500 truncate max-w-[170px]">{doc.file_name}</p>
                          </div>
                        </div>
                        {doc.drive_file_id && (
                          <a
                            href={`/api/files/stream/${doc.drive_file_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-white hover:bg-brand-50 text-brand-700 rounded-lg text-[10px] font-bold border border-slate-200 shadow-xs flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> View
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={selectedEmployee ? `Edit Profile - ${selectedEmployee.full_name} (${selectedEmployee.employee_id})` : 'Edit Employee Profile'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          {/* Edit Tabs */}
          <div className="flex border-b border-slate-200 gap-2 pb-1">
            <button
              type="button"
              onClick={() => setEditTab('employment')}
              className={`px-3 py-1.5 font-bold rounded-xl ${editTab === 'employment' ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              💼 Employment
            </button>
            <button
              type="button"
              onClick={() => setEditTab('personal')}
              className={`px-3 py-1.5 font-bold rounded-xl ${editTab === 'personal' ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              👤 Personal & Emergency
            </button>
            <button
              type="button"
              onClick={() => setEditTab('statutory')}
              className={`px-3 py-1.5 font-bold rounded-xl ${editTab === 'statutory' ? 'bg-brand-50 text-brand-700 border border-brand-200' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              🏛️ Banking & Statutory
            </button>
          </div>

          {/* EDIT SECTION 1: EMPLOYMENT */}
          {editTab === 'employment' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name || ''}
                    onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={editForm.email || ''}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    value={editForm.designation || ''}
                    onChange={e => setEditForm({ ...editForm, designation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={editForm.department || 'Academics'}
                    onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                  >
                    <option value="Academics">Academics</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Administration">Administration</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role Access</label>
                  <select
                    value={editForm.role || 'Employee'}
                    onChange={e => setEditForm({ ...editForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                  >
                    <option value="Employee">Employee</option>
                    <option value="HR Executive">HR Executive</option>
                    <option value="HR Manager">HR Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employment Type</label>
                  <select
                    value={editForm.employment_type || 'Full-time'}
                    onChange={e => setEditForm({ ...editForm, employment_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Work Location</label>
                  <input
                    type="text"
                    value={editForm.work_location || 'Kerala Campus'}
                    onChange={e => setEditForm({ ...editForm, work_location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date of Joining</label>
                  <input
                    type="date"
                    value={editForm.joining_date || ''}
                    onChange={e => setEditForm({ ...editForm, joining_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Probation End Date</label>
                  <input
                    type="date"
                    value={editForm.probation_end || ''}
                    onChange={e => setEditForm({ ...editForm, probation_end: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reporting Manager ID</label>
                  <input
                    type="text"
                    value={editForm.reporting_manager_id || ''}
                    onChange={e => setEditForm({ ...editForm, reporting_manager_id: e.target.value })}
                    placeholder="e.g. MSA-0001"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* EDIT SECTION 2: PERSONAL & EMERGENCY */}
          {editTab === 'personal' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primary Phone *</label>
                  <input
                    type="tel"
                    required
                    value={editForm.phone || ''}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={editForm.dob || ''}
                    onChange={e => setEditForm({ ...editForm, dob: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={editForm.gender || 'Other'}
                    onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={editForm.blood_group || ''}
                    onChange={e => setEditForm({ ...editForm, blood_group: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                  >
                    <option value="">-- Blood Group --</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Other'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Residential Address</label>
                <textarea
                  rows={2}
                  value={editForm.address || ''}
                  onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="Street, City, District, PIN code"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                <span className="font-bold text-amber-900 text-[11px] block">Emergency Contact</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Person Name</label>
                    <input
                      type="text"
                      value={editForm.emergency_name || ''}
                      onChange={e => setEditForm({ ...editForm, emergency_name: e.target.value })}
                      placeholder="e.g. Spouse / Father"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Relationship</label>
                    <input
                      type="text"
                      value={editForm.emergency_relation || ''}
                      onChange={e => setEditForm({ ...editForm, emergency_relation: e.target.value })}
                      placeholder="e.g. Mother / Sibling"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Emergency Phone</label>
                    <input
                      type="tel"
                      value={editForm.emergency_phone || ''}
                      onChange={e => setEditForm({ ...editForm, emergency_phone: e.target.value })}
                      placeholder="+91..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EDIT SECTION 3: STATUTORY & BANKING */}
          {editTab === 'statutory' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PAN Card Number</label>
                  <input
                    type="text"
                    value={editForm.pan || ''}
                    onChange={e => setEditForm({ ...editForm, pan: e.target.value.toUpperCase() })}
                    placeholder="ABCDE1234F"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Aadhaar Number (12 Digits)</label>
                  <input
                    type="text"
                    value={editForm.aadhaar || ''}
                    onChange={e => setEditForm({ ...editForm, aadhaar: e.target.value })}
                    placeholder="12-digit number"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={editForm.bank_name || ''}
                    onChange={e => setEditForm({ ...editForm, bank_name: e.target.value })}
                    placeholder="e.g. State Bank of India / HDFC"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    value={editForm.account_no || ''}
                    onChange={e => setEditForm({ ...editForm, account_no: e.target.value })}
                    placeholder="Account number"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={editForm.ifsc || ''}
                    onChange={e => setEditForm({ ...editForm, ifsc: e.target.value.toUpperCase() })}
                    placeholder="SBIN0001234"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PF / UAN Number</label>
                  <input
                    type="text"
                    value={editForm.uan || ''}
                    onChange={e => setEditForm({ ...editForm, uan: e.target.value })}
                    placeholder="12-digit UAN"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ESI Registration No</label>
                  <input
                    type="text"
                    value={editForm.esi_no || ''}
                    onChange={e => setEditForm({ ...editForm, esi_no: e.target.value })}
                    placeholder="17-digit ESI number"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingEdit}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> {isSavingEdit ? 'Saving to Database...' : 'Save & Update in Google Sheets'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Employee Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Employee Profile">
        <form onSubmit={handleCreateEmployee} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Designation *</label>
              <input
                type="text"
                required
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                placeholder="Faculty / Trainer"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="Academics">Academics</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Administration">Administration</option>
                <option value="Marketing">Marketing</option>
                <option value="Operations">Operations</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">User Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="Employee">Employee</option>
                <option value="HR Executive">HR Executive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={e => setBloodGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="">-- Blood Group --</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Other'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Joining Date</label>
            <input
              type="date"
              value={joiningDate}
              onChange={e => setJoiningDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50"
          >
            {isCreating ? 'Saving...' : 'Save Employee Profile'}
          </button>
        </form>
      </Modal>

      {/* Exit Modal */}
      <Modal isOpen={showExitModal} onClose={() => setShowExitModal(false)} title="Process Employee Exit">
        <form onSubmit={handleProcessExit} className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs">
            <p className="font-bold">Deactivate Staff Account</p>
            <p className="mt-0.5">This marks the employee status as Resigned and deactivates their portal login.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Last Working Day *</label>
            <input
              type="date"
              required
              value={exitDate}
              onChange={e => setExitDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Exit</label>
            <textarea
              rows={2}
              value={exitReason}
              onChange={e => setExitReason(e.target.value)}
              placeholder="e.g. Resignation / Higher Studies"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isExiting}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-md transition"
          >
            {isExiting ? 'Processing...' : 'Confirm Exit & Deactivate Login'}
          </button>
        </form>
      </Modal>

      {/* Document Upload Modal */}
      <Modal isOpen={showUploadDocModal} onClose={() => setShowUploadDocModal(false)} title="Upload Document to Drive">
        <form onSubmit={handleUploadDocument} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Document Type *</label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="aadhaar">Aadhaar Card</option>
              <option value="pan">PAN Card</option>
              <option value="education_cert">Education Certificate</option>
              <option value="experience_letter">Experience Letter</option>
              <option value="bank_passbook">Bank Passbook / Cheque</option>
              <option value="other">Other Document</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select File (PDF / Image) *</label>
            <input
              type="file"
              required
              accept=".pdf,image/*,.doc,.docx"
              onChange={e => setDocFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700"
            />
          </div>

          <button
            type="submit"
            disabled={isUploadingDoc}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50"
          >
            {isUploadingDoc ? 'Uploading to Drive...' : 'Upload & Save to Drive'}
          </button>
        </form>
      </Modal>

      {/* Exit & Resignation Management Modals */}
      <ExitManagementModal
        isOpen={showExitManagementModal}
        onClose={() => setShowExitManagementModal(false)}
        currentUserRole={user?.role}
        onRefresh={fetchEmployees}
      />

      <ResignationModal
        isOpen={showResignationModal}
        onClose={() => setShowResignationModal(false)}
        onSubmitted={fetchEmployees}
      />
    </div>
  );
};
