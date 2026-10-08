import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Briefcase,
  Plus,
  Share2,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Users,
  Settings,
  Calendar,
  MapPin,
  Clock,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { Job, CustomFieldConfig, JobCriteria } from '../../types';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';

export const JobsPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedJobForQr, setSelectedJobForQr] = useState<Job | null>(null);

  // Create Job Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Academics');
  const [location, setLocation] = useState('Kerala, India');
  const [type, setType] = useState('Full-time');
  const [vacancies, setVacancies] = useState('1');
  const [description, setDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [qualification, setQualification] = useState('B.Tech');
  const [minExperience, setMinExperience] = useState('2');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [preferredSkills, setPreferredSkills] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [lastDate, setLastDate] = useState('');
  const [status, setStatus] = useState<'Draft' | 'Open' | 'Closed'>('Open');
  const [threshold, setThreshold] = useState('60');

  // Screening Criteria
  const [mustHaveSkills, setMustHaveSkills] = useState('');
  const [niceToHaveSkills, setNiceToHaveSkills] = useState('');

  // Custom Form Questions
  const [customQuestions, setCustomQuestions] = useState<CustomFieldConfig[]>([]);
  const [newQuestionLabel, setNewQuestionLabel] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<'short_text' | 'long_text' | 'number' | 'dropdown' | 'yes_no'>('short_text');
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);

  const [isCreating, setIsCreating] = useState(false);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ success: boolean; jobs: Job[] }>('/recruitment/jobs');
      if (res.success) setJobs(res.jobs);
    } catch (e) {}
    finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleCopyLink = (slug: string, id: string) => {
    const url = `${window.location.origin}/apply/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddQuestion = () => {
    if (!newQuestionLabel) return;
    const q: CustomFieldConfig = {
      id: `q_${Date.now()}`,
      label: newQuestionLabel,
      type: newQuestionType,
      required: newQuestionRequired
    };
    setCustomQuestions([...customQuestions, q]);
    setNewQuestionLabel('');
    setNewQuestionRequired(false);
  };

  const handleRemoveQuestion = (id: string) => {
    setCustomQuestions(customQuestions.filter(q => q.id !== id));
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    const criteria: JobCriteria = {
      must_have_skills: mustHaveSkills.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean),
      nice_to_have_skills: niceToHaveSkills.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean),
      min_experience: Number(minExperience) || 0,
      required_qualification: qualification,
      threshold_score: Number(threshold) || 60
    };

    try {
      const res = await api.post('/recruitment/jobs', {
        title,
        department,
        location,
        type,
        vacancies,
        description,
        responsibilities,
        qualification,
        min_experience: minExperience,
        required_skills: requiredSkills,
        preferred_skills: preferredSkills,
        salary_range: salaryRange,
        last_date: lastDate,
        status,
        threshold,
        criteria,
        form_config: customQuestions
      });

      if (res.success) {
        setShowCreateModal(false);
        fetchJobs();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create job');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-brand-600" /> Hiring & Job Openings
          </h2>
          <p className="text-xs text-slate-500">Create positions, share public apply links, and manage recruitment pipeline</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/recruitment/applications"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
          >
            <Users className="w-4 h-4 inline mr-1" /> View Candidate Pipeline
          </Link>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            <Plus className="w-4 h-4" /> Create Job Opening
          </button>
        </div>
      </div>

      {/* Jobs Grid */}
      {isLoading ? (
        <div className="py-12 text-center">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs created yet"
          description="Create your first hiring post to generate a shareable registration link and QR code."
          actionText="Create Job Post"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {jobs.map(job => {
            const publicUrl = `${window.location.origin}/apply/${job.slug}`;
            return (
              <div
                key={job.id}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:border-brand-200 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      {job.department}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        job.status === 'Open'
                          ? 'bg-emerald-100 text-emerald-700'
                          : job.status === 'Draft'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 line-clamp-1">{job.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {job.location} • {job.type}
                  </p>

                  <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                    <p className="text-slate-600">
                      <strong>Min Exp:</strong> {job.min_experience} yrs | <strong>Qual:</strong> {job.qualification}
                    </p>
                    <p className="text-slate-600">
                      <strong>Vacancies:</strong> {job.vacancies} | <strong>Threshold:</strong> {job.threshold}%
                    </p>
                  </div>
                </div>

                {/* Shareable Link Box */}
                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(job.slug, job.id)}
                      className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition"
                    >
                      {copiedId === job.id ? <Check className="w-3.5 h-3.5 text-brand-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === job.id ? 'Copied' : 'Copy Apply Link'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedJobForQr(job)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition"
                      title="Show QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>

                    <a
                      href={`/apply/${job.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-brand-600 hover:bg-brand-50 rounded-xl transition"
                      title="Open Public Form"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <Link
                    to={`/recruitment/applications?jobId=${job.id}`}
                    className="block w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold text-center shadow-sm transition"
                  >
                    View Applications & Auto-Screen
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Job Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Job Posting" maxWidth="max-w-2xl">
        <form onSubmit={handleCreateJob} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Job Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Senior Faculty - Full Stack Web Development"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
              <select
                value={department}
                onChange={e => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="Academics">Academics & Training</option>
                <option value="Administration">Administration & HR</option>
                <option value="Marketing">Marketing & Admissions</option>
                <option value="Operations">Operations</option>
                <option value="IT Support">IT Support</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Work Location *</label>
              <input
                type="text"
                required
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Employment Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Intern">Intern</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Vacancies</label>
              <input
                type="number"
                min="1"
                value={vacancies}
                onChange={e => setVacancies(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Job Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Key role summary..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Responsibilities</label>
              <textarea
                rows={2}
                value={responsibilities}
                onChange={e => setResponsibilities(e.target.value)}
                placeholder="Day to day duties..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          {/* Section: Screening Criteria */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Auto-Shortlisting Screening Rules
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Must-Have Skills (Mandatory match) *</label>
                <input
                  type="text"
                  value={mustHaveSkills}
                  onChange={e => setMustHaveSkills(e.target.value)}
                  placeholder="React, TypeScript, Node.js (comma separated)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nice-To-Have Skills (Bonus pts)</label>
                <input
                  type="text"
                  value={niceToHaveSkills}
                  onChange={e => setNiceToHaveSkills(e.target.value)}
                  placeholder="Tailwind, Docker (comma separated)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Minimum Experience (Years)</label>
                <input
                  type="number"
                  step="0.5"
                  value={minExperience}
                  onChange={e => setMinExperience(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Shortlist Threshold Score (%)</label>
                <input
                  type="number"
                  value={threshold}
                  onChange={e => setThreshold(e.target.value)}
                  placeholder="Default 60"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section: Custom Questions Builder */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wider">Custom Form Questions (Optional)</h4>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={newQuestionLabel}
                onChange={e => setNewQuestionLabel(e.target.value)}
                placeholder="Question title e.g. Do you have a two-wheeler?"
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
              />
              <select
                value={newQuestionType}
                onChange={e => setNewQuestionType(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              >
                <option value="short_text">Short Text</option>
                <option value="long_text">Long Text</option>
                <option value="number">Number</option>
                <option value="yes_no">Yes / No</option>
              </select>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Add Question
              </button>
            </div>

            {customQuestions.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {customQuestions.map(q => (
                  <div key={q.id} className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                    <span>
                      {q.label} <span className="text-slate-400">({q.type})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(q.id)}
                      className="text-rose-600 font-bold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="w-full mt-4 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-md transition disabled:opacity-50"
          >
            {isCreating ? 'Publishing Job Opening...' : 'Publish Job & Generate Public Form'}
          </button>
        </form>
      </Modal>

      {/* QR Code Modal */}
      <Modal isOpen={!!selectedJobForQr} onClose={() => setSelectedJobForQr(null)} title="Public Job Application QR Code">
        {selectedJobForQr && (
          <div className="flex flex-col items-center p-4 text-center">
            <h4 className="font-bold text-sm text-slate-900 mb-1">{selectedJobForQr.title}</h4>
            <p className="text-xs text-slate-500 mb-4">{selectedJobForQr.department}</p>
            <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-md mb-4">
              <QRCodeSVG value={`${window.location.origin}/apply/${selectedJobForQr.slug}`} size={200} />
            </div>
            <button
              type="button"
              onClick={() => handleCopyLink(selectedJobForQr.slug, selectedJobForQr.id)}
              className="w-full py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold"
            >
              {copiedId === selectedJobForQr.id ? 'Link Copied!' : 'Copy Direct Application Link'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};
