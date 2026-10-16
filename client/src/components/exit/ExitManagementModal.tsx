import React, { useState, useEffect } from 'react';
import {
  UserX,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Star,
  DollarSign,
  Download,
  Printer,
  ChevronRight,
  Plus,
  Search,
  Check,
  X,
  UserCheck,
  Building,
  Calendar,
  Lock
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { ExitRequest, Employee, UserRole } from '../../types';

interface ExitManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole?: UserRole;
  onRefresh?: () => void;
}

export const ExitManagementModal: React.FC<ExitManagementModalProps> = ({
  isOpen,
  onClose,
  currentUserRole,
  onRefresh
}) => {
  const [requests, setRequests] = useState<ExitRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Exit Request for in-depth management
  const [selectedRequest, setSelectedRequest] = useState<ExitRequest | null>(null);
  const [activeStage, setActiveStage] = useState<'review' | 'clearance' | 'interview' | 'fnf' | 'relieving'>('review');

  // Review stage inputs
  const [approvedLwd, setApprovedLwd] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  // Clearance stage inputs
  const [deptClearance, setDeptClearance] = useState(false);
  const [deptNotes, setDeptNotes] = useState('');
  const [itClearance, setItClearance] = useState(false);
  const [itNotes, setItNotes] = useState('');
  const [financeClearance, setFinanceClearance] = useState(false);
  const [financeNotes, setFinanceNotes] = useState('');
  const [adminClearance, setAdminClearance] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [isSavingClearance, setIsSavingClearance] = useState(false);

  // Interview stage inputs
  const [interviewStatus, setInterviewStatus] = useState('Conducted');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [rehireEligible, setRehireEligible] = useState(true);
  const [interviewNotes, setInterviewNotes] = useState('');
  const [isSavingInterview, setIsSavingInterview] = useState(false);

  // FnF stage inputs
  const [fnfStatus, setFnfStatus] = useState('Settled');
  const [fnfAmount, setFnfAmount] = useState<number | string>(0);
  const [fnfDate, setFnfDate] = useState(new Date().toISOString().split('T')[0]);
  const [fnfRemarks, setFnfRemarks] = useState('');
  const [isSavingFnf, setIsSavingFnf] = useState(false);

  // Finalize exit
  const [isFinalizing, setIsFinalizing] = useState(false);

  // HR Initiate Separation modal
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [initEmpId, setInitEmpId] = useState('');
  const [initType, setInitType] = useState('Mutual Separation');
  const [initLwd, setInitLwd] = useState(new Date().toISOString().split('T')[0]);
  const [initReason, setInitReason] = useState('');
  const [isInitiating, setIsInitiating] = useState(false);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [exitRes, empRes] = await Promise.all([
        api.get<{ success: boolean; requests: ExitRequest[] }>('/exit/all'),
        api.get<{ success: boolean; employees: Employee[] }>('/employees')
      ]);

      if (exitRes.success) {
        setRequests(exitRes.requests || []);
      }
      if (empRes.success) {
        setEmployees(empRes.employees || []);
      }
    } catch (e) {
      console.warn('Failed to fetch exit requests', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllData();
    }
  }, [isOpen]);

  // Sync inputs when selecting a request
  useEffect(() => {
    if (selectedRequest) {
      setApprovedLwd(selectedRequest.approved_last_working_day || selectedRequest.proposed_last_working_day || '');
      setReviewNotes(selectedRequest.review_notes || '');

      setDeptClearance(Boolean(selectedRequest.dept_clearance));
      setDeptNotes(selectedRequest.dept_clearance_notes || '');
      setItClearance(Boolean(selectedRequest.it_clearance));
      setItNotes(selectedRequest.it_clearance_notes || '');
      setFinanceClearance(Boolean(selectedRequest.finance_clearance));
      setFinanceNotes(selectedRequest.finance_clearance_notes || '');
      setAdminClearance(Boolean(selectedRequest.admin_clearance));
      setAdminNotes(selectedRequest.admin_clearance_notes || '');

      setInterviewStatus(selectedRequest.exit_interview_status || 'Conducted');
      setFeedbackRating(Number(selectedRequest.feedback_rating) || 5);
      setRehireEligible(selectedRequest.rehire_eligible !== false && String(selectedRequest.rehire_eligible) !== 'false');
      setInterviewNotes(selectedRequest.interview_notes || '');

      setFnfStatus(selectedRequest.fnf_status || 'Pending');
      setFnfAmount(selectedRequest.fnf_amount || 0);
      setFnfDate(selectedRequest.fnf_settlement_date || new Date().toISOString().split('T')[0]);
      setFnfRemarks(selectedRequest.fnf_remarks || '');
    }
  }, [selectedRequest]);

  // Stage 1: Review Action
  const handleReviewAction = async (status: 'Notice Period Active' | 'Rejected') => {
    if (!selectedRequest) return;
    setIsReviewing(true);
    try {
      const res = await api.put(`/exit/${selectedRequest.id}/review`, {
        status,
        approved_last_working_day: approvedLwd,
        review_notes: reviewNotes
      });
      if (res.success) {
        alert(`Resignation ${status === 'Notice Period Active' ? 'Approved into Notice Period' : 'Rejected'}`);
        setSelectedRequest(res.request);
        fetchAllData();
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to review resignation');
    } finally {
      setIsReviewing(false);
    }
  };

  // Stage 2: Save Clearances
  const handleSaveClearances = async () => {
    if (!selectedRequest) return;
    setIsSavingClearance(true);
    try {
      const res = await api.put(`/exit/${selectedRequest.id}/clearance`, {
        dept_clearance: deptClearance,
        dept_clearance_notes: deptNotes,
        it_clearance: itClearance,
        it_clearance_notes: itNotes,
        finance_clearance: financeClearance,
        finance_clearance_notes: financeNotes,
        admin_clearance: adminClearance,
        admin_clearance_notes: adminNotes
      });
      if (res.success) {
        alert('Clearance checklist updated successfully.');
        setSelectedRequest(res.request);
        fetchAllData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update clearances');
    } finally {
      setIsSavingClearance(false);
    }
  };

  // Stage 3: Save Interview
  const handleSaveInterview = async () => {
    if (!selectedRequest) return;
    setIsSavingInterview(true);
    try {
      const res = await api.put(`/exit/${selectedRequest.id}/interview`, {
        exit_interview_status: interviewStatus,
        feedback_rating: feedbackRating,
        rehire_eligible: rehireEligible,
        interview_notes: interviewNotes
      });
      if (res.success) {
        alert('Exit interview saved successfully.');
        setSelectedRequest(res.request);
        fetchAllData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save exit interview');
    } finally {
      setIsSavingInterview(false);
    }
  };

  // Stage 4: Save FnF
  const handleSaveFnF = async () => {
    if (!selectedRequest) return;
    setIsSavingFnf(true);
    try {
      const res = await api.put(`/exit/${selectedRequest.id}/fnf`, {
        fnf_status: fnfStatus,
        fnf_amount: Number(fnfAmount),
        fnf_settlement_date: fnfDate,
        fnf_remarks: fnfRemarks
      });
      if (res.success) {
        alert('FnF settlement details updated successfully.');
        setSelectedRequest(res.request);
        fetchAllData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update FnF details');
    } finally {
      setIsSavingFnf(false);
    }
  };

  // Stage 5: Finalize Exit
  const handleFinalizeExit = async () => {
    if (!selectedRequest) return;
    if (
      !confirm(
        `Are you sure you want to finalize the exit for ${selectedRequest.employee_name}? This will mark their status as Resigned/Exited and deactivate their system login.`
      )
    )
      return;

    setIsFinalizing(true);
    try {
      const res = await api.post(`/exit/${selectedRequest.id}/finalize`, {
        final_exit_date: approvedLwd || selectedRequest.approved_last_working_day
      });
      if (res.success) {
        alert(res.message);
        setSelectedRequest(res.request);
        fetchAllData();
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to finalize exit');
    } finally {
      setIsFinalizing(false);
    }
  };

  // HR Initiate Exit
  const handleInitiateExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initEmpId) return;

    setIsInitiating(true);
    try {
      const res = await api.post('/exit/initiate', {
        employee_id: initEmpId,
        request_type: initType,
        proposed_last_working_day: initLwd,
        reason: initReason
      });
      if (res.success) {
        alert('Separation initiated successfully.');
        setShowInitiateModal(false);
        setInitReason('');
        fetchAllData();
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to initiate separation');
    } finally {
      setIsInitiating(false);
    }
  };

  // Filtered requests
  const filteredRequests = requests.filter(r => {
    const matchesSearch =
      r.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.department.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  // Metrics
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === 'Pending Review').length;
  const noticeCount = requests.filter(r => r.status === 'Notice Period Active').length;
  const clearanceCount = requests.filter(r => r.status === 'Clearance In Progress').length;
  const completedCount = requests.filter(r => r.status === 'Completed / Exited').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Exit & Offboarding Management Workspace"
      maxWidth="max-w-6xl"
    >
      <div className="space-y-6">
        {/* Metric Cards Header */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div
            onClick={() => setStatusFilter('ALL')}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase opacity-75">Total Exits</p>
            <p className="text-xl font-black mt-1">{totalCount}</p>
          </div>

          <div
            onClick={() => setStatusFilter('Pending Review')}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              statusFilter === 'Pending Review'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:border-amber-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase opacity-75">Pending Review</p>
            <p className="text-xl font-black mt-1">{pendingCount}</p>
          </div>

          <div
            onClick={() => setStatusFilter('Notice Period Active')}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              statusFilter === 'Notice Period Active'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-blue-50 text-blue-900 border-blue-200 hover:border-blue-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase opacity-75">Active Notice</p>
            <p className="text-xl font-black mt-1">{noticeCount}</p>
          </div>

          <div
            onClick={() => setStatusFilter('Clearance In Progress')}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              statusFilter === 'Clearance In Progress'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:border-indigo-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase opacity-75">In Clearance</p>
            <p className="text-xl font-black mt-1">{clearanceCount}</p>
          </div>

          <div
            onClick={() => setStatusFilter('Completed / Exited')}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              statusFilter === 'Completed / Exited'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:border-emerald-300'
            }`}
          >
            <p className="text-[10px] font-bold uppercase opacity-75">Completed</p>
            <p className="text-xl font-black mt-1">{completedCount}</p>
          </div>
        </div>

        {/* Toolbar & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by employee name, code, dept..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-brand-600"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowInitiateModal(true)}
            className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Initiate Separation
          </button>
        </div>

        {/* Split View: Requests Table & Detail Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* List Section */}
          <div className={`${selectedRequest ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-3`}>
            {isLoading ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading exit cases...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-10 text-center">
                <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No exit requests found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  All employees are active or no requests match the current filter.
                </p>
              </div>
            ) : (
              filteredRequests.map(req => {
                const isSelected = selectedRequest?.id === req.id;
                const statusColor =
                  req.status === 'Completed / Exited'
                    ? 'bg-emerald-100 text-emerald-800'
                    : req.status === 'Pending Review'
                    ? 'bg-amber-100 text-amber-800'
                    : req.status === 'Notice Period Active'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-indigo-100 text-indigo-800';

                return (
                  <div
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={`p-4 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/40 shadow-sm ring-1 ring-brand-600/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{req.employee_name}</h4>
                          <span className="text-[10px] font-semibold text-slate-400">{req.employee_id}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {req.designation} • {req.department}
                        </p>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor}`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <div>
                        LWD:{' '}
                        <strong className="text-slate-700">
                          {req.approved_last_working_day || req.proposed_last_working_day}
                        </strong>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-brand-700 text-xs">
                        Manage <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Workflow Detail Drawer */}
          {selectedRequest && (
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
              {/* Detail Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{selectedRequest.employee_name}</h3>
                    <span className="text-xs font-bold text-slate-500">({selectedRequest.employee_id})</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedRequest.designation} • {selectedRequest.department} • Type:{' '}
                    <strong>{selectedRequest.request_type}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Stage Navigation Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveStage('review')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-1 min-w-[90px] ${
                    activeStage === 'review'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  1. Review & LWD
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStage('clearance')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-1 min-w-[90px] ${
                    activeStage === 'clearance'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  2. Clearances NOC
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStage('interview')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-1 min-w-[90px] ${
                    activeStage === 'interview'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  3. Exit Interview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStage('fnf')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-1 min-w-[90px] ${
                    activeStage === 'fnf'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  4. FnF Settlement
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStage('relieving')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex-1 min-w-[90px] ${
                    activeStage === 'relieving'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  5. Certificate
                </button>
              </div>

              {/* Stage 1: Review & Last Working Day */}
              {activeStage === 'review' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Submission Date:</span>
                      <strong className="text-slate-800">{selectedRequest.resignation_date}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Notice Period:</span>
                      <strong className="text-slate-800">{selectedRequest.notice_period_days} Days</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Proposed Last Day:</span>
                      <strong className="text-slate-800">{selectedRequest.proposed_last_working_day}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reason:</span>
                      <strong className="text-slate-800">{selectedRequest.reason}</strong>
                    </div>
                    {selectedRequest.reason_details && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-slate-500 block mb-1">Employee Letter / Notes:</span>
                        <p className="text-slate-700 whitespace-pre-wrap">{selectedRequest.reason_details}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Approved Last Working Day (LWD)
                    </label>
                    <input
                      type="date"
                      value={approvedLwd}
                      onChange={e => setApprovedLwd(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-brand-800 focus:bg-white focus:outline-brand-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">HR Review Remarks</label>
                    <textarea
                      rows={2}
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                      placeholder="Add any handover instructions or notes regarding approval..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-brand-600"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isReviewing}
                      onClick={() => handleReviewAction('Rejected')}
                      className="px-4 py-2 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl hover:bg-rose-50 transition"
                    >
                      Reject Resignation
                    </button>
                    <button
                      type="button"
                      disabled={isReviewing}
                      onClick={() => handleReviewAction('Notice Period Active')}
                      className="px-5 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 transition shadow-sm"
                    >
                      {isReviewing ? 'Saving...' : 'Approve & Activate Notice'}
                    </button>
                  </div>
                </div>
              )}

              {/* Stage 2: Clearances NOC */}
              {activeStage === 'clearance' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">
                    Verify all departmental handovers, hardware assets, financial dues, and security access cards:
                  </p>

                  <div className="space-y-3">
                    {/* Dept */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={deptClearance}
                            onChange={e => setDeptClearance(e.target.checked)}
                            className="rounded text-brand-600 focus:ring-brand-500"
                          />
                          1. Department Handover & Knowledge Transfer
                        </label>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            deptClearance ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {deptClearance ? 'Cleared' : 'Pending'}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="Remarks / handover doc link..."
                        value={deptNotes}
                        onChange={e => setDeptNotes(e.target.value)}
                        className="mt-2 w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    {/* IT */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={itClearance}
                            onChange={e => setItClearance(e.target.checked)}
                            className="rounded text-brand-600 focus:ring-brand-500"
                          />
                          2. IT Hardware & System Access (Laptop/Email/Slack)
                        </label>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            itClearance ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {itClearance ? 'Cleared' : 'Pending'}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="Hardware serial number returned, email deactivated..."
                        value={itNotes}
                        onChange={e => setItNotes(e.target.value)}
                        className="mt-2 w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    {/* Finance */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={financeClearance}
                            onChange={e => setFinanceClearance(e.target.checked)}
                            className="rounded text-brand-600 focus:ring-brand-500"
                          />
                          3. Finance & Accounts (Salary Advances / Expenses)
                        </label>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            financeClearance ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {financeClearance ? 'Cleared' : 'Pending'}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="Loans / dues clearance notes..."
                        value={financeNotes}
                        onChange={e => setFinanceNotes(e.target.value)}
                        className="mt-2 w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    {/* Admin */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={adminClearance}
                            onChange={e => setAdminClearance(e.target.checked)}
                            className="rounded text-brand-600 focus:ring-brand-500"
                          />
                          4. Admin & Office Assets (ID Card / Keys)
                        </label>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            adminClearance ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {adminClearance ? 'Cleared' : 'Pending'}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="ID card received, drawer keys returned..."
                        value={adminNotes}
                        onChange={e => setAdminNotes(e.target.value)}
                        className="mt-2 w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={isSavingClearance}
                      onClick={handleSaveClearances}
                      className="px-5 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 transition shadow-sm"
                    >
                      {isSavingClearance ? 'Saving...' : 'Save Clearance Updates'}
                    </button>
                  </div>
                </div>
              )}

              {/* Stage 3: Exit Interview */}
              {activeStage === 'interview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Interview Status</label>
                      <select
                        value={interviewStatus}
                        onChange={e => setInterviewStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-brand-600"
                      >
                        <option value="Conducted">Conducted</option>
                        <option value="Pending">Pending</option>
                        <option value="Waived">Waived</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Employee Culture & Rating (1-5 Stars)
                      </label>
                      <div className="flex items-center gap-1.5 py-1.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFeedbackRating(star)}
                            className={`p-1 rounded-md transition ${
                              star <= feedbackRating ? 'text-amber-500' : 'text-slate-300'
                            }`}
                          >
                            <Star className="w-5 h-5 fill-current" />
                          </button>
                        ))}
                        <span className="text-xs font-bold text-slate-700 ml-2">{feedbackRating} / 5</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rehireEligible}
                        onChange={e => setRehireEligible(e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500"
                      />
                      Eligible for Future Rehire at Mastered Skill Academy
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Exit Interview Feedback & Notes
                    </label>
                    <textarea
                      rows={4}
                      value={interviewNotes}
                      onChange={e => setInterviewNotes(e.target.value)}
                      placeholder="Summary of exit interview conversation, suggestions for MSA, primary turnover factors..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-brand-600"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={isSavingInterview}
                      onClick={handleSaveInterview}
                      className="px-5 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 transition shadow-sm"
                    >
                      {isSavingInterview ? 'Saving...' : 'Save Exit Interview'}
                    </button>
                  </div>
                </div>
              )}

              {/* Stage 4: FnF Settlement */}
              {activeStage === 'fnf' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">FnF Status</label>
                      <select
                        value={fnfStatus}
                        onChange={e => setFnfStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-brand-600"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Settled">Settled</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Net Settlement Amount (₹)</label>
                      <input
                        type="number"
                        value={fnfAmount}
                        onChange={e => setFnfAmount(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-800 focus:bg-white focus:outline-brand-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Settlement Date</label>
                      <input
                        type="date"
                        value={fnfDate}
                        onChange={e => setFnfDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-brand-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Settlement Remarks & Deductions Breakdown
                    </label>
                    <textarea
                      rows={3}
                      value={fnfRemarks}
                      onChange={e => setFnfRemarks(e.target.value)}
                      placeholder="Days worked, leave encashment days, gratuity, notice buyout or deductions..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-brand-600"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <p className="text-[11px] text-slate-400">
                      FnF calculations are stored directly in your connected database.
                    </p>
                    <button
                      type="button"
                      disabled={isSavingFnf}
                      onClick={handleSaveFnF}
                      className="px-5 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 transition shadow-sm"
                    >
                      {isSavingFnf ? 'Saving...' : 'Update FnF Details'}
                    </button>
                  </div>
                </div>
              )}

              {/* Stage 5: Final Deactivation & Relieving Letter */}
              {activeStage === 'relieving' && (
                <div className="space-y-6">
                  {selectedRequest.status !== 'Completed / Exited' ? (
                    <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <Lock className="w-4 h-4 text-amber-600" />
                        <span>Ready to complete this employee's exit?</span>
                      </div>
                      <p className="text-xs text-amber-800">
                        Finalizing the exit will mark the employee record as <strong>Resigned/Exited</strong>, set their
                        exit date, and automatically <strong>deactivate their login account</strong>.
                      </p>
                      <button
                        type="button"
                        disabled={isFinalizing}
                        onClick={handleFinalizeExit}
                        className="px-5 py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition shadow-md shadow-rose-600/20"
                      >
                        {isFinalizing ? 'Finalizing...' : 'Confirm Exit & Deactivate Login'}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <div>
                          <p className="text-xs font-bold text-emerald-900">Exit Completed</p>
                          <p className="text-[11px] text-emerald-700">
                            Employee login is deactivated and relieving certificate is generated.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print Certificate
                      </button>
                    </div>
                  )}

                  {/* Relieving Certificate Preview */}
                  <div className="p-8 bg-slate-50 border border-slate-300 rounded-3xl font-serif text-slate-900 shadow-inner space-y-4">
                    <div className="text-center pb-4 border-b border-slate-300">
                      <h4 className="text-base font-black tracking-wider uppercase font-sans text-brand-900">
                        Mastered Skill Academy
                      </h4>
                      <p className="text-[10px] font-sans text-slate-500 uppercase tracking-widest mt-0.5">
                        Human Resources Department • Relieving & Experience Letter
                      </p>
                    </div>

                    <div className="text-right text-xs">
                      Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>

                    <h5 className="text-center text-xs font-bold uppercase underline tracking-wider pt-2">
                      TO WHOMSOEVER IT MAY CONCERN
                    </h5>

                    <p className="text-xs leading-relaxed">
                      This is to certify that <strong>{selectedRequest.employee_name}</strong> (Employee ID:{' '}
                      <strong>{selectedRequest.employee_id}</strong>) was employed with Mastered Skill Academy in the{' '}
                      <strong>{selectedRequest.department}</strong> department as a{' '}
                      <strong>{selectedRequest.designation}</strong>.
                    </p>

                    <p className="text-xs leading-relaxed">
                      Consequent to their formal {selectedRequest.request_type.toLowerCase()}, they have been relieved
                      from their duties at the close of business hours on{' '}
                      <strong>
                        {selectedRequest.approved_last_working_day || selectedRequest.proposed_last_working_day}
                      </strong>
                      . All departmental handovers, IT clearances, and accounts settlements have been concluded in
                      accordance with company policy.
                    </p>

                    <p className="text-xs leading-relaxed">
                      During their tenure with us, we found them to be sincere, diligent, and professionally committed to
                      their responsibilities. We take this opportunity to thank them for their contributions and wish
                      them all success in their future endeavors.
                    </p>

                    <div className="pt-8 flex justify-between items-end text-xs font-sans">
                      <div>
                        <div className="w-32 border-b border-slate-400 mb-1" />
                        <p className="font-bold text-slate-900">Authorized Signatory</p>
                        <p className="text-[10px] text-slate-500">Mastered Skill Academy</p>
                      </div>

                      <div className="w-16 h-16 rounded-full border border-dashed border-slate-400 flex items-center justify-center text-[9px] text-slate-400 uppercase text-center font-bold">
                        Official Seal
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* HR Initiate Exit Sub-modal */}
      {showInitiateModal && (
        <Modal
          isOpen={showInitiateModal}
          onClose={() => setShowInitiateModal(false)}
          title="Initiate Employee Separation / Exit"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleInitiateExit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Employee</label>
              <select
                required
                value={initEmpId}
                onChange={e => setInitEmpId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-brand-600"
              >
                <option value="">-- Choose Active Employee --</option>
                {employees
                  .filter(e => e.status !== 'Resigned' && e.status !== 'Terminated')
                  .map(e => (
                    <option key={e.id} value={e.employee_id}>
                      {e.full_name} ({e.employee_id}) - {e.designation}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Separation Type</label>
              <select
                value={initType}
                onChange={e => setInitType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-brand-600"
              >
                <option value="Mutual Separation">Mutual Separation</option>
                <option value="Resignation">Resignation (Filed on behalf)</option>
                <option value="Contract Expiry">Contract Expiry</option>
                <option value="Performance Termination">Performance Termination</option>
                <option value="Disciplinary Separation">Disciplinary Separation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Proposed Last Working Day</label>
              <input
                type="date"
                required
                value={initLwd}
                onChange={e => setInitLwd(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Notes</label>
              <textarea
                rows={3}
                required
                value={initReason}
                onChange={e => setInitReason(e.target.value)}
                placeholder="Details of the separation decision..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-brand-600"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowInitiateModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isInitiating}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-xs"
              >
                {isInitiating ? 'Initiating...' : 'Start Separation Process'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Modal>
  );
};
