import { getSupabaseConfig, supabaseHeaders } from './supabaseClient.js';
import { normalizeRichRuns, richRunsToText, textToRichRuns } from './richText.js';

const CONTENT_STORAGE_KEY = 'ag-study-content-draft-v1';

export const CONTENT_VERSION = 2;

export const CHAPTER_SECTIONS = Object.freeze([
  { id: 'course', label: 'Course content' },
  { id: 'midterm', label: 'Midterm' },
  { id: 'final', label: 'Final' },
]);

const chapterSectionIds = new Set(CHAPTER_SECTIONS.map((section) => section.id));
const blockTypes = new Set(['paragraph', 'rich_text', 'heading', 'bullet_list', 'numbered_list', 'checklist', 'callout', 'quote', 'table', 'formula', 'comparison', 'timeline', 'link', 'image', 'video', 'audio', 'code', 'drawing', 'divider', 'presentation', 'custom']);
const toolTypes = new Set(['calculator', 'formula_practice', 'graph', 'matching', 'timeline', 'custom']);
const officeFonts = new Set(['Aptos', 'Arial', 'Georgia', 'Times New Roman', 'Verdana']);
const richTextScales = new Set(['body', 'compact', 'heading1', 'heading2', 'title', 'subtitle', 'lead', 'small']);
const pageThemes = new Set(['white', 'warm', 'focus']);
const slideLayouts = new Set(['title-content', 'title-only', 'split', 'quote']);
const slideTones = new Set(['gold', 'green', 'blue', 'purple']);
const slideTransitions = new Set(['none', 'fade', 'push', 'wipe']);
const slideAnimations = new Set(['none', 'appear', 'fade', 'float']);
const slideShapeTypes = new Set(['rectangle', 'circle', 'line', 'arrow', 'star']);

export const getChapterSectionLabel = (section) => CHAPTER_SECTIONS.find((candidate) => candidate.id === section)?.label || 'Course content';

const clone = (value) => JSON.parse(JSON.stringify(value));
const text = (value, fallback = '') => typeof value === 'string' ? value : fallback;
const list = (value) => Array.isArray(value) ? value : [];
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const finiteNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export const createContentId = (prefix = 'item') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createBlankSubject = () => ({
  id: createContentId('subject'),
  code: 'NEW101',
  name: 'New subject',
  shortName: 'New subject',
  description: 'Add a clear description for this subject.',
  descriptionAr: '',
  eyebrow: 'Your study space',
  eyebrowAr: '',
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
  contentBlocks: [],
  tools: [],
  customTypes: [],
  metadata: {},
});

export const createBlankModule = () => ({
  id: createContentId('chapter'),
  title: 'Chapter 1',
  titleAr: '',
  subtitle: 'Add a chapter description',
  subtitleAr: '',
  duration: '15 min',
  section: 'course',
});

export const createBlankMaterial = () => ({
  id: createContentId('note'),
  title: 'New note',
  titleAr: '',
  summary: '',
  summaryAr: '',
  body: '',
  bodyAr: '',
  points: [],
  example: '',
  exampleAr: '',
  chapterId: '',
});

export const createBlankResource = () => ({
  id: createContentId('resource'),
  title: 'New resource',
  titleAr: '',
  type: 'PDF',
  url: '',
  description: '',
  descriptionAr: '',
  chapterId: '',
});

export const createBlankFlashcard = () => ({
  id: createContentId('flashcard'),
  prompt: '',
  promptAr: '',
  answer: '',
  answerAr: '',
  label: 'Review',
  labelAr: '',
  chapterId: '',
  difficulty: 'medium',
  tags: [],
});

export const createBlankQuizQuestion = () => ({
  id: createContentId('question'),
  questionType: 'mcq',
  responseFormat: 'single_choice',
  prompt: '',
  promptAr: '',
  options: ['', '', '', ''],
  answer: 0,
  correctAnswer: '',
  points: 1,
  negativePoints: 0,
  explanation: '',
  explanationAr: '',
  modelAnswer: '',
  modelAnswerAr: '',
  hint: '',
  hintAr: '',
  difficulty: 'medium',
  tags: [],
  rubric: [],
  chapterId: '',
  settings: {},
});

export const createBlankGlossaryItem = () => ({
  id: createContentId('term'),
  term: '',
  termAr: '',
  definition: '',
  definitionAr: '',
});

