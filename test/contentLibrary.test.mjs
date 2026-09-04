import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContentDocument, createBlankContentBlock, createBlankSlide, createBlankSubject, mergeSharedSubjects, normalizeContentDocument, validateContentSubjects } from '../src/lib/contentLibrary.js';

test('normalizes advanced content collections with safe defaults', () => {
  const subject = normalizeContentDocument({ subjects: [{ id: 'MIS101', code: 'MIS101', name: 'MIS', modules: [{ title: 'Chapter 1' }], materials: [{ title: 'Notes', body: 'Body' }], quiz: [{ prompt: 'Q', options: ['A', 'B'], answer: 1 }] }] }).subjects[0];
  assert.equal(subject.modules.length, 1);
  assert.equal(subject.modules[0].section, 'course');
  assert.equal(subject.materials[0].body, 'Body');
  assert.equal(subject.quiz[0].options.length, 4);
  assert.equal(subject.quiz[0].answer, 1);
  assert.deepEqual(subject.resources, []);
  assert.deepEqual(subject.glossary, []);
});

test('keeps midterm and final chapters under the same subject', () => {
  const subject = normalizeContentDocument({ subjects: [{ id: 'ECO101', modules: [
    { id: 'one', title: 'Foundations', section: 'course' },
    { id: 'two', title: 'Midterm chapters', section: 'midterm' },
    { id: 'three', title: 'Final chapters', section: 'final' },
  ] }] }).subjects[0];
  assert.equal(subject.id, 'ECO101');
  assert.deepEqual(subject.modules.map((module) => module.section), ['course', 'midterm', 'final']);
});

test('shared subjects override a built-in subject without removing the catalog', () => {
  const base = [createBlankSubject(), { id: 'ECO101', code: 'ECO101', name: 'Economics', modules: [{ id: 'one', title: 'Old' }] }];
  const merged = mergeSharedSubjects(base, [{ id: 'ECO101', code: 'ECO101', name: 'Economics updated', modules: [{ id: 'one', title: 'New' }] }]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((item) => item.id === 'ECO101').name, 'Economics updated');
  assert.equal(merged.find((item) => item.id === 'ECO101').modules[0].title, 'New');
});

test('builds a publishable versioned document', () => {
  const document = buildContentDocument([{ id: 'x', code: 'X', name: 'Test' }]);
  assert.equal(document.version, 2);
  assert.equal(document.subjects[0].code, 'X');
  assert.ok(document.updatedAt);
});

test('normalizes Office-style documents to safe supported settings', () => {
  const block = createBlankContentBlock('rich_text');
  block.content = {
    ...block.content,
    runs: [
      { text: 'Safe ', bold: true, link: 'javascript:alert(1)' },
      { text: 'link', underline: true, link: 'https://example.com/notes' },
    ],
    fontFamily: 'url(javascript:bad)',
    fontSize: 900,
    textColor: 'expression(alert(1))',
    highlight: '#fff2a8',
    scale: 'unknown',
    pageOrientation: 'landscape',
  };
  const normalized = normalizeContentDocument({ subjects: [{ id: 'SAFE101', code: 'SAFE101', name: 'Safety', contentBlocks: [block] }] }).subjects[0].contentBlocks[0];
  assert.equal(normalized.content.runs[0].link, '');
  assert.equal(normalized.content.runs[1].link, 'https://example.com/notes');
  assert.equal(normalized.content.fontFamily, 'Aptos');
  assert.equal(normalized.content.fontSize, 42);
  assert.equal(normalized.content.textColor, '#111111');
  assert.equal(normalized.content.highlight, '#fff2a8');
  assert.equal(normalized.content.scale, 'body');
  assert.equal(normalized.content.pageOrientation, 'landscape');
});

test('keeps presentation layouts, transitions, and bounded shapes', () => {
  const slide = {
    ...createBlankSlide(),
    title: 'Demand and supply',
    layout: 'split',
    tone: 'green',
    transition: 'fade',
    transitionDuration: 9999,
    animation: 'float',
    shapes: [{ id: 'shape-1', type: 'circle', x: -20, y: 120, width: 0, height: 300, fill: '#123abc' }],
  };
  const block = createBlankContentBlock('presentation');
  block.title = 'Economics deck';
  block.content.slides = [slide];
  const normalized = normalizeContentDocument({ subjects: [{ id: 'ECO101', code: 'ECO101', name: 'Economics', contentBlocks: [block] }] }).subjects[0].contentBlocks[0].content.slides[0];
  assert.equal(normalized.layout, 'split');
  assert.equal(normalized.tone, 'green');
  assert.equal(normalized.transition, 'fade');
  assert.equal(normalized.transitionDuration, 2000);
  assert.equal(normalized.animation, 'float');
  assert.deepEqual([normalized.shapes[0].x, normalized.shapes[0].y], [0, 95]);
  assert.deepEqual([normalized.shapes[0].width, normalized.shapes[0].height], [2, 100]);
});

test('blocks incomplete public content before publishing', () => {
  const errors = validateContentSubjects([createBlankSubject()]);
  assert.ok(errors.some((error) => error.includes('real subject code')));
  assert.ok(errors.some((error) => error.includes('real subject name')));
});

test('preserves bilingual rich blocks and advanced response settings', () => {
  const block = createBlankContentBlock('table');
  const subject = normalizeContentDocument({ subjects: [{ id: 'MIS101', code: 'MIS101', name: 'MIS', contentBlocks: [{ ...block, title: 'Comparison table', titleAr: 'جدول مقارنة', content: { ...block.content, columns: ['English', 'Arabic'], rows: [['One', 'واحد']] } }], quiz: [{ id: 'q', questionType: 'paragraph', responseFormat: 'paragraph', prompt: 'Explain the idea.', promptAr: 'اشرح الفكرة', points: 5, modelAnswer: 'A complete answer.', modelAnswerAr: 'إجابة كاملة', rubric: [{ criterion: 'Accuracy', points: 5 }] }] }] }).subjects[0];
  assert.equal(subject.contentBlocks[0].type, 'table');
  assert.equal(subject.contentBlocks[0].content.rows[0][1], 'واحد');
  assert.equal(subject.quiz[0].questionType, 'paragraph');
  assert.equal(subject.quiz[0].points, 5);
  assert.equal(subject.quiz[0].rubric[0].points, 5);
});
