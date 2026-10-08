import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { SheetsRepo } from '../services/sheetsRepo';
import { DriveStorage } from '../services/driveStorage';
import { PdfService } from '../services/pdfService';
import { AuditService } from '../services/auditService';
import { calculateMatchScore } from '../utils/scoringEngine';
import { hashPassword } from '../utils/crypto';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { publicFormLimiter } from '../middleware/rateLimit';
import {
  Job,
  Application,
  ApplicationStatusLog,
  Interview,
  Offer,
  OnboardingDoc,
  Employee,
  User,
  JobCriteria,
  ScoreBreakdown
} from '../types';

const router = Router();
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// -------------------------------------------------------------
// PUBLIC RECRUITMENT ROUTES (No login required)
// -------------------------------------------------------------

/**
 * Get job details & custom questions by slug for public registration page
 */
router.get('/jobs/public/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const jobs = await SheetsRepo.list<Job>('Jobs');
    const job = jobs.find(j => j.slug === slug);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job posting not found' });
    }

    if (job.status !== 'Open') {
      return res.status(200).json({
        success: true,
        closed: true,
        job: {
          title: job.title,
          department: job.department,
          status: job.status
        },
        message: 'Applications are currently closed for this position.'
      });
    }

    // Check last date
    if (job.last_date) {
      const lastDate = new Date(job.last_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (lastDate < today) {
        return res.status(200).json({
          success: true,
          closed: true,
          job: {
            title: job.title,
            department: job.department,
            status: 'Closed'
          },
          message: 'The deadline for this job posting has passed.'
        });
      }
    }

    let formConfig = [];
    try {
      formConfig = typeof job.form_config_json === 'string' ? JSON.parse(job.form_config_json) : (job.form_config_json || []);
    } catch (e) {}

    return res.json({
      success: true,
      closed: false,
      job: {
        id: job.id,
        title: job.title,
        slug: job.slug,
        department: job.department,
        location: job.location,
        type: job.type,
        vacancies: job.vacancies,
        description: job.description,
        responsibilities: job.responsibilities,
        qualification: job.qualification,
        min_experience: job.min_experience,
        required_skills: job.required_skills,
        preferred_skills: job.preferred_skills,
        last_date: job.last_date,
        form_config: formConfig
      }
    });
  } catch (err: any) {
    console.error('Public job fetch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load job details' });
  }
});

/**
 * Public application submission with resume upload, honeypot & duplicate checks
 */
