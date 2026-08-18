export const CONTENT_VERSION = 1;

const text = (value, fallback = '') => (typeof value === 'string' ? value : fallback);

const slug = (value, fallback = 'subject') => {
  const normalized = text(value, fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
};

const bounded = (value, fallback, max = 12000) => text(value, fallback).slice(0, max);

const normalizeOptions = (options) => (
  Array.isArray(options) ? options.slice(0, 8).map((option) => bounded(option, '', 300)) : []
);

const normalizePoints = (points) => (
  Array.isArray(points)
    ? points.slice(0, 20).map((point) => (Array.isArray(point)
      ? [bounded(point[0], 'Key point', 160), bounded(point[1], '', 1200)]
      : [bounded(point?.term, 'Key point', 160), bounded(point?.explanation, '', 1200)]))
    : []
);

export const normalizeSubject = (candidate, index = 0) => {
  const source = candidate && typeof candidate === 'object' ? candidate : {};
  const code = bounded(source.code, `SUB${index + 1}`, 24).trim() || `SUB${index + 1}`;
  const id = bounded(source.id, slug(code, `subject-${index + 1}`), 80).trim() || slug(code, `subject-${index + 1}`);

  return {
    ...source,
    id,
    code,
    name: bounded(source.name, code, 120),
    nameAr: bounded(source.nameAr, '', 160),
    shortName: bounded(source.shortName, bounded(source.name, code, 80), 80),
    shortNameAr: bounded(source.shortNameAr, '', 100),
    description: bounded(source.description, '', 1000),
    descriptionAr: bounded(source.descriptionAr, '', 1200),
    eyebrow: bounded(source.eyebrow, 'Your study space', 120),
    eyebrowAr: bounded(source.eyebrowAr, '', 140),
    color: ['gold', 'green', 'blue', 'rose', 'violet'].includes(source.color) ? source.color : 'gold',
    materialType: source.materialType === 'legacy' ? 'legacy' : 'structured',
    modules: Array.isArray(source.modules) ? source.modules.slice(0, 80).map((module, moduleIndex) => ({
      id: bounded(module?.id, `${id}-module-${moduleIndex + 1}`, 100),
      title: bounded(module?.title, `Chapter ${moduleIndex + 1}`, 160),
      titleAr: bounded(module?.titleAr, '', 180),
      subtitle: bounded(module?.subtitle, '', 400),
      subtitleAr: bounded(module?.subtitleAr, '', 450),
      duration: bounded(module?.duration, '10 min', 40),
    })) : [],
    materials: Array.isArray(source.materials) ? source.materials.slice(0, 80).map((material, materialIndex) => ({
      id: bounded(material?.id, `${id}-note-${materialIndex + 1}`, 100),
      title: bounded(material?.title, `Lesson ${materialIndex + 1}`, 180),
      titleAr: bounded(material?.titleAr, '', 200),
      summary: bounded(material?.summary, '', 1600),
      summaryAr: bounded(material?.summaryAr, '', 1800),
      points: normalizePoints(material?.points),
      pointsAr: normalizePoints(material?.pointsAr),
      example: bounded(material?.example, '', 1600),
      exampleAr: bounded(material?.exampleAr, '', 1800),
    })) : [],
    flashcards: Array.isArray(source.flashcards) ? source.flashcards.slice(0, 300).map((card, cardIndex) => ({
      id: bounded(card?.id, `${id}-card-${cardIndex + 1}`, 120),
      prompt: bounded(card?.prompt, '', 800),
      answer: bounded(card?.answer, '', 1800),
      promptAr: bounded(card?.promptAr, '', 900),
      answerAr: bounded(card?.answerAr, '', 2000),
      label: bounded(card?.label, 'Review', 100),
      labelAr: bounded(card?.labelAr, '', 120),
    })) : [],
    quiz: Array.isArray(source.quiz) ? source.quiz.slice(0, 300).map((question, questionIndex) => ({
      id: bounded(question?.id, `${id}-question-${questionIndex + 1}`, 120),
      prompt: bounded(question?.prompt, '', 1200),
      promptAr: bounded(question?.promptAr, '', 1400),
      options: normalizeOptions(question?.options),
      optionsAr: normalizeOptions(question?.optionsAr),
      answer: Number.isInteger(question?.answer) ? question.answer : 0,
      explanation: bounded(question?.explanation, '', 1600),
      explanationAr: bounded(question?.explanationAr, '', 1800),
      difficulty: ['easy', 'medium', 'hard', 'evil'].includes(question?.difficulty) ? question.difficulty : 'medium',
    })) : [],
    tools: Array.isArray(source.tools) ? source.tools.filter((tool) => typeof tool === 'string').slice(0, 20) : [],
  };
};

export const normalizeContentDocument = (candidate) => {
  const subjects = Array.isArray(candidate?.subjects) ? candidate.subjects : [];
  return {
    version: CONTENT_VERSION,
    updatedAt: text(candidate?.updatedAt, new Date().toISOString()),
    subjects: subjects.map((subject, index) => normalizeSubject(subject, index)),
  };
};

export const createSubjectDraft = (index = 0) => normalizeSubject({
  id: `subject-${Date.now()}`,
  code: `SUB${index + 1}`,
  name: 'New subject',
  shortName: 'New subject',
  description: 'Add a clear description for this subject.',
  eyebrow: 'Your study space',
  modules: [],
  materials: [],
  flashcards: [],
  quiz: [],
}, index);

export const createModuleDraft = (subjectId, index = 0) => ({
  id: `${slug(subjectId)}-module-${Date.now()}-${index}`,
  title: `Chapter ${index + 1}`,
  titleAr: '',
  subtitle: '',
  subtitleAr: '',
  duration: '10 min',
});

export const createMaterialDraft = (subjectId, index = 0) => ({
  id: `${slug(subjectId)}-note-${Date.now()}-${index}`,
  title: `Lesson ${index + 1}`,
  titleAr: '',
  summary: '',
  summaryAr: '',
  points: [],
  pointsAr: [],
  example: '',
  exampleAr: '',
});

export const createFlashcardDraft = (subjectId, index = 0) => ({
  id: `${slug(subjectId)}-card-${Date.now()}-${index}`,
  prompt: '',
  answer: '',
  promptAr: '',
  answerAr: '',
  label: 'Review',
  labelAr: '',
});

export const createQuestionDraft = (subjectId, index = 0) => ({
  id: `${slug(subjectId)}-question-${Date.now()}-${index}`,
  prompt: '',
  promptAr: '',
  options: ['', '', '', ''],
  optionsAr: ['', '', '', ''],
  answer: 0,
  explanation: '',
  explanationAr: '',
  difficulty: 'medium',
});

export const cloneSubjects = (subjects) => JSON.parse(JSON.stringify((subjects || []).map(normalizeSubject)));

export const localizeField = (value, arabicValue, language = 'en') => (
  language === 'ar' ? (arabicValue || value) : (value || arabicValue)
);
