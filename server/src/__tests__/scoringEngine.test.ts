import { calculateMatchScore } from '../utils/scoringEngine';
import { Application, JobCriteria } from '../types';

describe('Recruitment Scoring Engine', () => {
  const baseCriteria: JobCriteria = {
    must_have_skills: ['React', 'TypeScript', 'Node.js'],
    nice_to_have_skills: ['Tailwind', 'Docker'],
    min_experience: 3,
    required_qualification: 'B.Tech',
    preferred_locations: ['Kochi', 'Ernakulam'],
    max_expected_salary: 50000,
    max_notice_period: 30,
    threshold_score: 60
  };

  const matchingCandidate: Application = {
    id: 'app-1',
    job_id: 'job-1',
    ref_no: 'APP-1001',
    full_name: 'John Doe',
    phone: '9876543210',
    email: 'john@example.com',
    dob: '1995-01-01',
    gender: 'Male',
    location: 'Kochi, Kerala',
    qualification: 'B.Tech',
    specialization: 'Computer Science',
    experience_years: 4,
    skills: 'React, TypeScript, Node.js, Tailwind, Git',
    current_salary: 35000,
    expected_salary: 45000,
    notice_period: 15,
    resume_drive_id: 'drive-1',
    score: 0,
    status: 'Applied',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'test',
    is_deleted: false
  };

  test('should score high and pass hard criteria for fully qualified candidate', () => {
    const result = calculateMatchScore(matchingCandidate, baseCriteria);
    expect(result.passed_hard_criteria).toBe(true);
    expect(result.total_score).toBeGreaterThanOrEqual(80);
    expect(result.must_have_score).toBe(40);
    expect(result.experience_score).toBe(20);
    expect(result.qualification_score).toBe(15);
    expect(result.disqualification_reasons).toHaveLength(0);
  });

  test('should flag missing must-have skill and record reason', () => {
    const nonMatchingCandidate: Application = {
      ...matchingCandidate,
      skills: 'Python, Django' // Missing React, TypeScript, Node.js
    };

    const result = calculateMatchScore(nonMatchingCandidate, baseCriteria);
    expect(result.passed_hard_criteria).toBe(false);
    expect(result.must_have_score).toBe(0);
    expect(result.disqualification_reasons.some(r => r.includes('Missing must-have skill'))).toBe(true);
  });

  test('should flag when expected salary exceeds budget', () => {
    const highSalaryCandidate: Application = {
      ...matchingCandidate,
      expected_salary: 75000 // Limit is 50000
    };

    const result = calculateMatchScore(highSalaryCandidate, baseCriteria);
    expect(result.details.salary_fit).toBe(false);
    expect(result.disqualification_reasons.some(r => r.includes('exceeds maximum budget'))).toBe(true);
  });
});