router.post(
  '/jobs/public/:slug/apply',
  publicFormLimiter,
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'photo', maxCount: 1 }
  ]),
  async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const body = req.body;

      // 1. Spam check: Honeypot field
      if (body.website_trap || body.hp_field) {
        return res.status(400).json({ success: false, message: 'Spam submission detected' });
      }

      // 2. Validate Job
      const jobs = await SheetsRepo.list<Job>('Jobs');
      const job = jobs.find(j => j.slug === slug);
      if (!job || job.status !== 'Open') {
        return res.status(400).json({ success: false, message: 'Job is not open for applications' });
      }

      // 3. Required Fields
      const { full_name, phone, email, dob, gender, location, qualification, specialization, experience_years } = body;
      if (!full_name || !phone || !email || !qualification) {
        return res.status(400).json({ success: false, message: 'Please fill in all mandatory fields' });
      }

      // 4. Duplicate Check (same phone or email for the same job)
      const existingApps = await SheetsRepo.list<Application>('Applications');
      const isDuplicate = existingApps.some(
        a => a.job_id === job.id && (a.phone === phone.trim() || a.email.toLowerCase() === email.trim().toLowerCase())
      );
      if (isDuplicate) {
        return res.status(409).json({
          success: false,
          message: 'An application with this phone number or email address has already been submitted for this position.'
        });
      }

      // 5. Check Files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const resumeFile = files?.resume?.[0];
      const photoFile = files?.photo?.[0];

      if (!resumeFile) {
        return res.status(400).json({ success: false, message: 'Resume document (PDF/DOC) is required' });
      }

      // Generate Reference Number (e.g. MSA-APP-2026-0001)
      const refNo = `APP-${Math.floor(1000 + Math.random() * 9000)}`;

      // 6. Upload files to Drive: Mastered Skill Academy HR / Recruitment / <JobSlug> / <ApplicationRef - Name>
      let resumeDriveId = '';
      let photoDriveId = '';

      try {
        const candidateFolderId = await DriveStorage.resolveFolderPath([
          'Mastered Skill Academy HR',
          'Recruitment',
          job.slug || job.id,
          `${refNo} - ${full_name.trim()}`
        ]);

        const resumeUpload = await DriveStorage.uploadFile(
          `${refNo}_Resume_${resumeFile.originalname}`,
          resumeFile.mimetype,
          resumeFile.buffer,
          candidateFolderId
        );
        resumeDriveId = resumeUpload.fileId;

        if (photoFile) {
          const photoUpload = await DriveStorage.uploadFile(
            `${refNo}_Photo_${photoFile.originalname}`,
            photoFile.mimetype,
            photoFile.buffer,
            candidateFolderId
          );
          photoDriveId = photoUpload.fileId;
        }
      } catch (driveErr) {
        console.warn('Drive upload fallback (check Google credentials):', driveErr);
        resumeDriveId = `drive_mock_${uuidv4().slice(0, 8)}`;
      }

      // 7. Parse Criteria and calculate initial match score
      let criteria: JobCriteria = {
        must_have_skills: [],
        nice_to_have_skills: [],
        min_experience: 0,
        required_qualification: job.qualification || '',
        threshold_score: Number(job.threshold) || 60
      };

      try {
        if (job.criteria_json) {
          criteria = typeof job.criteria_json === 'string' ? JSON.parse(job.criteria_json) : job.criteria_json;
        }
      } catch (e) {}

      const initialApp: Application = {
        id: '',
        job_id: job.id,
        ref_no: refNo,
        full_name: full_name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        dob: dob || '',
        gender: gender || 'Other',
        location: location || '',
        qualification: qualification || '',
        specialization: specialization || '',
        experience_years: experience_years || 0,
        current_employer: body.current_employer || '',
        skills: body.skills || '',
        current_salary: body.current_salary || 0,
        expected_salary: body.expected_salary || 0,
        notice_period: body.notice_period || 0,
        why_join: body.why_join || '',
        custom_answers_json: body.custom_answers || '{}',
        resume_drive_id: resumeDriveId,
        photo_drive_id: photoDriveId,
        score: 0,
        score_breakdown_json: '{}',
        status: 'Applied',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'public_candidate',
        is_deleted: false
      };

      const scoreBreakdown = calculateMatchScore(initialApp, criteria);
      initialApp.score = scoreBreakdown.total_score;
      initialApp.score_breakdown_json = JSON.stringify(scoreBreakdown);

      // 8. Save Application to Google Sheets
      const createdApp = await SheetsRepo.create<Application>('Applications', initialApp, 'public_candidate');

      // 9. Log Initial Status
      await SheetsRepo.create<ApplicationStatusLog>('ApplicationStatusLog', {
        application_id: createdApp.id,
        from_status: 'None',
        to_status: 'Applied',
        remark: 'Candidate submitted public application form',
        changed_by: 'public_candidate'
      });

      return res.status(201).json({
        success: true,
        message: 'Your application has been submitted successfully!',
        ref_no: refNo,
        application_id: createdApp.id
      });
    } catch (err: any) {
      console.error('Application submit error:', err);
      return res.status(500).json({ success: false, message: 'Failed to submit application. Please try again.' });
    }
  }
);

// -------------------------------------------------------------
// PROTECTED RECRUITMENT ROUTES (HR Manager & HR Executive)
// -------------------------------------------------------------

router.use(authenticate);
router.use(requireRole('HR Manager', 'HR Executive'));