export const createBlankFormula = () => ({
  id: createContentId('formula'),
  name: '',
  nameAr: '',
  expression: '',
  explanation: '',
  explanationAr: '',
  example: '',
  exampleAr: '',
});

export const createBlankSlide = () => ({
  id: createContentId('slide'),
  layout: 'title-content',
  tone: 'gold',
  title: 'Untitled slide',
  titleAr: '',
  subtitle: '',
  subtitleAr: '',
  body: '',
  bodyAr: '',
  items: [],
  itemsAr: [],
  notes: '',
  shapes: [],
  fontFamily: 'Aptos',
  fontSize: 28,
  bold: false,
  italic: false,
  underline: false,
  align: 'center',
  direction: 'ltr',
  transition: 'none',
  transitionDuration: 500,
  animation: 'none',
});

export const createBlankContentBlock = (type = 'paragraph') => {
  const normalizedType = blockTypes.has(type) ? type : 'paragraph';
  const block = {
    id: createContentId('block'),
    type: normalizedType,
    title: normalizedType === 'presentation' ? 'New presentation' : '',
    titleAr: '',
    chapterId: '',
    section: 'course',
    order: 0,
    content: {
      text: '',
      textAr: '',
      runs: [],
      items: [],
      itemsAr: [],
      columns: ['Column 1', 'Column 2'],
      rows: [['', '']],
      formula: '',
      formulaAr: '',
      url: '',
      label: '',
      labelAr: '',
      alt: '',
      source: '',
      code: '',
      language: 'text',
      quote: '',
      quoteAr: '',
      citation: '',
      leftTitle: '',
      rightTitle: '',
      leftItems: [],
      rightItems: [],
      events: [],
      imageData: '',
      alignment: 'start',
      direction: 'ltr',
      fontFamily: 'Aptos',
      fontSize: 12,
      textColor: '#111111',
      highlight: 'transparent',
      scale: 'body',
      pageTheme: 'white',
      pageMargins: 'normal',
      pageOrientation: 'portrait',
      level: 2,
      slides: normalizedType === 'presentation' ? [createBlankSlide()] : [],
      config: {},
    },
  };
  return block;
};

export const createBlankTool = () => ({
  id: createContentId('tool'),
  type: 'custom',
  name: 'New tool',
  nameAr: '',
  description: '',
  descriptionAr: '',
  chapterId: '',
  order: 0,
  config: {},
});

const normalizeModule = (module, index) => ({
  ...object(module),
  id: text(module?.id, createContentId('chapter')),
  title: text(module?.title, `Chapter ${index + 1}`),
  titleAr: text(module?.titleAr),
  subtitle: text(module?.subtitle),
  subtitleAr: text(module?.subtitleAr),
  duration: text(module?.duration, '15 min'),
  section: chapterSectionIds.has(module?.section)
    ? module.section
    : chapterSectionIds.has(module?.assessment)
      ? module.assessment
      : 'course',
});

const normalizeMaterial = (material, index) => ({
  ...object(material),
  id: text(material?.id, createContentId('note')),
  title: text(material?.title, `Note ${index + 1}`),
  titleAr: text(material?.titleAr),
  summary: text(material?.summary),
  summaryAr: text(material?.summaryAr),
  body: text(material?.body),
  bodyAr: text(material?.bodyAr),
  points: list(material?.points).map((point) => Array.isArray(point)
    ? [text(point[0]), text(point[1])]
    : [text(point?.term), text(point?.explanation)]),
  example: text(material?.example),
  exampleAr: text(material?.exampleAr),
  chapterId: text(material?.chapterId),
});

const normalizeResource = (resource, index) => ({
  ...object(resource),
  id: text(resource?.id, createContentId('resource')),
  title: text(resource?.title, `Resource ${index + 1}`),
  titleAr: text(resource?.titleAr),
  type: text(resource?.type, 'Link'),
  url: text(resource?.url),
  description: text(resource?.description),
  descriptionAr: text(resource?.descriptionAr),
  chapterId: text(resource?.chapterId),
});

