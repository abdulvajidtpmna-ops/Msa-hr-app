export interface ParsedResumeData {
  full_name: string;
  phone: string;
  email: string;
  designation: string;
  department: string;
  current_salary: number;
  expected_salary: number;
  experience_years: number;
  qualification: string;
  specialization: string;
  skills: string;
  location: string;
  raw_text_preview?: string;
}

/**
 * Extracts printable text from a binary buffer (PDF, DOCX, TXT, etc.)
 */
export function extractTextFromBuffer(buffer: Buffer): string {
  try {
    const rawString = buffer.toString('binary');
    
    // 1. Try to extract PDF text streams: strings enclosed in parentheses (...), Tj, or TJ
    const pdfMatches: string[] = [];
    const tjRegex = /\(([^()]{2,100})\)\s*(?:Tj|'|")/g;
    let match;
    while ((match = tjRegex.exec(rawString)) !== null) {
      if (match[1] && match[1].trim()) {
        pdfMatches.push(match[1].trim());
      }
    }

    if (pdfMatches.length > 5) {
      return pdfMatches.join(' ');
    }

    // 2. Fallback: extract contiguous printable ASCII / UTF-8 character sequences
    const utf8Str = buffer.toString('utf-8');
    const cleaned = utf8Str
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
      .replace(/\s+/g, ' ');

    return cleaned;
  } catch (err) {
    return buffer.toString('ascii').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
  }
}

/**
 * Extracts candidate details from resume buffer and original file name
 */
export function parseResume(buffer: Buffer, originalFileName: string = ''): ParsedResumeData {
  const text = extractTextFromBuffer(buffer);
  
  // 1. Name Guess: From filename first
  let guessedName = '';
  if (originalFileName) {
    const cleanName = originalFileName
      .replace(/\.[^/.]+$/, '') // remove extension
      .replace(/[_-]+/g, ' ')
      .replace(/\b(resume|cv|biodata|profile|doc|pdf|docx|mastered|skill|academy|latest|updated|final|app)\b/gi, '')
      .replace(/[0-9]/g, '')
      .trim();
    if (cleanName.length >= 3 && cleanName.length <= 40) {
      guessedName = cleanName
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  // If no good name from filename, check top lines of text
  if (!guessedName) {
    const words = text.slice(0, 500).split(/\s+/).filter(w => /^[A-Z][a-z]{2,}$/.test(w));
    if (words.length >= 2) {
      guessedName = `${words[0]} ${words[1]}`;
    }
  }

  if (!guessedName) {
    guessedName = 'Applicant';
  }

  // 2. Email Guess
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  const emailMatch = text.match(emailRegex);
  const email = emailMatch ? emailMatch[0].toLowerCase() : '';

  // 3. Phone Guess (Indian mobile: starts with 6-9 and has 10 digits, or standard international)
  let phone = '';
  const indianPhoneRegex = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/;
  const genericPhoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
  const phoneMatch = text.match(indianPhoneRegex) || text.match(genericPhoneRegex);
  if (phoneMatch) {
    phone = phoneMatch[0].replace(/[\s-]/g, '');
    if (!phone.startsWith('+91') && phone.length === 10) {
      phone = `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
    }
  }

  // 4. Designation Guess
  const designationsList = [
    'Trainer', 'Faculty', 'Senior Trainer', 'Lead Trainer',
    'Full Stack Developer', 'Software Engineer', 'Frontend Developer', 'Backend Developer',
    'Python Developer', 'Java Developer', 'React Developer', 'Web Developer',
    'HR Manager', 'HR Executive', 'Recruiter', 'Talent Acquisition',
    'Operations Manager', 'Operations Executive', 'Executive',
    'Academic Coordinator', 'Teacher', 'Lecturer', 'Professor',
    'Digital Marketer', 'SEO Specialist', 'Business Development Executive',
    'Counselor', 'Student Counselor', 'Admissions Officer',
    'Accountant', 'Finance Executive', 'Graphic Designer', 'UI/UX Designer'
  ];

  let designation = '';
  for (const des of designationsList) {
    const regex = new RegExp(`\\b${des}\\b`, 'i');
    if (regex.test(text) || regex.test(originalFileName)) {
      designation = des;
      break;
    }
  }

  // 5. Department Guess
  let department = 'Academics';
  if (/hr|recruitment|talent|human resources/i.test(designation) || /human resources|recruitment/i.test(text)) {
    department = 'Human Resources';
  } else if (/marketing|sales|business development|seo/i.test(designation) || /marketing|sales/i.test(text)) {
    department = 'Marketing & Sales';
  } else if (/finance|accountant|accounts/i.test(designation) || /accounting|finance/i.test(text)) {
    department = 'Finance & Accounts';
  } else if (/counselor|admission|student/i.test(designation) || /student affairs|admissions/i.test(text)) {
    department = 'Student Relations';
  } else if (/software|developer|it|engineer|tech/i.test(designation)) {
    department = 'IT & Systems';
  } else if (/operations|admin/i.test(designation)) {
    department = 'Operations';
  }

  // 6. Current Salary & Expected Salary Guess
  let currentSalary = 0;
  let expectedSalary = 0;
  
  // Look for CTC or salary patterns like "CTC: 4.5 LPA", "Salary: 35000", "Current CTC: 3,00,000"
  const ctcLpaMatch = text.match(/(?:current\s*(?:ctc|salary)|ctc|salary)\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?)/i);
  if (ctcLpaMatch) {
    const lpa = parseFloat(ctcLpaMatch[1]);
    if (!isNaN(lpa)) {
      currentSalary = Math.round((lpa * 100000) / 12);
    }
  } else {
    const monthlyMatch = text.match(/(?:current\s*(?:ctc|salary)|ctc|salary|inr|rs\.?)\s*[:=-]?\s*(\d{4,6})\b/i);
    if (monthlyMatch) {
      const sal = parseInt(monthlyMatch[1], 10);
      if (!isNaN(sal) && sal >= 10000 && sal <= 500000) {
        currentSalary = sal;
      }
    }
  }

  const expLpaMatch = text.match(/(?:expected\s*(?:ctc|salary))\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?)/i);
  if (expLpaMatch) {
    const lpa = parseFloat(expLpaMatch[1]);
    if (!isNaN(lpa)) {
      expectedSalary = Math.round((lpa * 100000) / 12);
    }
  } else if (currentSalary > 0) {
    expectedSalary = Math.round(currentSalary * 1.25); // 25% standard hike
  }

  // 7. Experience Guess
  let experienceYears = 0;
  const expMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:\+)?\s*(?:years?|yrs?)(?:\s*(?:of)?\s*experience)?/i);
  if (expMatch) {
    const exp = parseFloat(expMatch[1]);
    if (!isNaN(exp) && exp >= 0 && exp <= 40) {
      experienceYears = exp;
    }
  }

  // 8. Qualification Guess
  const qualList = [
    'M.Tech', 'B.Tech', 'MCA', 'BCA', 'MBA', 'M.Sc', 'B.Sc',
    'M.Com', 'B.Com', 'B.Ed', 'M.Ed', 'MA', 'BA', 'Diploma', 'PhD'
  ];
  let qualification = 'Graduate';
  let specialization = '';

  for (const q of qualList) {
    const qRegex = new RegExp(`\\b${q.replace('.', '\\.')}\\b`, 'i');
    if (qRegex.test(text)) {
      qualification = q;
      break;
    }
  }

  if (/computer science|information technology|it|software/i.test(text)) {
    specialization = 'Computer Science';
  } else if (/electronics|electrical/i.test(text)) {
    specialization = 'Electronics';
  } else if (/mechanical/i.test(text)) {
    specialization = 'Mechanical';
  } else if (/finance|commerce|accounts/i.test(text)) {
    specialization = 'Commerce / Finance';
  } else if (/english|literature/i.test(text)) {
    specialization = 'English Literature';
  }

  // 9. Skills Guess
  const commonSkills = [
    'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'SQL',
    'Java', 'C++', 'HTML', 'CSS', 'Tailwind', 'Git', 'Machine Learning', 'AI',
    'Training', 'Curriculum Design', 'Public Speaking', 'Mentoring', 'Classroom Management',
    'Recruitment', 'Talent Acquisition', 'HR Policies', 'Payroll',
    'Digital Marketing', 'SEO', 'Content Writing', 'Social Media Marketing',
    'Accounting', 'Tally', 'GST', 'MS Excel', 'Communication Skills'
  ];

  const matchedSkills: string[] = [];
  for (const sk of commonSkills) {
    const r = new RegExp(`\\b${sk.replace('.', '\\.')}\\b`, 'i');
    if (r.test(text)) {
      matchedSkills.push(sk);
    }
  }

  const skills = matchedSkills.slice(0, 8).join(', ');

  // 10. Location Guess
  let location = 'Kerala, India';
  if (/kochi|ernakulam/i.test(text)) location = 'Kochi, Kerala';
  else if (/calicut|kozhikode/i.test(text)) location = 'Calicut, Kerala';
  else if (/trivandrum|thiruvananthapuram/i.test(text)) location = 'Trivandrum, Kerala';
  else if (/malappuram/i.test(text)) location = 'Malappuram, Kerala';
  else if (/kannur/i.test(text)) location = 'Kannur, Kerala';
  else if (/kottayam/i.test(text)) location = 'Kottayam, Kerala';
  else if (/thrissur/i.test(text)) location = 'Thrissur, Kerala';
  else if (/bangalore|bengaluru/i.test(text)) location = 'Bengaluru, India';

  return {
    full_name: guessedName,
    phone,
    email,
    designation: designation || 'Staff Member',
    department,
    current_salary: currentSalary,
    expected_salary: expectedSalary,
    experience_years: experienceYears,
    qualification,
    specialization,
    skills,
    location,
    raw_text_preview: text.slice(0, 300)
  };
}
