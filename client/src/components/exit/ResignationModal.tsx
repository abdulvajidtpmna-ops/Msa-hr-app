import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Send,
  ShieldAlert,
  Info,
  Check
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { ExitRequest } from '../../types';

interface ResignationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export const ResignationModal: React.FC<ResignationModalProps> = ({
  isOpen,
  onClose,
  onSubmitted
}) => {
  const [existingRequest, setExistingRequest] = useState<ExitRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form fields
  const [resignationDate, setResignationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [noticePeriodDays, setNoticePeriodDays] = useState(30);
  const [proposedLastDay, setProposedLastDay] = useState('');
  const [reason, setReason] = useState('Career Growth');
  const [reasonDetails, setReasonDetails] = useState('');
  const [confirmTerms, setConfirmTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Auto-calculate proposed last working day based on notice period
  useEffect(() => {
    if (resignationDate && noticePeriodDays) {
      const dt = new Date(resignationDate);
      dt.setDate(dt.getDate() + Number(noticePeriodDays));
      setProposedLastDay(dt.toISOString().split('T')[0]);
    }
  }, [resignationDate, noticePeriodDays]);

  const fetchExisting = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ success: boolean; request: ExitRequest | null }>('/exit/my-resignation');
      if (res.success) {
        setExistingRequest(res.request);
      }
    } catch (e) {
      console.warn('Failed to fetch existing exit request', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchExisting();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmTerms) {
      alert('Please confirm that you understand the resignation and notice period terms.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/exit/resignation', {
        resignation_date: resignationDate,
        notice_period_days: noticePeriodDays,
        proposed_last_working_day: proposedLastDay,
        reason,
        reason_details: reasonDetails
      });

      if (res.success) {
        alert('Resignation submitted successfully. Your HR manager has been notified.');
        fetchExisting();
        if (onSubmitted) onSubmitted();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit resignation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!confirm('Are you sure you want to withdraw your resignation request?')) return;
    setIsWithdrawing(true);
    try {
      const res = await api.post('/exit/withdraw');
      if (res.success) {
        alert('Resignation withdrawn successfully.');
        setExistingRequest(null);
        if (onSubmitted) onSubmitted();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to withdraw resignation');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const reasonsList = [
    'Career Growth / New Opportunity',
    'Higher Studies / Education',
    'Relocation / Moving City',
    'Personal & Family Commitments',
    'Health / Medical Reasons',
    'Compensation & Growth',
    'Career Switch / Entrepreneurship',
    'Other'
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Employee Resignation & Exit Portal"
      maxWidth="max-w-2xl"
    >
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Checking your exit records...</p>
        </div>
      ) : existingRequest && !['Withdrawn', 'Rejected'].includes(String(existingRequest.status)) ? (
        /* Active or Completed Resignation Tracker */
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Resignation Status: <span className="underline">{existingRequest.status}</span>
              </h4>
              <p className="text-xs text-amber-700 mt-1">
                Submitted on {existingRequest.resignation_date} • Proposed Last Working Day:{' '}
                <strong>{existingRequest.approved_last_working_day || existingRequest.proposed_last_working_day}</strong>
              </p>
            </div>
          </div>

          {/* Stepper Progress */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
              Exit & Offboarding Progress
            </h5>

            <div className="space-y-4">
              {/* Step 1: Submission */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">Resignation Submitted</p>
                  <p className="text-[11px] text-slate-500">
                    Reason: {existingRequest.reason} ({existingRequest.resignation_date})
                  </p>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  Done
                </span>
              </div>

              {/* Step 2: HR Review */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    existingRequest.status === 'Pending Review'
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-emerald-500 text-white'
                  }`}
                >
                  {existingRequest.status === 'Pending Review' ? <Clock className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">HR Review & Last Day Confirmation</p>
                  <p className="text-[11px] text-slate-500">
                    {existingRequest.status === 'Pending Review'
                      ? 'Pending HR Approval'
                      : `Approved: LWD is ${existingRequest.approved_last_working_day || existingRequest.proposed_last_working_day}`}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    existingRequest.status === 'Pending Review'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  {existingRequest.status === 'Pending Review' ? 'In Review' : 'Approved'}
                </span>
              </div>

              {/* Step 3: Clearances NOC */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    ['Clearance In Progress', 'Completed / Exited'].includes(String(existingRequest.status))
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">Department & Asset Clearance (NOC)</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        existingRequest.dept_clearance ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Dept: {existingRequest.dept_clearance ? '✓ Done' : 'Pending'}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        existingRequest.it_clearance ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      IT: {existingRequest.it_clearance ? '✓ Done' : 'Pending'}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        existingRequest.finance_clearance ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Finance: {existingRequest.finance_clearance ? '✓ Done' : 'Pending'}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        existingRequest.admin_clearance ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Admin: {existingRequest.admin_clearance ? '✓ Done' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 4: Final Settlement & Completion */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    existingRequest.status === 'Completed / Exited'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-900">FnF Settlement & Relieving Certificate</p>
                  <p className="text-[11px] text-slate-500">
                    FnF Status: <strong>{existingRequest.fnf_status || 'Pending'}</strong> • Relieving Letter:{' '}
                    {existingRequest.relieving_letter_issued ? 'Issued' : 'Pending final exit'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Reason Notes */}
          {existingRequest.reason_details && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              <span className="font-bold text-slate-700 block mb-1">Your Submission Notes:</span>
              <p className="text-slate-600 whitespace-pre-wrap">{existingRequest.reason_details}</p>
            </div>
          )}

          {/* Withdraw Option if still pending review */}
          {existingRequest.status === 'Pending Review' && (
            <div className="pt-2 flex justify-between items-center border-t border-slate-100">
              <p className="text-xs text-slate-500">Changed your mind before HR reviews it?</p>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={isWithdrawing}
                className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition"
              >
                {isWithdrawing ? 'Withdrawing...' : 'Withdraw Resignation'}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Fresh Resignation Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-sky-900 space-y-1">
              <p className="font-bold">Notice Period Policy:</p>
              <p>
                Standard notice period is <strong>30 days</strong>. Submitting this form formally initiates your exit
                process. Your reporting manager and HR will review your requested last working day and coordinate
                project handover and clearances.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Resignation Date</label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={resignationDate}
                  onChange={e => setResignationDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-brand-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Notice Period (Days)</label>
              <input
                type="number"
                min="0"
                max="180"
                required
                value={noticePeriodDays}
                onChange={e => setNoticePeriodDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-brand-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Proposed Last Working Day (Auto-calculated)
            </label>
            <input
              type="date"
              required
              value={proposedLastDay}
              onChange={e => setProposedLastDay(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-brand-800 focus:outline-brand-600"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              You can adjust this date if you are requesting an early release or buyout.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Primary Reason for Leaving</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-brand-600"
            >
              {reasonsList.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Detailed Reason / Resignation Letter
            </label>
            <textarea
              rows={4}
              required
              placeholder="Please provide details regarding your decision, key project status, and any handover notes..."
              value={reasonDetails}
              onChange={e => setReasonDetails(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-brand-600 placeholder:text-slate-400"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
            <input
              type="checkbox"
              id="confirmTerms"
              checked={confirmTerms}
              onChange={e => setConfirmTerms(e.target.checked)}
              className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="confirmTerms" className="text-xs text-slate-600 leading-snug cursor-pointer select-none">
              I confirm that I wish to submit my formal resignation to Mastered Skill Academy and agree to complete
              the handover and clearance requirements during my notice period.
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !confirmTerms}
              className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50 transition shadow-md shadow-rose-600/20 flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Submitting...' : 'Submit Formal Resignation'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