const normalizeFlashcard = (card, index) => ({
  ...object(card),
  id: text(card?.id, createContentId('flashcard')),
  prompt: text(card?.prompt, `Flashcard ${index + 1}`),
  promptAr: text(card?.promptAr),
  answer: text(card?.answer),
  answerAr: text(card?.answerAr),
  label: text(card?.label, 'Review'),
  labelAr: text(card?.labelAr),
  chapterId: text(card?.chapterId),
  difficulty: ['easy', 'medium', 'hard'].includes(card?.difficulty) ? card.difficulty : 'medium',
  tags: list(card?.tags).map((tag) => text(tag)).filter(Boolean),
});

const normalizeQuestion = (question, index) => {
  const type = ['mcq', 'true_false', 'short_answer', 'paragraph', 'bullet_point', 'matching', 'ordering', 'formula'].includes(question?.questionType)
    ? question.questionType
    : 'mcq';
  const rawOptions = list(question?.options).map((option) => text(option));
  const options = type === 'mcq'
    ? [...rawOptions, '', '', '', ''].slice(0, 4)
    : rawOptions;
  const answer = Number.isInteger(question?.answer) ? question.answer : Number(question?.answer);
  return {
    ...object(question),
    id: text(question?.id, createContentId('question')),
    questionType: type,
    responseFormat: text(question?.responseFormat, type === 'mcq' ? 'single_choice' : 'paragraph'),
    prompt: text(question?.prompt, `Question ${index + 1}`),
    promptAr: text(question?.promptAr),
    options,
    answer: Number.isInteger(answer) && answer >= 0 ? answer : 0,
    correctAnswer: text(question?.correctAnswer),
    points: Math.max(0, finiteNumber(question?.points, 1)),
    negativePoints: Math.max(0, finiteNumber(question?.negativePoints, 0)),
    explanation: text(question?.explanation),
    explanationAr: text(question?.explanationAr),
    modelAnswer: text(question?.modelAnswer),
    modelAnswerAr: text(question?.modelAnswerAr),
    hint: text(question?.hint),
    hintAr: text(question?.hintAr),
    difficulty: ['easy', 'medium', 'hard', 'exam'].includes(question?.difficulty) ? question.difficulty : 'medium',
    tags: list(question?.tags).map((tag) => text(tag)).filter(Boolean),
    rubric: list(question?.rubric).map((item) => object(item)),
    chapterId: text(question?.chapterId),
    settings: object(question?.settings),
  };
};

const normalizeGlossary = (item, index) => ({
  ...object(item),
  id: text(item?.id, createContentId('term')),
  term: text(item?.term, `Term ${index + 1}`),
  termAr: text(item?.termAr),
  definition: text(item?.definition),
  definitionAr: text(item?.definitionAr),
});

const normalizeFormula = (formula, index) => ({
  ...object(formula),
  id: text(formula?.id, createContentId('formula')),
  name: text(formula?.name, `Formula ${index + 1}`),
  nameAr: text(formula?.nameAr),
  expression: text(formula?.expression),
  explanation: text(formula?.explanation),
  explanationAr: text(formula?.explanationAr),
  example: text(formula?.example),
  exampleAr: text(formula?.exampleAr),
});

const normalizeSlideShape = (shape, index) => ({
  ...object(shape),
  id: text(shape?.id, createContentId(`shape-${index + 1}`)),
  type: slideShapeTypes.has(shape?.type) ? shape.type : 'rectangle',
  x: Math.min(95, Math.max(0, finiteNumber(shape?.x, 35))),
  y: Math.min(95, Math.max(0, finiteNumber(shape?.y, 42))),
  width: Math.min(100, Math.max(2, finiteNumber(shape?.width, 15))),
  height: Math.min(100, Math.max(2, finiteNumber(shape?.height, 15))),
  fill: /^#[0-9a-f]{6}$/i.test(text(shape?.fill)) ? shape.fill : '#d2a216',
  text: text(shape?.text),
});

