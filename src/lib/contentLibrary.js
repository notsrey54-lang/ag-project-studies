const CONTENT_STORAGE_KEY = 'ag-study-content-draft-v1';

export const CONTENT_VERSION = 1;

export const CHAPTER_SECTIONS = Object.freeze([
  { id: 'course', label: 'Course content' },
  { id: 'midterm', label: 'Midterm' },
  { id: 'final', label: 'Final' },
]);

const chapterSectionIds = new Set(CHAPTER_SECTIONS.map((section) => section.id));

export const getChapterSectionLabel = (section) => CHAPTER_SECTIONS.find((candidate) => candidate.id === section)?.label || 'Course content';

const clone = (value) => JSON.parse(JSON.stringify(value));

export const createContentId = (prefix = 'item') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createBlankSubject = () => ({
  id: createContentId('subject'),
  code: 'NEW101',
  name: 'New subject',
  shortName: 'New subject',
  description: 'Add a clear description for this subject.',
  eyebrow: 'Your study space',
  color: 'gold',
  materialType: 'structured',
  archived: false,
  modules: [],
  materials: [],
  resources: [],
  flashcards: [],
  quiz: [],
  glossary: [],
  formulas: [],
});

export const createBlankModule = () => ({
  id: createContentId('chapter'),
  title: 'Chapter 1',
  subtitle: 'Add a chapter description',
  duration: '15 min',
  section: 'course',
});

export const createBlankMaterial = () => ({
  id: createContentId('note'),
  title: 'New note',
  summary: '',
  body: '',
  points: [],
  example: '',
});

export const createBlankResource = () => ({
  id: createContentId('resource'),
  title: 'New resource',
  type: 'PDF',
  url: '',
  description: '',
});

export const createBlankFlashcard = () => ({
  id: createContentId('flashcard'),
  prompt: '',
  answer: '',
  label: 'Review',
});

export const createBlankQuizQuestion = () => ({
  id: createContentId('question'),
  prompt: '',
  options: ['', '', '', ''],
  answer: 0,
  explanation: '',
});

export const createBlankGlossaryItem = () => ({
  id: createContentId('term'),
  term: '',
  definition: '',
});

export const createBlankFormula = () => ({
  id: createContentId('formula'),
  name: '',
  expression: '',
  explanation: '',
  example: '',
});

const text = (value, fallback = '') => typeof value === 'string' ? value : fallback;
const list = (value) => Array.isArray(value) ? value : [];

const normalizeModule = (module, index) => ({
  id: text(module?.id, createContentId('chapter')),
  title: text(module?.title, `Chapter ${index + 1}`),
  subtitle: text(module?.subtitle),
  duration: text(module?.duration, '15 min'),
  section: chapterSectionIds.has(module?.section)
    ? module.section
    : chapterSectionIds.has(module?.assessment)
      ? module.assessment
      : 'course',
});

const normalizeMaterial = (material, index) => ({
  id: text(material?.id, createContentId('note')),
  title: text(material?.title, `Note ${index + 1}`),
  summary: text(material?.summary),
  body: text(material?.body),
  points: list(material?.points).map((point) => Array.isArray(point)
    ? [text(point[0]), text(point[1])]
    : [text(point?.term), text(point?.explanation)]),
  example: text(material?.example),
});

const normalizeResource = (resource, index) => ({
  id: text(resource?.id, createContentId('resource')),
  title: text(resource?.title, `Resource ${index + 1}`),
  type: text(resource?.type, 'Link'),
  url: text(resource?.url),
  description: text(resource?.description),
});

const normalizeFlashcard = (card, index) => ({
  id: text(card?.id, createContentId('flashcard')),
  prompt: text(card?.prompt, `Flashcard ${index + 1}`),
  answer: text(card?.answer),
  label: text(card?.label, 'Review'),
});

const normalizeQuestion = (question, index) => ({
  id: text(question?.id, createContentId('question')),
  prompt: text(question?.prompt, `Question ${index + 1}`),
  options: [...list(question?.options).map((option) => text(option)), '', '', '', ''].slice(0, 4),
  answer: Math.max(0, Math.min(3, Number.isInteger(question?.answer) ? question.answer : Number(question?.answer) || 0)),
  explanation: text(question?.explanation),
});

