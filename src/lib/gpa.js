export const GRADE_POINTS = Object.freeze({
  'A+': 4,
  A: 4,
  'A-': 3.67,
  'B+': 3.33,
  B: 3,
  'B-': 2.67,
  'C+': 2.33,
  C: 2,
  'C-': 1.67,
  'D+': 1.33,
  D: 1,
  F: 0,
  P: null,
  NP: null,
  W: null,
  TBD: null,
});

export const GRADE_OPTIONS = Object.keys(GRADE_POINTS);

export const createGpaId = (prefix = 'item') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createEmptyTerm = (name = 'Term 1') => ({
  id: createGpaId('term'),
  name,
  courses: [],
});

export const createEmptyCourse = () => ({
  id: createGpaId('course'),
  name: '',
  credits: 3,
  grade: 'TBD',
});

const numericCredits = (course) => {
  const credits = Number(course?.credits);
  return Number.isFinite(credits) && credits > 0 ? credits : 0;
};

const normalizedGrade = (grade) => String(grade || 'TBD').trim().toUpperCase();

export const normalizeGpaPlan = (candidate) => {
  const terms = Array.isArray(candidate?.terms) ? candidate.terms : [];
  return {
    version: 1,
    terms: terms.map((term, termIndex) => ({
      id: term?.id || createGpaId('term'),
      name: String(term?.name || `Term ${termIndex + 1}`),
      courses: Array.isArray(term?.courses) ? term.courses.map((course) => ({
        id: course?.id || createGpaId('course'),
        name: String(course?.name || ''),
        credits: numericCredits(course) || 3,
        grade: GRADE_POINTS[normalizedGrade(course?.grade)] === undefined ? 'TBD' : normalizedGrade(course?.grade),
      })) : [],
    })),
  };
};

export const calculateTermStats = (term) => {
  const courses = Array.isArray(term?.courses) ? term.courses : [];
  return courses.reduce((stats, course) => {
    const credits = numericCredits(course);
    const grade = normalizedGrade(course.grade);
    const points = GRADE_POINTS[grade];

    if (grade === 'TBD') {
      stats.plannedCredits += credits;
      return stats;
    }

    if (grade === 'W') return stats;

    stats.attemptedCredits += credits;
    if (grade === 'P' || (points !== null && points > 0)) stats.earnedCredits += credits;
    if (points !== null && points !== undefined) {
      stats.gpaCredits += credits;
      stats.qualityPoints += credits * points;
    }
    return stats;
  }, {
    attemptedCredits: 0,
    earnedCredits: 0,
    plannedCredits: 0,
    gpaCredits: 0,
    qualityPoints: 0,
    gpa: 0,
  });
};

export const calculateGpa = (terms) => {
  const total = (Array.isArray(terms) ? terms : []).reduce((summary, term) => {
    const stats = calculateTermStats(term);
    Object.keys(stats).forEach((key) => {
      if (key !== 'gpa') summary[key] += stats[key];
    });
    return summary;
  }, {
    attemptedCredits: 0,
    earnedCredits: 0,
    plannedCredits: 0,
    gpaCredits: 0,
    qualityPoints: 0,
  });

  return {
    ...total,
    gpa: total.gpaCredits ? total.qualityPoints / total.gpaCredits : 0,
  };
};

export const projectGpa = (terms, targetGrade = 'A') => {
  const targetPoints = GRADE_POINTS[normalizedGrade(targetGrade)];
  const base = calculateGpa(terms);
  if (targetPoints === null || targetPoints === undefined) return base.gpa;
  const planned = base.plannedCredits;
  const projectedCredits = base.gpaCredits + planned;
  return projectedCredits ? (base.qualityPoints + (planned * targetPoints)) / projectedCredits : 0;
};

export const getGradeLabel = (grade) => normalizedGrade(grade);
