import { Application, JobCriteria, ScoreBreakdown } from '../types';

export interface ScoringWeights {
  must_have_weight?: number; // default 40
  experience_weight?: number; // default 20
  qualification_weight?: number; // default 15
  nice_to_have_weight?: number; // default 10
  fit_weight?: number; // default 15
}

/**
 * Normalizes strings for keyword matching (lowercase, removes special chars, splits into tokens)
 */
function normalizeText(text: string): string {
  return (text || '').toLowerCase().replace(/[^a-z0-9\s+]/g, ' ').trim();
}

function parseKeywords(input: string | string[]): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map(s => normalizeText(s)).filter(Boolean);
  }
  return input.split(/[,;\n]+/).map(s => normalizeText(s)).filter(Boolean);
}

/**
 * Checks if candidate skills contain the required keyword (substring/token match)
 */
function containsKeyword(candidateText: string, keyword: string): boolean {
  const normCandidate = normalizeText(candidateText);
  const normKey = normalizeText(keyword);
  if (!normKey) return true;
  return normCandidate.includes(normKey);
}

/**
 * Deterministic Auto-Screening and Scoring Engine
 */
export function calculateMatchScore(
  application: Application,
  criteria: JobCriteria,
  weights?: ScoringWeights
): ScoreBreakdown {
  const mustWeight = weights?.must_have_weight ?? 40;
  const expWeight = weights?.experience_weight ?? 20;
  const qualWeight = weights?.qualification_weight ?? 15;
  const niceWeight = weights?.nice_to_have_weight ?? 10;
  const fitWeight = weights?.fit_weight ?? 15;

  const mustSkills = parseKeywords(criteria.must_have_skills || []);
  const niceSkills = parseKeywords(criteria.nice_to_have_skills || []);
  const candidateSkills = (application.skills || '') + ' ' + (application.qualification || '') + ' ' + (application.specialization || '');
  
  const matchedMust: string[] = [];
  const missingMust: string[] = [];
  const matchedNice: string[] = [];
  const disqualificationReasons: string[] = [];

  // 1. Must-have skills match
  if (mustSkills.length > 0) {
    for (const skill of mustSkills) {
      if (containsKeyword(candidateSkills, skill)) {
        matchedMust.push(skill);
      } else {
        missingMust.push(skill);
      }
    }
  }

  let mustScore = 0;
  if (mustSkills.length === 0) {
    mustScore = mustWeight; // If no must-haves defined, grant full weight
  } else {
    mustScore = Math.round((matchedMust.length / mustSkills.length) * mustWeight);
    if (missingMust.length > 0) {
      disqualificationReasons.push(`Missing must-have skill(s): ${missingMust.join(', ')}`);
    }
  }

  // 2. Experience check
  const candidateExp = Number(application.experience_years) || 0;
  const minExp = criteria.min_experience || 0;
  let expScore = 0;
  if (minExp === 0) {
    expScore = expWeight;
  } else if (candidateExp >= minExp) {
    expScore = expWeight;
  } else {
    expScore = Math.round((candidateExp / minExp) * expWeight);
    disqualificationReasons.push(`Experience (${candidateExp} yrs) is less than required minimum (${minExp} yrs)`);
  }

  // 3. Qualification match
  const candidateQual = normalizeText(`${application.qualification} ${application.specialization}`);
  const requiredQual = normalizeText(criteria.required_qualification || '');
  let qualScore = 0;
  if (!requiredQual) {
    qualScore = qualWeight;
  } else if (candidateQual.includes(requiredQual) || requiredQual.includes(candidateQual)) {
    qualScore = qualWeight;
  } else {
    // Partial qualification match
    const qualTokens = requiredQual.split(/\s+/).filter(Boolean);
    const matchedTokens = qualTokens.filter(t => candidateQual.includes(t));
    if (matchedTokens.length > 0) {
      qualScore = Math.round((matchedTokens.length / qualTokens.length) * qualWeight);
    } else {
      qualScore = 0;
      disqualificationReasons.push(`Qualification '${application.qualification}' may not meet required '${criteria.required_qualification}'`);
    }
  }

  // 4. Nice-to-have skills
  let niceScore = 0;
  if (niceSkills.length > 0) {
    for (const skill of niceSkills) {
      if (containsKeyword(candidateSkills, skill)) {
        matchedNice.push(skill);
      }
    }
    niceScore = Math.round((matchedNice.length / niceSkills.length) * niceWeight);
  } else {
    niceScore = niceWeight;
  }

  // 5. Fit (Location, Salary, Notice Period)
  const fitSubWeight = fitWeight / 3; // 5 pts each
  let locationFit = true;
  let salaryFit = true;
  let noticeFit = true;
  let fitScore = 0;

  // Location fit
  const preferredLocs = parseKeywords(criteria.preferred_locations || []);
  if (preferredLocs.length === 0) {
    fitScore += fitSubWeight;
  } else {
    const candidateLoc = normalizeText(application.location || '');
    const matchedLoc = preferredLocs.some(l => candidateLoc.includes(l));
    if (matchedLoc) {
      fitScore += fitSubWeight;
    } else {
      locationFit = false;
    }
  }

  // Salary fit
  const expectedSalary = Number(application.expected_salary) || 0;
  const maxSalary = criteria.max_expected_salary || 0;
  if (maxSalary <= 0 || expectedSalary <= maxSalary) {
    fitScore += fitSubWeight;
  } else {
    salaryFit = false;
    disqualificationReasons.push(`Expected salary (₹${expectedSalary}) exceeds maximum budget (₹${maxSalary})`);
  }

  // Notice period fit
  const noticePeriod = Number(application.notice_period) || 0;
  const maxNotice = criteria.max_notice_period || 0;
  if (maxNotice <= 0 || noticePeriod <= maxNotice) {
    fitScore += fitSubWeight;
  } else {
    noticeFit = false;
    disqualificationReasons.push(`Notice period (${noticePeriod} days) exceeds maximum allowed (${maxNotice} days)`);
  }

  fitScore = Math.round(fitScore);

  const totalScore = Math.min(100, Math.round(mustScore + expScore + qualScore + (niceScore || 0) + fitScore));
  const passedHardCriteria = missingMust.length === 0 && candidateExp >= (minExp > 0 ? minExp * 0.8 : 0);

  return {
    total_score: totalScore,
    passed_hard_criteria: passedHardCriteria,
    disqualification_reasons: disqualificationReasons,
    must_have_score: mustScore,
    experience_score: expScore,
    qualification_score: qualScore,
    nice_to_have_score: niceScore || 0,
    fit_score: fitScore,
    details: {
      matched_must_have: matchedMust,
      missing_must_have: missingMust,
      matched_nice_to_have: matchedNice,
      experience_years: candidateExp,
      experience_required: minExp,
      qualification_candidate: `${application.qualification} (${application.specialization || 'General'})`,
      qualification_required: criteria.required_qualification || 'Any',
      salary_fit: salaryFit,
      notice_fit: noticeFit,
      location_fit: locationFit
    }
  };
}
