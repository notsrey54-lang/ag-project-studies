import test from 'node:test';
import assert from 'node:assert/strict';
import { getSectionProgress, getSubjectProgress, markAllSubjectsComplete, markSubjectComplete, resetProgress } from '../src/lib/studyProfile.js';

const subject = {
  id: 'ECO101',
  modules: [
    { id: 'course-1', section: 'course' },
    { id: 'midterm-1', section: 'midterm' },
    { id: 'midterm-2', section: 'midterm' },
    { id: 'final-1', section: 'final' },
  ],
};

test('reports separate capped progress for course, midterm, and final chapters', () => {
  const profile = { progress: { ECO101: { 'midterm-1': true, 'midterm-2': true } } };
  assert.deepEqual(getSectionProgress(profile, subject, 'midterm'), { completed: 2, total: 2, percent: 100 });
  assert.deepEqual(getSectionProgress(profile, subject, 'final'), { completed: 0, total: 1, percent: 0 });
  assert.deepEqual(getSubjectProgress(profile, subject), { completed: 2, total: 4, percent: 50 });
});

test('completion controls only write local profile progress and reset cleanly', () => {
  const profile = { progress: { other: { old: true } } };
  const selected = markSubjectComplete(profile, subject);
  assert.equal(getSubjectProgress(selected, subject).percent, 100);
  assert.deepEqual(selected.progress.other, { old: true });

  const all = markAllSubjectsComplete(profile, [subject]);
  assert.equal(getSubjectProgress(all, subject).percent, 100);
  assert.deepEqual(resetProgress(all).progress, {});
});
