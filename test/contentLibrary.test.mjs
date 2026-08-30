import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContentDocument, createBlankContentBlock, createBlankSubject, mergeSharedSubjects, normalizeContentDocument, validateContentSubjects } from '../src/lib/contentLibrary.js';

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
  assert.equal(document.version, 1);
  assert.equal(document.subjects[0].code, 'X');
  assert.ok(document.updatedAt);
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