/**
 * List all jobs
 */
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const jobs = await SheetsRepo.list<Job>('Jobs');
    return res.json({ success: true, jobs });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch jobs' });
  }
});

/**
 * Create a new job
 */
router.post('/jobs', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.title || !body.department) {
      return res.status(400).json({ success: false, message: 'Title and department are required' });
    }

    const slug = (body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(100 + Math.random() * 900));

    const newJob: Partial<Job> = {
      title: body.title,
      slug,
      department: body.department,
      location: body.location || 'Kerala, India',
      type: body.type || 'Full-time',
      vacancies: body.vacancies || 1,
      description: body.description || '',
      responsibilities: body.responsibilities || '',
      qualification: body.qualification || '',
      min_experience: body.min_experience || 0,
      required_skills: body.required_skills || '',
      preferred_skills: body.preferred_skills || '',
      salary_range: body.salary_range || '',
      last_date: body.last_date || '',
      status: body.status || 'Draft',
      form_config_json: JSON.stringify(body.form_config || []),
      criteria_json: JSON.stringify(body.criteria || {}),
      threshold: body.threshold || 60
    };

    const created = await SheetsRepo.create<Job>('Jobs', newJob, req.user!.employeeId);
    await AuditService.log(req.user!.employeeId, 'CREATE_JOB', 'Jobs', created.id, undefined, created, req.ip);

    return res.status(201).json({ success: true, job: created });
  } catch (err: any) {
    console.error('Create job error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create job' });
  }
});

/**
 * Update job
 */
router.put('/jobs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await SheetsRepo.getById<Job>('Jobs', id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const updateData: Partial<Job> = {
      title: body.title !== undefined ? body.title : existing.title,
      department: body.department !== undefined ? body.department : existing.department,
      location: body.location !== undefined ? body.location : existing.location,
      type: body.type !== undefined ? body.type : existing.type,
      vacancies: body.vacancies !== undefined ? body.vacancies : existing.vacancies,
      description: body.description !== undefined ? body.description : existing.description,
      responsibilities: body.responsibilities !== undefined ? body.responsibilities : existing.responsibilities,
      qualification: body.qualification !== undefined ? body.qualification : existing.qualification,
      min_experience: body.min_experience !== undefined ? body.min_experience : existing.min_experience,
      required_skills: body.required_skills !== undefined ? body.required_skills : existing.required_skills,
      preferred_skills: body.preferred_skills !== undefined ? body.preferred_skills : existing.preferred_skills,
      salary_range: body.salary_range !== undefined ? body.salary_range : existing.salary_range,
      last_date: body.last_date !== undefined ? body.last_date : existing.last_date,
      status: body.status !== undefined ? body.status : existing.status,
      threshold: body.threshold !== undefined ? body.threshold : existing.threshold
    };

    if (body.form_config !== undefined) {
      updateData.form_config_json = JSON.stringify(body.form_config);
    }
    if (body.criteria !== undefined) {
      updateData.criteria_json = JSON.stringify(body.criteria);
    }

    const updated = await SheetsRepo.update<Job>('Jobs', id, updateData, req.user!.employeeId);
    await AuditService.log(req.user!.employeeId, 'UPDATE_JOB', 'Jobs', id, existing, updated, req.ip);

    return res.json({ success: true, job: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update job' });
  }
});

/**
 * List applications with filters (by job, status, score, etc.)
 */