const normalizeSlide = (slide, index) => ({
  ...object(slide),
  id: text(slide?.id, createContentId('slide')),
  layout: slideLayouts.has(slide?.layout) ? slide.layout : 'title-content',
  tone: slideTones.has(slide?.tone) ? slide.tone : 'gold',
  title: text(slide?.title, `Slide ${index + 1}`),
  titleAr: text(slide?.titleAr),
  subtitle: text(slide?.subtitle),
  subtitleAr: text(slide?.subtitleAr),
  body: text(slide?.body),
  bodyAr: text(slide?.bodyAr),
  items: list(slide?.items).map((item) => text(item)).filter(Boolean),
  itemsAr: list(slide?.itemsAr).map((item) => text(item)).filter(Boolean),
  notes: text(slide?.notes),
  shapes: list(slide?.shapes).slice(0, 50).map(normalizeSlideShape),
  fontFamily: officeFonts.has(slide?.fontFamily) ? slide.fontFamily : 'Aptos',
  fontSize: Math.min(54, Math.max(18, finiteNumber(slide?.fontSize, 28))),
  bold: Boolean(slide?.bold),
  italic: Boolean(slide?.italic),
  underline: Boolean(slide?.underline),
  align: ['start', 'center', 'end'].includes(slide?.align) ? slide.align : 'center',
  direction: slide?.direction === 'rtl' ? 'rtl' : 'ltr',
  transition: slideTransitions.has(slide?.transition) ? slide.transition : 'none',
  transitionDuration: Math.min(2000, Math.max(200, finiteNumber(slide?.transitionDuration, 500))),
  animation: slideAnimations.has(slide?.animation) ? slide.animation : 'none',
});

const normalizeBlock = (block, index) => {
  const rawContent = object(block?.content);
  const type = blockTypes.has(block?.type) ? block.type : 'paragraph';
  const fallback = createBlankContentBlock(type);
  const runs = normalizeRichRuns(rawContent.runs);
  const slides = list(rawContent.slides).map(normalizeSlide);
  return {
    ...object(block),
    id: text(block?.id, createContentId('block')),
    type,
    title: text(block?.title),
    titleAr: text(block?.titleAr),
    chapterId: text(block?.chapterId),
    section: chapterSectionIds.has(block?.section) ? block.section : 'course',
    order: finiteNumber(block?.order, index),
    content: {
      ...fallback.content,
      ...rawContent,
      runs: runs.length ? runs : type === 'rich_text' ? textToRichRuns(text(rawContent.text)) : [],
      text: type === 'rich_text' && runs.length ? richRunsToText(runs) : text(rawContent.text),
      alignment: ['start', 'center', 'end', 'justify'].includes(rawContent.alignment) ? rawContent.alignment : 'start',
      direction: rawContent.direction === 'rtl' ? 'rtl' : 'ltr',
      fontFamily: officeFonts.has(rawContent.fontFamily) ? rawContent.fontFamily : 'Aptos',
      fontSize: Math.min(42, Math.max(10, finiteNumber(rawContent.fontSize, 12))),
      textColor: /^#[0-9a-f]{6}$/i.test(text(rawContent.textColor)) ? rawContent.textColor : '#111111',
      highlight: rawContent.highlight === 'transparent' || /^#[0-9a-f]{6}$/i.test(text(rawContent.highlight)) ? rawContent.highlight : 'transparent',
      scale: richTextScales.has(rawContent.scale) ? rawContent.scale : 'body',
      pageTheme: pageThemes.has(rawContent.pageTheme) ? rawContent.pageTheme : 'white',
      pageMargins: ['normal', 'narrow', 'wide'].includes(rawContent.pageMargins) ? rawContent.pageMargins : 'normal',
      pageOrientation: rawContent.pageOrientation === 'landscape' ? 'landscape' : 'portrait',
      level: Math.min(6, Math.max(1, Math.trunc(finiteNumber(rawContent.level, 2)))),
      slides: type === 'presentation' ? (slides.length ? slides : [createBlankSlide()]) : slides,
    },
  };
};

const normalizeTool = (tool, index) => ({
  ...object(tool),
  id: text(tool?.id, createContentId('tool')),
  type: toolTypes.has(tool?.type) ? tool.type : 'custom',
  name: text(tool?.name, `Tool ${index + 1}`),
  nameAr: text(tool?.nameAr),
  description: text(tool?.description),
  descriptionAr: text(tool?.descriptionAr),
  chapterId: text(tool?.chapterId),
  order: finiteNumber(tool?.order, index),
  config: object(tool?.config),
});

