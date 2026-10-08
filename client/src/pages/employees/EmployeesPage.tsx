import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit,
  UserX,
  FileText,
  Upload,
  Shield,
  Eye,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Employee, EmployeeDoc } from '../../types';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';

export const EmployeesPage: React.FC = () => {
  const { user } = useAuth();
  const isHRManager = user?.role === 'HR Manager';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Selected Employee Details Modal
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Create Employee Modal (HR Manager only)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('Academics');
  const [role, setRole] = useState<'Employee' | 'HR Executive'>('Employee');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCreating, setIsCreating] = useState(false);

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
      if (res.success) setSelectedEmployee(res.employee);
    } catch (e) {}
    finally {
      setIsLoadingDetails(false);
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
          <p className="text-xs text-slate-500">Master record of all academy staff members and documents</p>
        </div>

        {isHRManager && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            <Plus className="w-4 h-4" /> Add Employee Manually
          </button>
        )}
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
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs">
                          {emp.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{emp.full_name}</p>
                          <p className="text-[10px] text-slate-400">{emp.employee_id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{emp.designation}</p>
                      <p className="text-[10px] text-slate-400">{emp.department}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700">
                        {emp.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <p>{emp.phone}</p>
                      <p className="text-[10px] text-slate-400">{emp.email}</p>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">{emp.joining_date}</td>

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
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
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

      {/* View Employee Detail Modal */}
      <Modal
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        title={selectedEmployee ? `${selectedEmployee.full_name} (${selectedEmployee.employee_id})` : 'Employee Details'}
        maxWidth="max-w-3xl"
      >
        {isLoadingDetails || !selectedEmployee ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading details...</div>
        ) : (
          <div className="space-y-6 text-xs">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="font-bold text-slate-700">Status: {selectedEmployee.status}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadDocModal(true)}
                  className="px-3 py-1.5 bg-brand-600 text-white rounded-xl font-bold text-xs"
                >
                  <Upload className="w-3.5 h-3.5 inline mr-1" /> Upload Document
                </button>
                {isHRManager && selectedEmployee.status === 'Active' && (
                  <button
                    type="button"
                    onClick={() => setShowExitModal(true)}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-bold text-xs"
                  >
                    <UserX className="w-3.5 h-3.5 inline mr-1" /> Deactivate / Exit
                  </button>
                )}
              </div>
            </div>

            {/* Profile Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-semibold">Designation</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedEmployee.designation}</p>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-semibold">Department</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedEmployee.department}</p>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-semibold">Role Access</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedEmployee.role}</p>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-semibold">Phone</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedEmployee.phone}</p>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-semibold">Email</span>
                <p className="font-bold text-slate-900 mt-0.5 truncate">{selectedEmployee.email}</p>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-semibold">Location</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedEmployee.work_location || 'Kerala'}</p>
              </div>
            </div>

            {/* Bank and Statutory (Visible to HR Manager) */}
            {isHRManager && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  Statutory & Banking Details (Confidential)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                  <p><strong>PAN:</strong> {selectedEmployee.pan || 'N/A'}</p>
                  <p><strong>Bank:</strong> {selectedEmployee.bank_name || 'N/A'}</p>
                  <p><strong>Account:</strong> {selectedEmployee.account_no || 'N/A'}</p>
                  <p><strong>IFSC:</strong> {selectedEmployee.ifsc || 'N/A'}</p>
                </div>
              </div>
            )}

            {/* Uploaded Documents List */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                Uploaded Verified Documents (Drive)
              </h4>
              {!selectedEmployee.documents || selectedEmployee.documents.length === 0 ? (
                <p className="text-slate-400 italic">No documents uploaded yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedEmployee.documents.map((doc: EmployeeDoc) => (
                    <div key={doc.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-brand-600" />
                        <div>
                          <p className="font-bold text-slate-800 uppercase text-[10px]">{doc.doc_type}</p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{doc.file_name}</p>
                        </div>
                      </div>
                      {doc.drive_file_id && (
                        <a
                          href={`/api/files/stream/${doc.drive_file_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-white text-brand-700 rounded-lg text-[10px] font-bold border border-slate-200"
                        >
                          View File
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Joining Date</label>
              <input
                type="date"
                value={joiningDate}
                onChange={e => setJoiningDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
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
    </div>
  );
};