router.get('/applications', async (req: Request, res: Response) => {
  try {
    const { jobId, status, minScore } = req.query;
    let list = await SheetsRepo.list<Application>('Applications');

    if (jobId) {
      list = list.filter(a => a.job_id === jobId);
    }
    if (status) {
      list = list.filter(a => a.status === status);
    }
    if (minScore) {
      list = list.filter(a => Number(a.score) >= Number(minScore));
    }

    return res.json({ success: true, applications: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch applications' });
  }
});

/**
 * Get detailed application view with timeline, interviews, offer and onboarding docs
 */
router.get('/applications/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const app = await SheetsRepo.getById<Application>('Applications', id);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const [jobs, statusLogs, interviews, offers, onboardingDocs] = await Promise.all([
      SheetsRepo.list<Job>('Jobs'),
      SheetsRepo.find<ApplicationStatusLog>('ApplicationStatusLog', l => l.application_id === id),
      SheetsRepo.find<Interview>('Interviews', i => i.application_id === id),
      SheetsRepo.find<Offer>('Offers', o => o.application_id === id),
      SheetsRepo.find<OnboardingDoc>('OnboardingDocs', d => d.application_id === id)
    ]);

    const job = jobs.find(j => j.id === app.job_id);

    return res.json({
      success: true,
      application: app,
      job,
      timeline: statusLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      interviews,
      offers,
      onboardingDocs
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch application details' });
  }
});

/**
 * Auto Screen and Shortlist (one-click per job or bulk across applications)
 */
router.post('/applications/auto-shortlist', async (req: Request, res: Response) => {
  try {
    const { jobId, applicationIds } = req.body;

    let targetApps: Application[] = [];
    if (applicationIds && Array.isArray(applicationIds) && applicationIds.length > 0) {
      const allApps = await SheetsRepo.list<Application>('Applications');
      targetApps = allApps.filter(a => applicationIds.includes(a.id));
    } else if (jobId) {
      targetApps = await SheetsRepo.find<Application>('Applications', a => a.job_id === jobId && a.status === 'Applied');
    } else {
      return res.status(400).json({ success: false, message: 'Please provide jobId or applicationIds' });
    }

    const jobs = await SheetsRepo.list<Job>('Jobs');
    const updatedCount = { shortlisted: 0, screenedOut: 0 };

    for (const app of targetApps) {
      const job = jobs.find(j => j.id === app.job_id);
      if (!job) continue;

      let criteria: JobCriteria = {
        must_have_skills: [],
        nice_to_have_skills: [],
        min_experience: 0,
        required_qualification: job.qualification || '',
        threshold_score: Number(job.threshold) || 60
      };

      try {
        if (job.criteria_json) {
          criteria = typeof job.criteria_json === 'string' ? JSON.parse(job.criteria_json) : job.criteria_json;
        }
      } catch (e) {}

      const breakdown = calculateMatchScore(app, criteria);
      const threshold = Number(criteria.threshold_score) || Number(job.threshold) || 60;
      const isShortlisted = breakdown.total_score >= threshold && breakdown.passed_hard_criteria;

      const newStatus = isShortlisted ? 'Shortlisted' : 'Screened';
      const remark = isShortlisted
        ? `Auto-shortlisted with score ${breakdown.total_score}/${threshold}`
        : `Screened with score ${breakdown.total_score}/${threshold}. Reasons: ${breakdown.disqualification_reasons.join('; ') || 'Score below threshold'}`;

      await SheetsRepo.update<Application>(
        'Applications',
        app.id,
        {
          score: breakdown.total_score,
          score_breakdown_json: JSON.stringify(breakdown),
          status: newStatus as any
        },
        req.user!.employeeId
      );

      await SheetsRepo.create<ApplicationStatusLog>('ApplicationStatusLog', {
        application_id: app.id,
        from_status: app.status,
        to_status: newStatus,
        remark,
        changed_by: req.user!.employeeId
      });

      if (isShortlisted) updatedCount.shortlisted++;
      else updatedCount.screenedOut++;
    }

    return res.json({
      success: true,
      message: `Auto-screening completed: ${updatedCount.shortlisted} shortlisted, ${updatedCount.screenedOut} screened out.`,
      result: updatedCount
    });
  } catch (err: any) {
    console.error('Auto shortlist error:', err);
    return res.status(500).json({ success: false, message: 'Failed to run auto-shortlisting' });
  }
});

/**
 * Update candidate status manually (with remark)
 */