export const normalizeSubject = (subject, index = 0) => ({
  ...object(subject),
  id: text(subject?.id, createContentId('subject')),
  code: text(subject?.code, `SUB${index + 1}`),
  name: text(subject?.name, 'Untitled subject'),
  shortName: text(subject?.shortName, text(subject?.name, 'Subject')),
  description: text(subject?.description),
  descriptionAr: text(subject?.descriptionAr),
  eyebrow: text(subject?.eyebrow, 'Your study space'),
  eyebrowAr: text(subject?.eyebrowAr),
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
  contentBlocks: list(subject?.contentBlocks).map(normalizeBlock),
  tools: list(subject?.tools).map(normalizeTool),
  customTypes: list(subject?.customTypes).map((type, typeIndex) => ({
    ...object(type),
    id: text(type?.id, createContentId('custom-type')),
    name: text(type?.name, `Custom type ${typeIndex + 1}`),
    nameAr: text(type?.nameAr),
    schema: object(type?.schema),
  })),
  metadata: object(subject?.metadata),
});

export const normalizeSubjects = (subjects) => list(subjects).map(normalizeSubject);

const containsUnsafeMarkup = (value) => {
  if (typeof value === 'string') return /<\s*script|javascript\s*:|on[a-z]+\s*=/i.test(value);
  if (Array.isArray(value)) return value.some(containsUnsafeMarkup);
  if (value && typeof value === 'object') return Object.values(value).some(containsUnsafeMarkup);
  return false;
};

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
    const checkText = (value, label) => { if (containsUnsafeMarkup(value)) addError(`${subjectLabel}, ${label}: remove unsafe HTML or JavaScript.`); };

    checkCollectionIds(subject.modules, 'chapter');
    subject.modules.forEach((module, moduleIndex) => {
      if (!module.title.trim()) addError(`${subjectLabel}, chapter ${moduleIndex + 1}: add a title.`);
      if (!chapterSectionIds.has(module.section)) addError(`${subjectLabel}, ${module.title || `chapter ${moduleIndex + 1}`}: choose a valid assessment section.`);
      checkText(module.title, `chapter ${moduleIndex + 1}`);
      checkText(module.subtitle, `chapter ${moduleIndex + 1}`);
    });
    checkCollectionIds(subject.materials, 'note');
    subject.materials.forEach((material, materialIndex) => {
      const hasContent = material.body.trim() || material.bodyAr.trim() || material.summary.trim() || material.summaryAr.trim() || material.example.trim() || material.points.length;
      if (!material.title.trim() || !hasContent) addError(`${subjectLabel}, note ${materialIndex + 1}: add a title and some note content.`);
      [material.title, material.summary, material.body, material.example].forEach((value) => checkText(value, `note ${materialIndex + 1}`));
    });
    checkCollectionIds(subject.resources, 'resource');
    subject.resources.forEach((resource, resourceIndex) => {
      if (!resource.title.trim() || !resource.url.trim()) addError(`${subjectLabel}, resource ${resourceIndex + 1}: add both a title and URL.`);
      if (resource.url && !/^https:\/\//i.test(resource.url)) addError(`${subjectLabel}, resource ${resourceIndex + 1}: use an HTTPS URL.`);
    });
    checkCollectionIds(subject.flashcards, 'flashcard');
    subject.flashcards.forEach((card, cardIndex) => {
      if (!card.prompt.trim() || !card.answer.trim()) addError(`${subjectLabel}, flashcard ${cardIndex + 1}: add both a prompt and answer.`);
    });
    checkCollectionIds(subject.quiz, 'quiz item');
    subject.quiz.forEach((question, questionIndex) => {
      if (!question.prompt.trim()) addError(`${subjectLabel}, question ${questionIndex + 1}: add a prompt.`);
      if (question.questionType === 'mcq') {
        if (question.options.length < 2 || question.options.some((option) => !option.trim())) addError(`${subjectLabel}, question ${questionIndex + 1}: add all multiple-choice options.`);
        if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer >= question.options.length) addError(`${subjectLabel}, question ${questionIndex + 1}: choose a valid correct option.`);
      }
      if (question.points < 0 || question.negativePoints < 0) addError(`${subjectLabel}, question ${questionIndex + 1}: points cannot be negative.`);
      [question.prompt, question.explanation, question.modelAnswer, question.hint].forEach((value) => checkText(value, `question ${questionIndex + 1}`));
    });
    checkCollectionIds(subject.glossary, 'glossary item');
    subject.glossary.forEach((item, itemIndex) => {
      if (!item.term.trim() || !item.definition.trim()) addError(`${subjectLabel}, glossary item ${itemIndex + 1}: add a term and definition.`);
    });
    checkCollectionIds(subject.formulas, 'formula');
    subject.formulas.forEach((formula, formulaIndex) => {
      if (!formula.name.trim() || !formula.expression.trim()) addError(`${subjectLabel}, formula ${formulaIndex + 1}: add a name and expression.`);
    });
    checkCollectionIds(subject.contentBlocks, 'content block');
    subject.contentBlocks.forEach((block, blockIndex) => {
      if (!blockTypes.has(block.type)) addError(`${subjectLabel}, block ${blockIndex + 1}: choose a supported block type.`);
      if (!chapterSectionIds.has(block.section)) addError(`${subjectLabel}, block ${blockIndex + 1}: choose a valid assessment section.`);
      if (block.type === 'image' && block.content.url && !/^https:\/\//i.test(block.content.url) && !/^data:image\//i.test(block.content.url)) addError(`${subjectLabel}, block ${blockIndex + 1}: image URLs must use HTTPS.`);
      if (block.type === 'link' && block.content.url && !/^https:\/\//i.test(block.content.url)) addError(`${subjectLabel}, block ${blockIndex + 1}: links must use HTTPS.`);
      if (block.type === 'rich_text' && !richRunsToText(block.content.runs).trim() && !block.content.text.trim()) addError(`${subjectLabel}, block ${blockIndex + 1}: add text or remove the empty document block.`);
      if (block.type === 'presentation') {
        if (!block.content.slides.length) addError(`${subjectLabel}, presentation ${blockIndex + 1}: add at least one slide.`);
        const slideIds = new Set();
        block.content.slides.forEach((slide, slideIndex) => {
          if (slideIds.has(slide.id)) addError(`${subjectLabel}, presentation ${blockIndex + 1}: duplicate slide ID.`);
          slideIds.add(slide.id);
          if (!slide.title.trim() && !slide.titleAr.trim()) addError(`${subjectLabel}, presentation ${blockIndex + 1}, slide ${slideIndex + 1}: add a title.`);
        });
      }
      checkText(block.title, `block ${blockIndex + 1}`);
      checkText(block.content, `block ${blockIndex + 1}`);
    });
    checkCollectionIds(subject.tools, 'tool');
    checkCollectionIds(subject.customTypes, 'custom type');
  });

  return errors;
};

