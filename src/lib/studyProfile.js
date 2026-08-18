const STORAGE_KEY = 'ag-project-study-profile';

export const createEmptyProfile = () => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  progress: {},
  notes: {},
  bookmarks: {},
  flashcardReviews: {},
  quizAttempts: {},
  mistakes: {},
  examAttempts: {},
});

export const normalizeProfile = (candidate) => {
  const blank = createEmptyProfile();
  if (!candidate || typeof candidate !== 'object') return blank;

  return {
    ...blank,
    ...candidate,
    version: 1,
    progress: typeof candidate.progress === 'object' && candidate.progress ? candidate.progress : {},
    notes: typeof candidate.notes === 'object' && candidate.notes ? candidate.notes : {},
    bookmarks: typeof candidate.bookmarks === 'object' && candidate.bookmarks ? candidate.bookmarks : {},
    flashcardReviews: typeof candidate.flashcardReviews === 'object' && candidate.flashcardReviews ? candidate.flashcardReviews : {},
    quizAttempts: typeof candidate.quizAttempts === 'object' && candidate.quizAttempts ? candidate.quizAttempts : {},
    mistakes: typeof candidate.mistakes === 'object' && candidate.mistakes ? candidate.mistakes : {},
    examAttempts: typeof candidate.examAttempts === 'object' && candidate.examAttempts ? candidate.examAttempts : {},
  };
};

export const loadProfile = () => {
  try {
    return normalizeProfile(JSON.parse(window.localStorage.getItem(STORAGE_KEY)));
  } catch {
    return createEmptyProfile();
  }
};

export const persistProfile = (profile) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
};

export const stamp = (profile) => ({ ...profile, updatedAt: new Date().toISOString() });

export const toggleModule = (profile, subjectId, moduleId) => {
  const subjectProgress = profile.progress[subjectId] || {};
  return stamp({
    ...profile,
    progress: {
      ...profile.progress,
      [subjectId]: {
        ...subjectProgress,
        [moduleId]: !subjectProgress[moduleId],
      },
    },
  });
};

export const toggleBookmark = (profile, subjectId, itemId) => {
  const subjectBookmarks = profile.bookmarks[subjectId] || {};
  return stamp({
    ...profile,
    bookmarks: {
      ...profile.bookmarks,
      [subjectId]: {
        ...subjectBookmarks,
        [itemId]: !subjectBookmarks[itemId],
      },
    },
  });
};

export const saveNote = (profile, subjectId, note) => stamp({
  ...profile,
  notes: {
    ...profile.notes,
    [subjectId]: note,
  },
});

export const reviewFlashcard = (profile, subjectId, cardId, rating = 'good') => stamp({
  ...profile,
  flashcardReviews: {
    ...profile.flashcardReviews,
    [subjectId]: {
      ...(profile.flashcardReviews[subjectId] || {}),
      [cardId]: {
        reviewedAt: new Date().toISOString(),
        rating,
      },
    },
  },
});

export const getFlashcardReview = (profile, subjectId, cardId) => {
  const review = profile.flashcardReviews[subjectId]?.[cardId];
  if (!review) return null;
  return typeof review === 'string' ? { reviewedAt: review, rating: 'good' } : review;
};

export const recordQuizAttempt = (profile, subjectId, wasCorrect) => {
  const prior = profile.quizAttempts[subjectId] || { attempted: 0, correct: 0 };
  return stamp({
    ...profile,
    quizAttempts: {
      ...profile.quizAttempts,
      [subjectId]: {
        attempted: prior.attempted + 1,
        correct: prior.correct + (wasCorrect ? 1 : 0),
      },
    },
  });
};