const normalizeGlossary = (item, index) => ({
  id: text(item?.id, createContentId('term')),
  term: text(item?.term, `Term ${index + 1}`),
  definition: text(item?.definition),
});

const normalizeFormula = (formula, index) => ({
  id: text(formula?.id, createContentId('formula')),
  name: text(formula?.name, `Formula ${index + 1}`),
  expression: text(formula?.expression),
  explanation: text(formula?.explanation),
  example: text(formula?.example),
});

export const normalizeSubject = (subject, index = 0) => ({
  ...subject,
  id: text(subject?.id, createContentId('subject')),
  code: text(subject?.code, `SUB${index + 1}`),
  name: text(subject?.name, 'Untitled subject'),
  shortName: text(subject?.shortName, text(subject?.name, 'Subject')),
  description: text(subject?.description),
  eyebrow: text(subject?.eyebrow, 'Your study space'),
  color: ['gold', 'green', 'blue', 'purple'].includes(subject?.color) ? subject.color : 'gold',
  materialType: subject?.materialType === 'legacy' ? 'legacy' : 'structured',
  archived: Boolean(subject?.archived),
  modules: list(subject?.modules).map(normalizeModule),
  materials: list(subject?.materials).map(normalizeMaterial),
  resources: list(subject?.resources).map(normalizeResource),
  flashcards: list(subject?.flashcards).map(normalizeFlashcard),
  quiz: list(subject?.quiz).map(normalizeQuestion),
  glossary: list(subject?.glossary).map(normalizeGlossary),
  formulas: list(subject?.formulas).map(normalizeFormula),
});

export const normalizeSubjects = (subjects) => list(subjects).map(normalizeSubject);

export const validateContentSubjects = (subjects) => {
  const errors = [];
  const normalized = normalizeSubjects(subjects);
  const subjectIds = new Set();
  const subjectCodes = new Set();
  const addError = (message) => errors.push(message);

  normalized.forEach((subject, subjectIndex) => {
    const subjectLabel = subject.code || `Subject ${subjectIndex + 1}`;
    if (subjectIds.has(subject.id)) addError(`${subjectLabel}: duplicate subject ID.`);
    subjectIds.add(subject.id);
    const codeKey = subject.code.trim().toUpperCase();
    if (!subject.code.trim() || subject.code === 'NEW101') addError(`${subjectLabel}: add a real subject code.`);
    if (subjectCodes.has(codeKey)) addError(`${subjectLabel}: duplicate subject code.`);
    subjectCodes.add(codeKey);
    if (!subject.name.trim() || subject.name === 'New subject') addError(`${subjectLabel}: add a real subject name.`);

    const checkCollectionIds = (items, itemLabel) => {
      const itemIds = new Set();
      items.forEach((item) => {
        if (itemIds.has(item.id)) addError(`${subjectLabel}: duplicate ${itemLabel} ID.`);
        itemIds.add(item.id);
      });
    };

    checkCollectionIds(subject.modules, 'chapter');
    subject.modules.forEach((module, moduleIndex) => {
      if (!module.title.trim()) addError(`${subjectLabel}, chapter ${moduleIndex + 1}: add a title.`);
      if (!chapterSectionIds.has(module.section)) addError(`${subjectLabel}, ${module.title || `chapter ${moduleIndex + 1}`}: choose a valid assessment section.`);
    });
    checkCollectionIds(subject.materials, 'note');
    subject.materials.forEach((material, materialIndex) => {
      const hasContent = material.body.trim() || material.summary.trim() || material.example.trim() || material.points.length;
      if (!material.title.trim() || !hasContent) addError(`${subjectLabel}, note ${materialIndex + 1}: add a title and some note content.`);
    });
    checkCollectionIds(subject.resources, 'resource');
    subject.resources.forEach((resource, resourceIndex) => {
      if (!resource.title.trim() || !resource.url.trim()) addError(`${subjectLabel}, resource ${resourceIndex + 1}: add both a title and URL.`);
    });
    checkCollectionIds(subject.flashcards, 'flashcard');
    subject.flashcards.forEach((card, cardIndex) => {
      if (!card.prompt.trim() || !card.answer.trim()) addError(`${subjectLabel}, flashcard ${cardIndex + 1}: add both a prompt and answer.`);
    });
    checkCollectionIds(subject.quiz, 'quiz item');
    subject.quiz.forEach((question, questionIndex) => {
      if (!question.prompt.trim() || question.options.length !== 4 || question.options.some((option) => !option.trim())) addError(`${subjectLabel}, quiz question ${questionIndex + 1}: add a prompt and four answer options.`);
    });
    checkCollectionIds(subject.glossary, 'glossary item');
    subject.glossary.forEach((item, itemIndex) => {
      if (!item.term.trim() || !item.definition.trim()) addError(`${subjectLabel}, glossary item ${itemIndex + 1}: add a term and definition.`);
    });
    checkCollectionIds(subject.formulas, 'formula');
    subject.formulas.forEach((formula, formulaIndex) => {
      if (!formula.name.trim() || !formula.expression.trim()) addError(`${subjectLabel}, formula ${formulaIndex + 1}: add a name and expression.`);
    });
  });

  return errors;
};