router.post('/applications/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const app = await SheetsRepo.getById<Application>('Applications', id);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const oldStatus = app.status;
    await SheetsRepo.update<Application>('Applications', id, { status }, req.user!.employeeId);

    await SheetsRepo.create<ApplicationStatusLog>('ApplicationStatusLog', {
      application_id: id,
      from_status: oldStatus,
      to_status: status,
      remark: remark || `Status updated from ${oldStatus} to ${status}`,
      changed_by: req.user!.employeeId
    });

    await AuditService.log(req.user!.employeeId, 'UPDATE_APPLICATION_STATUS', 'Applications', id, { status: oldStatus }, { status, remark }, req.ip);

    return res.json({ success: true, message: `Status updated to ${status}` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

/**
 * Schedule or reschedule an interview
 */
router.post('/applications/:id/interview', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { round, date, time, mode, location_or_link, interviewers } = req.body;

    const app = await SheetsRepo.getById<Application>('Applications', id);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const interview = await SheetsRepo.create<Interview>('Interviews', {
      application_id: id,
      round: round || 1,
      date,
      time,
      mode: mode || 'In-person',
      location_or_link: location_or_link || 'MSA Main Office',
      interviewers: interviewers || req.user!.employeeId,
      status: 'Scheduled'
    }, req.user!.employeeId);

    await SheetsRepo.update<Application>('Applications', id, { status: 'Interview Scheduled' }, req.user!.employeeId);
    await SheetsRepo.create<ApplicationStatusLog>('ApplicationStatusLog', {
      application_id: id,
      from_status: app.status,
      to_status: 'Interview Scheduled',
      remark: `Round ${round || 1} interview scheduled on ${date} at ${time} (${mode})`,
      changed_by: req.user!.employeeId
    });

    return res.json({
      success: true,
      message: 'Interview scheduled successfully',
      interview,
      shareMessage: `Hi ${app.full_name}, your interview for Mastered Skill Academy has been scheduled on ${date} at ${time} (${mode}). Venue/Link: ${location_or_link || 'Office'}. All the best!`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to schedule interview' });
  }
});

/**
 * Record interview feedback
 */
router.post('/interviews/:id/feedback', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { ratings, remarks, recommendation } = req.body;

    const interview = await SheetsRepo.getById<Interview>('Interviews', id);
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview record not found' });
    }

    const updated = await SheetsRepo.update<Interview>('Interviews', id, {
      status: 'Completed',
      ratings_json: JSON.stringify(ratings || {}),
      remarks: remarks || '',
      recommendation: recommendation || 'Hold'
    }, req.user!.employeeId);

    // Update application status based on recommendation
    let nextAppStatus = 'Interviewed';
    if (recommendation === 'Hire') nextAppStatus = 'Selected';
    else if (recommendation === 'Reject') nextAppStatus = 'Rejected';
    else if (recommendation === 'Hold') nextAppStatus = 'On Hold';

    const app = await SheetsRepo.getById<Application>('Applications', interview.application_id);
    if (app) {
      await SheetsRepo.update<Application>('Applications', app.id, { status: nextAppStatus as any }, req.user!.employeeId);
      await SheetsRepo.create<ApplicationStatusLog>('ApplicationStatusLog', {
        application_id: app.id,
        from_status: app.status,
        to_status: nextAppStatus,
        remark: `Interview completed with recommendation: ${recommendation}. Remarks: ${remarks || 'None'}`,
        changed_by: req.user!.employeeId
      });
    }

    return res.json({ success: true, message: 'Feedback recorded successfully', interview: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to record feedback' });
  }
});

/**
 * Create or generate Offer Letter
 */
router.post('/applications/:id/offer', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { designation, department, role, joining_date, salary, probation_months } = req.body;

    const app = await SheetsRepo.getById<Application>('Applications', id);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const newOffer: Partial<Offer> = {
      application_id: id,
      designation: designation || 'Staff',
      department: department || 'Operations',
      role: role || 'Employee',
      joining_date: joining_date || '',
      salary_json: JSON.stringify(salary || {}),
      probation_months: probation_months || 3,
      status: 'Draft'
    };

    // Generate Offer Letter PDF
    let offerPdfDriveId = '';
    try {
      const pdfBuffer = await PdfService.generateOfferLetterPdf(app.full_name, newOffer as Offer);
      const folderId = await DriveStorage.resolveFolderPath([
        'Mastered Skill Academy HR',
        'Recruitment',
        app.job_id,
        `${app.ref_no} - ${app.full_name}`
      ]);
      const uploadRes = await DriveStorage.uploadFile(
        `Offer_Letter_${app.ref_no}_${app.full_name}.pdf`,
        'application/pdf',
        pdfBuffer,
        folderId
      );
      offerPdfDriveId = uploadRes.fileId;
      newOffer.offer_pdf_drive_id = offerPdfDriveId;
    } catch (e) {
      console.warn('PDF generation/upload note:', e);
    }

    const createdOffer = await SheetsRepo.create<Offer>('Offers', newOffer, req.user!.employeeId);
    return res.json({ success: true, message: 'Offer created and PDF generated', offer: createdOffer });
  } catch (err: any) {
    console.error('Offer create error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create offer' });
  }
});