export const normalizeContentDocument = (candidate) => {
  const source = typeof candidate === 'string' ? (() => { try { return JSON.parse(candidate); } catch { return {}; } })() : object(candidate);
  return {
    version: CONTENT_VERSION,
    updatedAt: text(source.updatedAt, null),
    subjects: normalizeSubjects(source.subjects),
  };
};

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
  contentBlocks: override && Object.prototype.hasOwnProperty.call(override, 'contentBlocks') ? override.contentBlocks : base?.contentBlocks,
  tools: override && Object.prototype.hasOwnProperty.call(override, 'tools') ? override.tools : base?.tools,
  customTypes: override && Object.prototype.hasOwnProperty.call(override, 'customTypes') ? override.customTypes : base?.customTypes,
  metadata: override && Object.prototype.hasOwnProperty.call(override, 'metadata') ? override.metadata : base?.metadata,
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

const readSupabaseContent = async () => {
  const config = getSupabaseConfig();
  const response = await fetch(`${config.url}/rest/v1/cms_public_subjects?select=document&order=code.asc`, {
    headers: supabaseHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Supabase shared content is unavailable.');
  const rows = await response.json();
  const subjects = list(rows).flatMap((row) => {
    const document = typeof row.document === 'string' ? (() => { try { return JSON.parse(row.document); } catch { return null; } })() : row.document;
    if (Array.isArray(document?.subjects)) return document.subjects;
    return document && typeof document === 'object' ? [document] : [];
  });
  return normalizeContentDocument({ subjects });
};

export const loadSharedContent = async () => {
  try {
    return await readSupabaseContent();
  } catch {
    const response = await fetch(`/content.json?version=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Shared study content is unavailable.');
    return normalizeContentDocument(await response.json());
  }
};

export const publishSharedContent = async (subjects, password) => {
  const config = getSupabaseConfig();
  const response = await fetch(`${config.url}/functions/v1/content-publish`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify({ action: 'publish', password, content: buildContentDocument(subjects) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Supabase could not publish the content.');
  clearContentDraft();
  return payload;
};
