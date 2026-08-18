import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createQuestionDraft,
  createSubjectDraft,
  normalizeContentDocument,
  normalizeSubject,
} from '../src/lib/contentModel.js';

test('content model keeps bilingual fields and safe reusable tools', () => {
  const subject = normalizeSubject({
    id: 'eco',
    code: 'ECO101',
    name: 'Economics',
    nameAr: 'اقتصاد',
    tools: ['economics', { unsafe: true }],
    quiz: [{ id: 'q', prompt: 'Question', options: ['A', 'B'], answer: 1, difficulty: 'evil' }],
  });

  assert.equal(subject.nameAr, 'اقتصاد');
  assert.deepEqual(subject.tools, ['economics']);
  assert.equal(subject.quiz[0].difficulty, 'evil');
  assert.equal(subject.quiz[0].options.length, 2);
});

test('content documents normalize drafts and preserve a bounded schema', () => {
  const draft = createSubjectDraft(0);
  const question = createQuestionDraft(draft.id, 0);
  const document = normalizeContentDocument({ subjects: [{ ...draft, quiz: [question] }] });

  assert.equal(document.version, 1);
  assert.equal(document.subjects.length, 1);
  assert.equal(document.subjects[0].quiz.length, 1);
  assert.equal(document.subjects[0].code, 'SUB1');
});