/**
 * Mark Offer Sent / Accepted / Declined
 */
router.post('/applications/:id/offer-status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, offerId } = req.body; // 'Sent' | 'Accepted' | 'Declined'

    const app = await SheetsRepo.getById<Application>('Applications', id);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (offerId) {
      await SheetsRepo.update<Offer>('Offers', offerId, {
        status,
        accepted_on: status === 'Accepted' ? new Date().toISOString() : undefined
      }, req.user!.employeeId);
    }

    const appStatusMap: Record<string, string> = {
      'Sent': 'Offer Sent',
      'Accepted': 'Offer Accepted',
      'Declined': 'Rejected'
    };

    const newAppStatus = appStatusMap[status] || 'Offer Sent';
    await SheetsRepo.update<Application>('Applications', id, { status: newAppStatus as any }, req.user!.employeeId);
    await SheetsRepo.create<ApplicationStatusLog>('ApplicationStatusLog', {
      application_id: id,
      from_status: app.status,
      to_status: newAppStatus,
      remark: `Offer status changed to ${status}`,
      changed_by: req.user!.employeeId
    });

    return res.json({ success: true, message: `Offer marked as ${status}` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update offer status' });
  }
});

/**
 * Get onboarding documents checklist for candidate
 */
router.get('/applications/:id/onboarding', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const docs = await SheetsRepo.find<OnboardingDoc>('OnboardingDocs', d => d.application_id === id);
    return res.json({ success: true, onboardingDocs: docs });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch onboarding documents' });
  }
});

/**
 * Mark / Upload onboarding document
 */
router.post('/applications/:id/onboarding-doc', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { doc_type, received } = req.body;

    const app = await SheetsRepo.getById<Application>('Applications', id);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    let driveFileId = '';
    if (req.file) {
      const folderId = await DriveStorage.resolveFolderPath([
        'Mastered Skill Academy HR',
        'Recruitment',
        app.job_id,
        `${app.ref_no} - ${app.full_name}`
      ]);
      const uploadRes = await DriveStorage.uploadFile(
        `${doc_type}_${app.ref_no}_${req.file.originalname}`,
        req.file.mimetype,
        req.file.buffer,
        folderId
      );
      driveFileId = uploadRes.fileId;
    }

    const existingDocs = await SheetsRepo.find<OnboardingDoc>('OnboardingDocs', d => d.application_id === id && d.doc_type === doc_type);

    if (existingDocs.length > 0) {
      await SheetsRepo.update<OnboardingDoc>('OnboardingDocs', existingDocs[0].id, {
        received: received === 'true' || received === true,
        drive_file_id: driveFileId || existingDocs[0].drive_file_id,
        received_on: new Date().toISOString()
      }, req.user!.employeeId);
    } else {
      await SheetsRepo.create<OnboardingDoc>('OnboardingDocs', {
        application_id: id,
        doc_type,
        received: received === 'true' || received === true,
        drive_file_id: driveFileId,
        received_on: new Date().toISOString()
      }, req.user!.employeeId);
    }

    return res.json({ success: true, message: `Document '${doc_type}' updated` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update document' });
  }
});