export const normalizeContentDocument = (candidate) => ({
  version: CONTENT_VERSION,
  updatedAt: text(candidate?.updatedAt, null),
  subjects: normalizeSubjects(candidate?.subjects),
});

export const mergeSubject = (base, override) => normalizeSubject({
  ...base,
  ...override,
  modules: override && Object.prototype.hasOwnProperty.call(override, 'modules') ? override.modules : base?.modules,
  materials: override && Object.prototype.hasOwnProperty.call(override, 'materials') ? override.materials : base?.materials,
  resources: override && Object.prototype.hasOwnProperty.call(override, 'resources') ? override.resources : base?.resources,
  flashcards: override && Object.prototype.hasOwnProperty.call(override, 'flashcards') ? override.flashcards : base?.flashcards,
  quiz: override && Object.prototype.hasOwnProperty.call(override, 'quiz') ? override.quiz : base?.quiz,
  glossary: override && Object.prototype.hasOwnProperty.call(override, 'glossary') ? override.glossary : base?.glossary,
  formulas: override && Object.prototype.hasOwnProperty.call(override, 'formulas') ? override.formulas : base?.formulas,
});

export const mergeSharedSubjects = (baseSubjects, sharedSubjects) => {
  const merged = new Map(normalizeSubjects(baseSubjects).map((subject) => [subject.id, subject]));
  normalizeSubjects(sharedSubjects).forEach((subject) => {
    merged.set(subject.id, mergeSubject(merged.get(subject.id), subject));
  });
  return [...merged.values()].filter((subject) => !subject.archived);
};

export const buildContentDocument = (subjects) => ({
  version: CONTENT_VERSION,
  updatedAt: new Date().toISOString(),
  subjects: normalizeSubjects(subjects).map((subject) => clone(subject)),
});

export const saveContentDraft = (subjects) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONTENT_STORAGE_KEY, JSON.stringify({
    ...buildContentDocument(subjects),
    savedAsDraftAt: new Date().toISOString(),
  }));
};

export const loadContentDraft = () => {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CONTENT_STORAGE_KEY));
    return parsed?.subjects ? normalizeSubjects(parsed.subjects) : null;
  } catch {
    return null;
  }
};

export const clearContentDraft = () => {
  if (typeof window !== 'undefined') window.localStorage.removeItem(CONTENT_STORAGE_KEY);
};

export const loadSharedContent = async () => {
  const response = await fetch(`/content.json?version=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Shared study content is unavailable.');
  return normalizeContentDocument(await response.json());
};

export const publishSharedContent = async (subjects, password) => {
  const response = await fetch('/.netlify/functions/content-publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, content: buildContentDocument(subjects) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'GitHub could not publish the content.');
  clearContentDraft();
  return payload;
};