export const recordQuizResult = (profile, subjectId, question, selectedIndex) => {
  const wasCorrect = selectedIndex === question.answer;
  const next = recordQuizAttempt(profile, subjectId, wasCorrect);
  if (wasCorrect) return next;

  const priorMistakes = Array.isArray(next.mistakes[subjectId]) ? next.mistakes[subjectId] : [];
  const mistake = {
    id: `${question.id}-${Date.now()}`,
    questionId: question.id,
    prompt: question.prompt,
    promptAr: question.promptAr || '',
    options: question.options,
    optionsAr: question.optionsAr || [],
    correctAnswer: question.answer,
    selectedAnswer: selectedIndex,
    explanation: question.explanation || '',
    explanationAr: question.explanationAr || '',
    missedAt: new Date().toISOString(),
  };

  return stamp({
    ...next,
    mistakes: {
      ...next.mistakes,
      [subjectId]: [mistake, ...priorMistakes.filter((item) => item.questionId !== question.id)].slice(0, 100),
    },
  });
};

export const clearMistake = (profile, subjectId, mistakeId) => stamp({
  ...profile,
  mistakes: {
    ...profile.mistakes,
    [subjectId]: (profile.mistakes[subjectId] || []).filter((mistake) => mistake.id !== mistakeId),
  },
});

export const recordExamAttempt = (profile, subjectId, result) => stamp({
  ...profile,
  examAttempts: {
    ...profile.examAttempts,
    [subjectId]: [
      { ...result, id: `${subjectId}-exam-${Date.now()}`, completedAt: new Date().toISOString() },
      ...(profile.examAttempts[subjectId] || []),
    ].slice(0, 20),
  },
});

export const getSubjectProgress = (profile, subject) => {
  const total = subject.modules.length;
  const completed = subject.modules.filter((module) => profile.progress[subject.id]?.[module.id]).length;
  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
};

export const getBookmarkCount = (profile, subjectId) => Object.values(profile.bookmarks[subjectId] || {}).filter(Boolean).length;

const mergeSubjectMaps = (olderMap, newerMap) => Object.fromEntries(
  [...new Set([...Object.keys(olderMap || {}), ...Object.keys(newerMap || {})])].map((subjectId) => [
    subjectId,
    { ...(olderMap?.[subjectId] || {}), ...(newerMap?.[subjectId] || {}) },
  ]),
);

const mergeSubjectArrays = (olderMap, newerMap) => Object.fromEntries(
  [...new Set([...Object.keys(olderMap || {}), ...Object.keys(newerMap || {})])].map((subjectId) => {
    const items = [...(olderMap?.[subjectId] || []), ...(newerMap?.[subjectId] || [])];
    const unique = new Map(items.map((item, index) => [item.id || `${subjectId}-${index}`, item]));
    return [subjectId, [...unique.values()].sort((left, right) => String(right.completedAt || right.missedAt || '').localeCompare(String(left.completedAt || left.missedAt || ''))).slice(0, 100)];
  }),
);

export const mergeProfiles = (localProfile, remoteProfile) => {
  const local = normalizeProfile(localProfile);
  const remote = normalizeProfile(remoteProfile);
  const localIsNewer = new Date(local.updatedAt).getTime() >= new Date(remote.updatedAt).getTime();
  const newer = localIsNewer ? local : remote;
  const older = localIsNewer ? remote : local;

  return normalizeProfile({
    ...older,
    ...newer,
    progress: mergeSubjectMaps(older.progress, newer.progress),
    notes: { ...older.notes, ...newer.notes },
    bookmarks: mergeSubjectMaps(older.bookmarks, newer.bookmarks),
    flashcardReviews: mergeSubjectMaps(older.flashcardReviews, newer.flashcardReviews),
    quizAttempts: { ...older.quizAttempts, ...newer.quizAttempts },
    mistakes: mergeSubjectArrays(older.mistakes, newer.mistakes),
    examAttempts: mergeSubjectArrays(older.examAttempts, newer.examAttempts),
  });
};

const request = async (url, options = {}) => {
  const response = await fetch(url, { credentials: 'include', ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'We could not complete that request.');
  return payload;
};

export const getSession = () => request('/.netlify/functions/auth?action=session');
export const getRemoteProfile = () => request('/.netlify/functions/study-data');
export const putRemoteProfile = (profile) => request('/.netlify/functions/study-data', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ profile }),
});
export const signOutRemote = () => request('/.netlify/functions/auth?action=logout', { method: 'POST' });
