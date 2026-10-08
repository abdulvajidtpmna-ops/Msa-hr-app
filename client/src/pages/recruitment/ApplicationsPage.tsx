import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Sparkles,
  Search,
  Filter,
  Eye,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  UserCheck,
  ChevronRight,
  Download,
  Share2,
  Key,
  ShieldAlert
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Application,
  Job,
  ScoreBreakdown,
  Interview,
  Offer,
  OnboardingDoc
} from '../../types';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';

const PIPELINE_STATUSES = [
  'Applied',
  'Screened',
  'Shortlisted',
  'Interview Scheduled',
  'Interviewed',
  'Selected',
  'Offer Sent',
  'Offer Accepted',
  'Documents Collected',
  'Joined'
];

export const ApplicationsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialJobId = searchParams.get('jobId') || '';

  const isHRManager = user?.role === 'HR Manager';

  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [isLoading, setIsLoading] = useState(true);

  // Selected candidate detail state
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [appDetails, setAppDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Auto Shortlist State
  const [isAutoScreening, setIsAutoScreening] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState<ScoreBreakdown | null>(null);

  // Interview Schedule State
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('10:00');
  const [interviewMode, setInterviewMode] = useState<'In-person' | 'Phone' | 'Video'>('In-person');
  const [interviewLocation, setInterviewLocation] = useState('MSA Campus, Kerala');
  const [isScheduling, setIsScheduling] = useState(false);
  const [interviewShareText, setInterviewShareText] = useState<string | null>(null);

  // Interview Feedback State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [activeInterviewId, setActiveInterviewId] = useState<string | null>(null);
  const [ratingComm, setRatingComm] = useState(4);
  const [ratingTech, setRatingTech] = useState(4);
  const [ratingAttitude, setRatingAttitude] = useState(4);
  const [ratingOverall, setRatingOverall] = useState(4);
  const [feedbackRemarks, setFeedbackRemarks] = useState('');
  const [recommendation, setRecommendation] = useState<'Hire' | 'Hold' | 'Reject'>('Hire');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Offer Letter State
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerDesignation, setOfferDesignation] = useState('');
  const [offerDepartment, setOfferDepartment] = useState('Academics');
  const [offerJoiningDate, setOfferJoiningDate] = useState('');
  const [offerSalaryBasic, setOfferSalaryBasic] = useState('20000');
  const [offerSalaryHra, setOfferSalaryHra] = useState('5000');
  const [isGeneratingOffer, setIsGeneratingOffer] = useState(false);

  // Onboarding Docs Checklist State
  const [showDocsModal, setShowDocsModal] = useState(false);

  // Appoint as Employee State (HR Manager only)
  const [showAppointModal, setShowAppointModal] = useState(false);
  const [appointRole, setAppointRole] = useState<'Employee' | 'HR Executive'>('Employee');
  const [appointPassword, setAppointPassword] = useState('');
  const [isAppointing, setIsAppointing] = useState(false);
  const [appointedCredentials, setAppointedCredentials] = useState<any>(null);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const [appsRes, jobsRes] = await Promise.all([
        api.get<{ success: boolean; applications: Application[] }>(
          `/recruitment/applications${selectedJobId ? `?jobId=${selectedJobId}` : ''}`
        ),
        api.get<{ success: boolean; jobs: Job[] }>('/recruitment/jobs')
      ]);

      if (appsRes.success) setApplications(appsRes.applications);
      if (jobsRes.success) setJobs(jobsRes.jobs);
    } catch (e) {}
    finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [selectedJobId]);

  const loadApplicationDetails = async (id: string) => {
    setActiveAppId(id);
    setIsLoadingDetails(true);
    try {
      const res = await api.get<{ success: boolean; application: Application; job: Job; timeline: any[]; interviews: any[]; offers: any[]; onboardingDocs: any[] }>(
        `/recruitment/applications/${id}`
      );
      if (res.success) {
        setAppDetails(res);
      }
    } catch (e) {}
    finally {
      setIsLoadingDetails(false);
    }
  };

  // Run Auto Shortlist
  const handleAutoShortlist = async () => {
    if (!selectedJobId) {
      alert('Please select a specific job from the dropdown filter to run Auto Screen & Shortlist.');
      return;
    }

    setIsAutoScreening(true);
    try {
      const res = await api.post('/recruitment/applications/auto-shortlist', { jobId: selectedJobId });
      if (res.success) {
        alert(res.message);
        fetchApplications();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to auto-shortlist');
    } finally {
      setIsAutoScreening(false);
    }
  };

  // Schedule Interview
  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppId) return;
    setIsScheduling(true);

    try {
      const res = await api.post(`/recruitment/applications/${activeAppId}/interview`, {
        date: interviewDate,
        time: interviewTime,
        mode: interviewMode,
        location_or_link: interviewLocation
      });

      if (res.success) {
        setInterviewShareText(res.shareMessage);
        fetchApplications();
        loadApplicationDetails(activeAppId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to schedule interview');
    } finally {
      setIsScheduling(false);
    }
  };

  // Submit Interview Feedback
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInterviewId) return;
    setIsSubmittingFeedback(true);

    try {
      const res = await api.post(`/recruitment/interviews/${activeInterviewId}/feedback`, {
        ratings: {
          communication: ratingComm,
          technical_skill: ratingTech,
          attitude: ratingAttitude,
          overall: ratingOverall
        },
        remarks: feedbackRemarks,
        recommendation
      });

      if (res.success) {
        setShowFeedbackModal(false);
        fetchApplications();
        if (activeAppId) loadApplicationDetails(activeAppId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record feedback');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Generate Offer
  const handleGenerateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppId) return;
    setIsGeneratingOffer(true);

    try {
      const res = await api.post(`/recruitment/applications/${activeAppId}/offer`, {
        designation: offerDesignation,
        department: offerDepartment,
        joining_date: offerJoiningDate,
        salary: {
          basic: Number(offerSalaryBasic) || 20000,
          hra: Number(offerSalaryHra) || 5000
        }
      });

      if (res.success) {
        setShowOfferModal(false);
        fetchApplications();
        loadApplicationDetails(activeAppId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create offer');
    } finally {
      setIsGeneratingOffer(false);
    }
  };

  // Appoint as Employee
  const handleAppointEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppId) return;
    setIsAppointing(true);

    try {
      const res = await api.post(`/recruitment/applications/${activeAppId}/appoint`, {
        role: appointRole,
        designation: offerDesignation || appDetails?.application?.qualification || 'Staff Member',
        department: offerDepartment,
        temporary_password: appointPassword || undefined
      });

      if (res.success) {
        setAppointedCredentials(res.credentials);
        fetchApplications();
        loadApplicationDetails(activeAppId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to appoint employee');
    } finally {
      setIsAppointing(false);
    }
  };

  const filteredApps = applications.filter(app => {
    if (selectedJobId && app.job_id !== selectedJobId) return false;
    if (selectedStatus && app.status !== selectedStatus) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (
        app.full_name.toLowerCase().includes(s) ||
        app.phone.includes(s) ||
        app.ref_no.toLowerCase().includes(s) ||
        (app.skills && app.skills.toLowerCase().includes(s))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Auto Shortlist Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" /> Candidate Pipeline & Screening
          </h2>
          <p className="text-xs text-slate-500">Auto-screen candidates, schedule interviews, generate offer letters, and appoint staff</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Table View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Kanban Pipeline
            </button>
          </div>

          <button
            type="button"
            disabled={isAutoScreening}
            onClick={handleAutoShortlist}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            {isAutoScreening ? 'Screening Candidates...' : 'Auto Screen & Shortlist'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate name, phone, ref no, skills..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
          />
        </div>

        <select
          value={selectedJobId}
          onChange={e => setSelectedJobId(e.target.value)}
          className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
        >
          <option value="">All Job Posts</option>
          {jobs.map(j => (
            <option key={j.id} value={j.id}>
              {j.title} ({j.department})
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
        >
          <option value="">All Pipeline Stages</option>
          {PIPELINE_STATUSES.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* View Mode: Table */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">Loading applications...</div>
          ) : filteredApps.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No candidates found"
              description="No applications match your selected filters. Share the public registration link to receive applications."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3.5 px-4">Candidate</th>
                    <th className="py-3.5 px-4">Job Role</th>
                    <th className="py-3.5 px-4">Match Score</th>
                    <th className="py-3.5 px-4">Experience & Qual</th>
                    <th className="py-3.5 px-4">Expected (₹)</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApps.map(app => {
                    const job = jobs.find(j => j.id === app.job_id);
                    let breakdown: ScoreBreakdown | null = null;
                    try {
                      if (app.score_breakdown_json) {
                        breakdown = typeof app.score_breakdown_json === 'string' ? JSON.parse(app.score_breakdown_json) : (app.score_breakdown_json as any);
                      }
                    } catch (e) {}

                    return (
                      <tr key={app.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{app.full_name}</p>
                          <p className="text-[11px] text-slate-500">{app.phone} • {app.ref_no}</p>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {job?.title || 'Job Post'}
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => breakdown && setSelectedBreakdown(breakdown)}
                            className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1 ${
                              Number(app.score) >= 60
                                ? 'bg-emerald-100 text-emerald-800'
                                : Number(app.score) >= 40
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <Sparkles className="w-3 h-3" /> {app.score || 0}%
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          {app.experience_years} yrs • {app.qualification}
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 font-semibold">
                          ₹{Number(app.expected_salary || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              app.status === 'Joined'
                                ? 'bg-emerald-100 text-emerald-700'
                                : app.status === 'Shortlisted'
                                ? 'bg-brand-100 text-brand-700'
                                : app.status === 'Interview Scheduled'
                                ? 'bg-blue-100 text-blue-700'
                                : app.status === 'Selected'
                                ? 'bg-purple-100 text-purple-700'
                                : app.status === 'Rejected'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => loadApplicationDetails(app.id)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
                          >
                            View & Process
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View Mode: Kanban Pipeline */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STATUSES.map(stage => {
            const stageApps = filteredApps.filter(a => a.status === stage);
            return (
              <div key={stage} className="min-w-[280px] max-w-[280px] bg-slate-100/70 rounded-3xl p-3 flex flex-col max-h-[75vh]">
                <div className="flex items-center justify-between px-2 py-1.5 mb-2">
                  <h4 className="font-bold text-xs text-slate-800">{stage}</h4>
                  <span className="px-2 py-0.5 bg-white text-slate-600 rounded-full text-[10px] font-bold shadow-sm">
                    {stageApps.length}
                  </span>
                </div>

                <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                  {stageApps.map(app => (
                    <div
                      key={app.id}
                      onClick={() => loadApplicationDetails(app.id)}
                      className="p-3 bg-white rounded-2xl border border-slate-200/60 shadow-sm cursor-pointer hover:border-brand-400 transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-brand-700">{app.ref_no}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-brand-50 text-brand-800 rounded">
                          {app.score}%
                        </span>
                      </div>
                      <p className="font-bold text-xs text-slate-900">{app.full_name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{app.qualification} • {app.experience_years} yrs</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Candidate Details Processing Modal */}
      <Modal
        isOpen={!!activeAppId}
        onClose={() => setActiveAppId(null)}
        title={appDetails?.application?.full_name ? `Candidate: ${appDetails.application.full_name} (${appDetails.application.ref_no})` : 'Candidate Details'}
        maxWidth="max-w-3xl"
      >
        {isLoadingDetails || !appDetails ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading candidate details...</div>
        ) : (
          <div className="space-y-6">
            {/* Status & Quick Action Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Current Stage</span>
                <p className="text-base font-black text-brand-700">{appDetails.application.status}</p>
              </div>

              {/* Action Buttons based on Stage */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowInterviewModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
                >
                  <Calendar className="w-3.5 h-3.5 inline mr-1" /> Schedule Interview
                </button>

                <button
                  type="button"
                  onClick={() => setShowOfferModal(true)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition"
                >
                  <DollarSign className="w-3.5 h-3.5 inline mr-1" /> Make Offer
                </button>

                {isHRManager && appDetails.application.status !== 'Joined' && (
                  <button
                    type="button"
                    onClick={() => setShowAppointModal(true)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition"
                  >
                    <UserCheck className="w-3.5 h-3.5 inline mr-1" /> Appoint as Employee
                  </button>
                )}
              </div>
            </div>

            {/* Candidate Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-semibold">Phone (WhatsApp)</span>
                <p className="font-bold text-slate-800 mt-0.5">{appDetails.application.phone}</p>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-semibold">Email</span>
                <p className="font-bold text-slate-800 mt-0.5 truncate">{appDetails.application.email}</p>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-semibold">Location</span>
                <p className="font-bold text-slate-800 mt-0.5">{appDetails.application.location}</p>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-semibold">Qualification</span>
                <p className="font-bold text-slate-800 mt-0.5">{appDetails.application.qualification} ({appDetails.application.specialization})</p>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-semibold">Experience</span>
                <p className="font-bold text-slate-800 mt-0.5">{appDetails.application.experience_years} years</p>
              </div>
              <div className="p-3 bg-white rounded-2xl border border-slate-100">
                <span className="text-slate-400 font-semibold">Expected Salary</span>
                <p className="font-bold text-slate-800 mt-0.5">₹{Number(appDetails.application.expected_salary || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Skills & Motivation */}
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl">
                <span className="font-bold text-slate-700">Skills:</span>
                <p className="text-slate-600 mt-0.5">{appDetails.application.skills}</p>
              </div>
              {appDetails.application.why_join && (
                <div className="p-3 bg-slate-50 rounded-2xl">
                  <span className="font-bold text-slate-700">Why Join Us:</span>
                  <p className="text-slate-600 mt-0.5">{appDetails.application.why_join}</p>
                </div>
              )}
            </div>

            {/* Interviews Scheduled & Feedbacks */}
            {appDetails.interviews && appDetails.interviews.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Interview Rounds & Feedback</h4>
                {appDetails.interviews.map((iv: Interview) => (
                  <div key={iv.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-start justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">
                        Round {iv.round} ({iv.mode}) - {iv.date} at {iv.time}
                      </p>
                      <p className="text-slate-500 mt-0.5">Venue/Link: {iv.location_or_link}</p>
                      {iv.recommendation && (
                        <p className="font-bold text-purple-700 mt-1">
                          Recommendation: {iv.recommendation} | Remarks: {iv.remarks}
                        </p>
                      )}
                    </div>
                    {iv.status === 'Scheduled' && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveInterviewId(iv.id);
                          setShowFeedbackModal(true);
                        }}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-xl font-bold text-xs"
                      >
                        Record Feedback
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Score Breakdown Modal */}
      <Modal isOpen={!!selectedBreakdown} onClose={() => setSelectedBreakdown(null)} title="Auto-Shortlisting Score Breakdown">
        {selectedBreakdown && (
          <div className="space-y-4 text-xs">
            <div className="text-center p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <span className="text-xs text-emerald-800 font-bold uppercase">Total Calculated Score</span>
              <p className="text-3xl font-black text-emerald-900 mt-1">{selectedBreakdown.total_score} / 100</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
                <span>Must-Have Skills (Max 40)</span>
                <span className="font-bold">{selectedBreakdown.must_have_score} pts</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
                <span>Experience Fit (Max 20)</span>
                <span className="font-bold">{selectedBreakdown.experience_score} pts</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
                <span>Qualification Fit (Max 15)</span>
                <span className="font-bold">{selectedBreakdown.qualification_score} pts</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
                <span>Nice-to-Have Skills (Max 10)</span>
                <span className="font-bold">{selectedBreakdown.nice_to_have_score} pts</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
                <span>Location, Salary & Notice Fit (Max 15)</span>
                <span className="font-bold">{selectedBreakdown.fit_score} pts</span>
              </div>
            </div>

            {selectedBreakdown.disqualification_reasons.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900">
                <p className="font-bold mb-1">Remarks & Observations:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {selectedBreakdown.disqualification_reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Schedule Interview Modal */}
      <Modal isOpen={showInterviewModal} onClose={() => { setShowInterviewModal(false); setInterviewShareText(null); }} title="Schedule Candidate Interview">
        {interviewShareText ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="font-bold text-base text-slate-900">Interview Scheduled!</h4>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 text-left">
              <p className="font-bold text-slate-500 mb-1">WhatsApp / Email Invitation Text:</p>
              <p className="whitespace-pre-line">{interviewShareText}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(interviewShareText);
                alert('Copied to clipboard!');
              }}
              className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs"
            >
              Copy Invitation Text
            </button>
          </div>
        ) : (
          <form onSubmit={handleScheduleInterview} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={interviewDate}
                  onChange={e => setInterviewDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Time *</label>
                <input
                  type="time"
                  required
                  value={interviewTime}
                  onChange={e => setInterviewTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mode *</label>
              <select
                value={interviewMode}
                onChange={e => setInterviewMode(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="In-person">In-person (Office)</option>
                <option value="Video">Video Call (Google Meet / Zoom)</option>
                <option value="Phone">Phone Call</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Location or Video Link *</label>
              <input
                type="text"
                required
                value={interviewLocation}
                onChange={e => setInterviewLocation(e.target.value)}
                placeholder="e.g. Mastered Skill Academy Campus, Room 101"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isScheduling}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50"
            >
              {isScheduling ? 'Scheduling...' : 'Confirm & Schedule Interview'}
            </button>
          </form>
        )}
      </Modal>

      {/* Record Feedback Modal */}
      <Modal isOpen={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} title="Record Interview Feedback">
        <form onSubmit={handleSubmitFeedback} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Communication (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={ratingComm}
                onChange={e => setRatingComm(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Technical Skill (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={ratingTech}
                onChange={e => setRatingTech(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Attitude (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={ratingAttitude}
                onChange={e => setRatingAttitude(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Overall Rating (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={ratingOverall}
                onChange={e => setRatingOverall(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Recommendation</label>
            <select
              value={recommendation}
              onChange={e => setRecommendation(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            >
              <option value="Hire">Hire (Select for Offer)</option>
              <option value="Hold">On Hold</option>
              <option value="Reject">Reject</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Remarks & Notes</label>
            <textarea
              rows={2}
              value={feedbackRemarks}
              onChange={e => setFeedbackRemarks(e.target.value)}
              placeholder="Candidate strengths and review notes..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmittingFeedback}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm shadow-md transition"
          >
            {isSubmittingFeedback ? 'Saving...' : 'Save Feedback'}
          </button>
        </form>
      </Modal>

      {/* Offer Modal */}
      <Modal isOpen={showOfferModal} onClose={() => setShowOfferModal(false)} title="Generate Offer Letter">
        <form onSubmit={handleGenerateOffer} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Designation *</label>
            <input
              type="text"
              required
              value={offerDesignation}
              onChange={e => setOfferDesignation(e.target.value)}
              placeholder="e.g. Trainer / Faculty"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={offerDepartment}
                onChange={e => setOfferDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Joining Date</label>
              <input
                type="date"
                value={offerJoiningDate}
                onChange={e => setOfferJoiningDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Basic (₹)</label>
              <input
                type="number"
                value={offerSalaryBasic}
                onChange={e => setOfferSalaryBasic(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Monthly HRA (₹)</label>
              <input
                type="number"
                value={offerSalaryHra}
                onChange={e => setOfferSalaryHra(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isGeneratingOffer}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm shadow-md transition"
          >
            {isGeneratingOffer ? 'Generating PDF...' : 'Generate Offer Letter PDF & Save to Drive'}
          </button>
        </form>
      </Modal>

      {/* Appoint as Employee Modal (HR Manager Only) */}
      <Modal
        isOpen={showAppointModal}
        onClose={() => { setShowAppointModal(false); setAppointedCredentials(null); }}
        title="Appoint Candidate as Employee"
      >
        {appointedCredentials ? (
          <div className="space-y-4 text-center">
            <UserCheck className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="font-bold text-base text-slate-900">Employee Account Created!</h4>
            <p className="text-xs text-slate-600">Please share these initial login credentials with the staff member:</p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left text-xs space-y-1.5 font-mono">
              <p><span className="text-slate-500">Employee ID:</span> <strong>{appointedCredentials.employee_id}</strong></p>
              <p><span className="text-slate-500">Login Email:</span> <strong>{appointedCredentials.email}</strong></p>
              <p><span className="text-slate-500">Temp Password:</span> <strong>{appointedCredentials.temporary_password}</strong></p>
              <p><span className="text-slate-500">Assigned Role:</span> <strong>{appointedCredentials.role}</strong></p>
            </div>

            <button
              type="button"
              onClick={() => {
                const text = `Welcome to Mastered Skill Academy!\nYour employee portal account has been created:\nEmployee ID: ${appointedCredentials.employee_id}\nEmail: ${appointedCredentials.email}\nTemporary Password: ${appointedCredentials.temporary_password}\nPortal Link: ${window.location.origin}/login`;
                navigator.clipboard.writeText(text);
                alert('Credentials copied to clipboard!');
              }}
              className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs"
            >
              Copy Credentials for WhatsApp
            </button>
          </div>
        ) : (
          <form onSubmit={handleAppointEmployee} className="space-y-4">
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900">
              <p className="font-bold">One-Click Staff Onboarding</p>
              <p className="mt-0.5">This converts the candidate to an active employee, generates an ID (e.g. MSA-0004), and creates a user login account.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assign User Role *</label>
              <select
                value={appointRole}
                onChange={e => setAppointRole(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="Employee">Employee (Staff Access)</option>
                <option value="HR Executive">HR Executive (Recruitment & Ops)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Temporary Password (Optional)</label>
              <input
                type="text"
                value={appointPassword}
                onChange={e => setAppointPassword(e.target.value)}
                placeholder="Leave blank to auto-generate secure password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isAppointing}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50"
            >
              {isAppointing ? 'Creating Employee Profile...' : 'Confirm & Appoint Employee'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
};