/**
 * Appoint / Mark as Joined (HR Manager only)
 * Creates Employee record, generates Employee ID (e.g. MSA-0004), creates User account with temp password,
 * marks candidate status as 'Joined'
 */
router.post('/applications/:id/appoint', requireRole('HR Manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, designation, department, joining_date, temporary_password, work_location } = req.body;

    const app = await SheetsRepo.getById<Application>('Applications', id);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // 1. Generate unique sequential Employee ID: MSA-000X
    const employees = await SheetsRepo.list<Employee>('Employees');
    let maxNum = 0;
    employees.forEach(e => {
      const match = e.employee_id.match(/MSA-(\d+)/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
    const newEmpId = `MSA-${String(maxNum + 1).padStart(4, '0')}`;

    // 2. Resolve or create Employee Drive folder
    let empFolderId = '';
    try {
      empFolderId = await DriveStorage.resolveFolderPath([
        'Mastered Skill Academy HR',
        'Employees',
        `${newEmpId} - ${app.full_name}`
      ]);
    } catch (e) {}

    // 3. Create Employee Record
    const assignedRole = role || 'Employee';
    const newEmployee: Partial<Employee> = {
      employee_id: newEmpId,
      full_name: app.full_name,
      phone: app.phone,
      email: app.email,
      dob: app.dob,
      gender: app.gender,
      address: app.location,
      emergency_name: 'Contact',
      emergency_relation: 'Family',
      emergency_phone: app.phone,
      designation: designation || 'Staff',
      department: department || 'Operations',
      role: assignedRole,
      employment_type: 'Full-time',
      joining_date: joining_date || new Date().toISOString().split('T')[0],
      work_location: work_location || 'Kerala Campus',
      status: 'Active',
      drive_folder_id: empFolderId
    };

    const createdEmployee = await SheetsRepo.create<Employee>('Employees', newEmployee, req.user!.employeeId);

    // 4. Create User login account with temporary password & forced change
    const tempPassword = temporary_password || `MsaStaff@${Math.floor(1000 + Math.random() * 9000)}`;
    const passHash = await hashPassword(tempPassword);

    await SheetsRepo.create<User>('Users', {
      employee_id: newEmpId,
      email: app.email,
      phone: app.phone,
      password_hash: passHash,
      role: assignedRole,
      must_change_password: true,
      is_active: true
    }, req.user!.employeeId);

    // 5. Update Candidate status to Joined
    await SheetsRepo.update<Application>('Applications', id, { status: 'Joined' }, req.user!.employeeId);
    await SheetsRepo.create<ApplicationStatusLog>('ApplicationStatusLog', {
      application_id: id,
      from_status: app.status,
      to_status: 'Joined',
      remark: `Candidate appointed as Employee ${newEmpId} with role ${assignedRole}`,
      changed_by: req.user!.employeeId
    });

    await AuditService.log(
      req.user!.employeeId,
      'APPOINT_EMPLOYEE',
      'Employees',
      createdEmployee.id,
      undefined,
      { employee_id: newEmpId, candidate_id: id, role: assignedRole },
      req.ip
    );

    return res.status(201).json({
      success: true,
      message: `Candidate appointed successfully as ${newEmpId}!`,
      credentials: {
        employee_id: newEmpId,
        email: app.email,
        temporary_password: tempPassword,
        role: assignedRole
      },
      employee: createdEmployee
    });
  } catch (err: any) {
    console.error('Appoint employee error:', err);
    return res.status(500).json({ success: false, message: 'Failed to appoint candidate as employee' });
  }
});

export default router;
