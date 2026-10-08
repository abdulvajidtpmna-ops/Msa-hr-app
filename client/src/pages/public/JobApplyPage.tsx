import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Briefcase,
  MapPin,
  Clock,
  Share2,
  Copy,
  Check,
  QrCode,
  Upload,
  AlertCircle,
  FileText,
  Building2,
  Calendar,
  Send
} from 'lucide-react';
import { api } from '../../services/api';
import { Job, CustomFieldConfig } from '../../types';
import { Modal } from '../../components/common/Modal';

export const JobApplyPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [closedMessage, setClosedMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [location, setLocation] = useState('');
  const [qualification, setQualification] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experienceYears, setExperienceYears] = useState('0');
  const [currentEmployer, setCurrentEmployer] = useState('');
  const [skills, setSkills] = useState('');
  const [currentSalary, setCurrentSalary] = useState('');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('0');
  const [whyJoin, setWhyJoin] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({});
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState(''); // Spam protection trap

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shareUrl = window.location.href;

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await api.get<{ success: boolean; job: Job; closed?: boolean; message?: string }>(
          `/recruitment/jobs/public/${slug}`
        );
        if (res.closed) {
          setClosedMessage(res.message || 'Applications are currently closed for this position.');
          setJob(res.job);
        } else if (res.success && res.job) {
          setJob(res.job);
        } else {
          setError('Job posting not found');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load job details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJob();
  }, [slug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = `Hiring at Mastered Skill Academy: ${job?.title} in ${job?.department}. Apply online here: ${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setCustomAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile) {
      alert('Please upload your resume (PDF/DOC)');
      return;
    }
    if (!consent) {
      alert('Please accept the data processing consent');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('full_name', fullName);
      formData.append('phone', phone);
      formData.append('email', email);
      formData.append('dob', dob);
      formData.append('gender', gender);
      formData.append('location', location);
      formData.append('qualification', qualification);
      formData.append('specialization', specialization);
      formData.append('experience_years', experienceYears);
      formData.append('current_employer', currentEmployer);
      formData.append('skills', skills);
      formData.append('current_salary', currentSalary);
      formData.append('expected_salary', expectedSalary);
      formData.append('notice_period', noticePeriod);
      formData.append('why_join', whyJoin);
      formData.append('custom_answers', JSON.stringify(customAnswers));
      formData.append('website_trap', honeypot); // Honeypot trap
      formData.append('resume', resumeFile);
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await api.post<{ success: boolean; ref_no: string; message: string }>(
        `/recruitment/jobs/public/${slug}/apply`,
        formData
      );

      if (res.success) {
        navigate(`/apply/${slug}/thank-you?ref=${res.ref_no}&name=${encodeURIComponent(fullName)}&job=${encodeURIComponent(job?.title || '')}`);
      } else {
        setError(res.message || 'Failed to submit application');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  let customFields: CustomFieldConfig[] = [];
  try {
    if (job?.form_config_json) {
      customFields = typeof job.form_config_json === 'string' ? JSON.parse(job.form_config_json) : (job.form_config_json as any);
    }
  } catch (e) {}

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border border-slate-200 shadow-xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900">Job Posting Unavailable</h2>
          <p className="text-sm text-slate-500 mt-2">{error || 'This job opening does not exist.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-700 p-1.5 flex items-center justify-center">
              <img src="/logo.png" alt="MSA Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-slate-900 leading-tight">Mastered Skill Academy</h1>
              <p className="text-[10px] text-brand-700 font-semibold uppercase tracking-wider">Careers Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-brand-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Link Copied' : 'Copy Link'}</span>
            </button>
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-xl transition"
              title="Show QR Code"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto px-4 mt-6 space-y-6">
        {/* Job Summary Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-xs font-bold uppercase tracking-wider border border-brand-200">
              {job.department}
            </span>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Apply before {job.last_date || 'Open'}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">{job.title}</h2>

          <div className="flex flex-wrap gap-4 mt-4 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-slate-400" /> {job.location}
            </div>
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-slate-400" /> {job.type}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" /> Min {job.min_experience} yrs exp
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-400" /> {job.vacancies} opening(s)
            </div>
          </div>

          {job.description && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Role Overview</h4>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{job.description}</p>
            </div>
          )}

          {job.responsibilities && (
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Key Responsibilities</h4>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{job.responsibilities}</p>
            </div>
          )}
        </div>

        {/* Closed Job Alert or Application Form */}
        {closedMessage ? (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-center text-amber-900">
            <AlertCircle className="w-8 h-8 mx-auto text-amber-600 mb-2" />
            <h3 className="font-bold text-base">Applications Closed</h3>
            <p className="text-xs text-amber-700 mt-1">{closedMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">Candidate Application Form</h3>
              <p className="text-xs text-slate-500 mt-0.5">Please provide accurate details for screening.</p>
            </div>

            {/* Hidden honeypot field for spam prevention */}
            <input
              type="text"
              name="website_trap"
              value={honeypot}
              onChange={e => setHoneypot(e.target.value)}
              className="hidden"
              autoComplete="off"
              tabIndex={-1}
            />

            {/* Section 1: Personal Information */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wider">1. Personal Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g. name@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Current Location / District *</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Kochi, Ernakulam"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Education & Experience */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wider">2. Qualifications & Experience</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Highest Qualification *</label>
                  <input
                    type="text"
                    required
                    value={qualification}
                    onChange={e => setQualification(e.target.value)}
                    placeholder="e.g. B.Tech, MCA, MBA, B.Sc"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Specialization / Department</label>
                  <input
                    type="text"
                    value={specialization}
                    onChange={e => setSpecialization(e.target.value)}
                    placeholder="e.g. Computer Science, Finance"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Experience (in Years) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={experienceYears}
                    onChange={e => setExperienceYears(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Current / Last Employer</label>
                  <input
                    type="text"
                    value={currentEmployer}
                    onChange={e => setCurrentEmployer(e.target.value)}
                    placeholder="e.g. ABC Technologies"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Key Skills & Tools *</label>
                  <input
                    type="text"
                    required
                    value={skills}
                    onChange={e => setSkills(e.target.value)}
                    placeholder="e.g. Python, Teaching, JavaScript, Accounting (comma separated)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Current Monthly Salary (₹)</label>
                  <input
                    type="number"
                    value={currentSalary}
                    onChange={e => setCurrentSalary(e.target.value)}
                    placeholder="e.g. 25000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expected Monthly Salary (₹) *</label>
                  <input
                    type="number"
                    required
                    value={expectedSalary}
                    onChange={e => setExpectedSalary(e.target.value)}
                    placeholder="e.g. 35000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Notice Period (in Days) *</label>
                  <input
                    type="number"
                    required
                    value={noticePeriod}
                    onChange={e => setNoticePeriod(e.target.value)}
                    placeholder="e.g. 15 or 30"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Why do you want to join Mastered Skill Academy?</label>
                  <textarea
                    rows={2}
                    value={whyJoin}
                    onChange={e => setWhyJoin(e.target.value)}
                    placeholder="Briefly describe your motivation..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Custom Questions */}
            {customFields.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wider">3. Additional Questions</h4>
                <div className="space-y-3">
                  {customFields.map(field => (
                    <div key={field.id}>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {field.label} {field.required && '*'}
                      </label>
                      {field.type === 'dropdown' ? (
                        <select
                          required={field.required}
                          value={customAnswers[field.id] || ''}
                          onChange={e => handleCustomFieldChange(field.id, e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                        >
                          <option value="">Select an option</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'yes_no' ? (
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="radio"
                              name={field.id}
                              value="Yes"
                              checked={customAnswers[field.id] === 'Yes'}
                              onChange={e => handleCustomFieldChange(field.id, e.target.value)}
                            />
                            Yes
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="radio"
                              name={field.id}
                              value="No"
                              checked={customAnswers[field.id] === 'No'}
                              onChange={e => handleCustomFieldChange(field.id, e.target.value)}
                            />
                            No
                          </label>
                        </div>
                      ) : field.type === 'long_text' ? (
                        <textarea
                          rows={2}
                          required={field.required}
                          value={customAnswers[field.id] || ''}
                          onChange={e => handleCustomFieldChange(field.id, e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : 'text'}
                          required={field.required}
                          value={customAnswers[field.id] || ''}
                          onChange={e => handleCustomFieldChange(field.id, e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 4: Document Uploads & Consent */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-brand-700 uppercase tracking-wider">4. Document Uploads</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Resume / CV (PDF or DOC, Max 5MB) *</label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.doc,.docx"
                    onChange={e => setResumeFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Passport Photo (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setPhotoFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={e => setConsent(e.target.checked)}
                    className="mt-0.5 rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>
                    I confirm that the information provided is true and accurate. I consent to Mastered Skill Academy processing my personal data for recruitment and hiring purposes in accordance with data privacy standards.
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-base shadow-xl shadow-brand-600/30 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                'Submitting Application & Uploading to Drive...'
              ) : (
                <>
                  <Send className="w-5 h-5" /> Submit Application
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* QR Code Modal */}
      <Modal isOpen={showQrModal} onClose={() => setShowQrModal(false)} title="Scan & Share Application Link">
        <div className="flex flex-col items-center p-4 text-center">
          <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-md mb-4">
            <QRCodeSVG value={shareUrl} size={200} />
          </div>
          <p className="text-xs text-slate-600 font-semibold mb-4">
            Candidates can scan this QR code with their mobile phone camera to open and submit the registration form.
          </p>
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold"
          >
            {copied ? 'Link Copied!' : 'Copy Direct Link'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
