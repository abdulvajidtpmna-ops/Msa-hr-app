import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
  Palmtree,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LeaveType, LeaveBalance, LeaveRequest, Holiday } from '../../types';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';

export const LeavePage: React.FC = () => {
  const { user } = useAuth();
  const isHR = user?.role === 'HR Manager' || user?.role === 'HR Executive';

  const [activeTab, setActiveTab] = useState<'my-leaves' | 'approvals' | 'holidays'>('my-leaves');

  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Apply Leave Form
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  // Review Modal (HR)
  const [selectedRequestForReview, setSelectedRequestForReview] = useState<LeaveRequest | null>(null);
  const [reviewRemark, setReviewRemark] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  const fetchLeaveData = async () => {
    setIsLoading(true);
    try {
      const [balRes, typesRes, myReqRes, holRes] = await Promise.all([
        api.get<{ success: boolean; balances: LeaveBalance[] }>('/leave/my-balances'),
        api.get<{ success: boolean; leaveTypes: LeaveType[] }>('/leave/types'),
        api.get<{ success: boolean; leaveRequests: LeaveRequest[] }>('/leave/my-requests'),
        api.get<{ success: boolean; holidays: Holiday[] }>('/leave/holidays')
      ]);

      if (balRes.success) setLeaveBalances(balRes.balances);
      if (typesRes.success) {
        setLeaveTypes(typesRes.leaveTypes);
        if (typesRes.leaveTypes.length > 0 && !leaveTypeId) {
          setLeaveTypeId(typesRes.leaveTypes[0].id || typesRes.leaveTypes[0].name);
        }
      }
      if (myReqRes.success) setMyRequests(myReqRes.leaveRequests);
      if (holRes.success) setHolidays(holRes.holidays);

      if (isHR) {
        const hrReqRes = await api.get<{ success: boolean; leaveRequests: LeaveRequest[] }>('/leave/requests');
        if (hrReqRes.success) setAllRequests(hrReqRes.leaveRequests);
      }
    } catch (e) {}
    finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, [activeTab]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      alert('Please state a reason for your leave request.');
      return;
    }

    setIsApplying(true);
    try {
      const res = await api.post('/leave/apply', {
        leave_type_id: leaveTypeId,
        from_date: fromDate,
        to_date: toDate,
        half_day: isHalfDay,
        reason
      });
      if (res.success) {
        setShowApplyModal(false);
        setReason('');
        fetchLeaveData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to apply for leave');
    } finally {
      setIsApplying(false);
    }
  };

  const handleReview = async (status: 'Approved' | 'Rejected') => {
    if (!selectedRequestForReview) return;
    setIsReviewing(true);
    try {
      const res = await api.post(`/leave/requests/${selectedRequestForReview.id}/review`, {
        status,
        review_remark: reviewRemark
      });
      if (res.success) {
        setSelectedRequestForReview(null);
        setReviewRemark('');
        fetchLeaveData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to review request');
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Palmtree className="w-5 h-5 text-brand-600" /> Leave & Holiday Management
          </h2>
          <p className="text-xs text-slate-500">Apply for time off and view yearly allowance balances</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('my-leaves')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'my-leaves' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              My Leaves
            </button>
            {isHR && (
              <button
                type="button"
                onClick={() => setActiveTab('approvals')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'approvals' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Approvals
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('holidays')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'holidays' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Holidays
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowApplyModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            <Plus className="w-4 h-4" /> Apply Leave
          </button>
        </div>
      </div>

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        {leaveBalances.map(bal => (
          <div key={bal.leave_type_id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{bal.leave_type_name}</span>
            <p className="text-3xl font-black text-brand-700 my-1">{bal.balance}</p>
            <p className="text-[11px] text-slate-500 font-medium">
              Used: {bal.used} / Quota: {bal.yearly_quota}
            </p>
          </div>
        ))}
      </div>

      {/* Tab 1: My Leave Requests */}
      {activeTab === 'my-leaves' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900">My Leave Applications</h3>

          {myRequests.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No leave requests"
              description="You have not applied for any leaves yet this year."
              actionText="Apply for Leave"
              onAction={() => setShowApplyModal(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4">Days</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">HR Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-800">{req.leave_type_name || req.leave_type_id}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {req.from_date} {req.from_date !== req.to_date ? `to ${req.to_date}` : ''}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{req.days} day(s)</td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{req.reason}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            req.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : req.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{req.review_remark || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: HR Approvals Tab */}
      {activeTab === 'approvals' && isHR && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900">Staff Leave Applications</h3>

          {allRequests.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No pending requests"
              description="All staff leave applications have been reviewed."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4">Days</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allRequests.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{req.employee_name || req.employee_id}</p>
                        <p className="text-[10px] text-slate-400">{req.department}</p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{req.leave_type_name || req.leave_type_id}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {req.from_date} to {req.to_date}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{req.days} day(s)</td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{req.reason}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            req.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : req.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {req.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => setSelectedRequestForReview(req)}
                            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition"
                          >
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Holiday Calendar */}
      {activeTab === 'holidays' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900">Academy Holiday Calendar</h3>
          {holidays.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No holidays listed"
              description="No official holidays configured in the calendar."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {holidays.map(h => (
                <div key={h.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex flex-col items-center justify-center font-bold text-xs">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">{h.name}</p>
                    <p className="text-xs text-slate-500">{h.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Apply Leave Modal */}
      <Modal isOpen={showApplyModal} onClose={() => setShowApplyModal(false)} title="Apply for Leave">
        <form onSubmit={handleApplyLeave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Leave Type *</label>
            <select
              value={leaveTypeId}
              onChange={e => setLeaveTypeId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            >
              {leaveTypes.map(t => (
                <option key={t.id || t.name} value={t.id || t.name}>
                  {t.name} (Quota: {t.yearly_quota} days)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">From Date *</label>
              <input
                type="date"
                required
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">To Date *</label>
              <input
                type="date"
                required
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isHalfDay}
                onChange={e => setIsHalfDay(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <span>Half Day Leave (0.5 day)</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Leave *</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="State the reason for your leave request..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isApplying}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50"
          >
            {isApplying ? 'Submitting...' : 'Submit Leave Request'}
          </button>
        </form>
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={!!selectedRequestForReview}
        onClose={() => setSelectedRequestForReview(null)}
        title="Review Leave Application"
      >
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
            <p className="font-bold text-slate-900">{selectedRequestForReview?.employee_name}</p>
            <p className="text-slate-600">
              {selectedRequestForReview?.leave_type_name} ({selectedRequestForReview?.days} day(s))
            </p>
            <p className="text-slate-600">Dates: {selectedRequestForReview?.from_date} to {selectedRequestForReview?.to_date}</p>
            <p className="text-slate-700 pt-1 font-medium">Reason: {selectedRequestForReview?.reason}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">HR Review Remarks</label>
            <textarea
              rows={2}
              value={reviewRemark}
              onChange={e => setReviewRemark(e.target.value)}
              placeholder="Enter remarks for approval or rejection..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={isReviewing}
              onClick={() => handleReview('Approved')}
              className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1"
            >
              <Check className="w-4 h-4" /> Approve Leave
            </button>
            <button
              type="button"
              disabled={isReviewing}
              onClick={() => handleReview('Rejected')}
              className="py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1"
            >
              <X className="w-4 h-4" /> Reject Leave
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
