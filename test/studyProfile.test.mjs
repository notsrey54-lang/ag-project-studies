import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createEmptyProfile,
  getSubjectProgress,
  mergeProfiles,
  recordQuizAttempt,
  toggleBookmark,
  toggleModule,
} from '../src/lib/studyProfile.js';

const subject = {
  id: 'BUC111',
  modules: [{ id: 'one' }, { id: 'two' }, { id: 'three' }],
};

test('completion and saved concepts calculate from a single profile', () => {
  let profile = createEmptyProfile();
  profile = toggleModule(profile, 'BUC111', 'one');
  profile = toggleModule(profile, 'BUC111', 'two');
  profile = toggleBookmark(profile, 'BUC111', 'one');
  profile = recordQuizAttempt(profile, 'BUC111', true);

  assert.deepEqual(getSubjectProgress(profile, subject), { completed: 2, total: 3, percent: 67 });
  assert.equal(profile.bookmarks.BUC111.one, true);
  assert.deepEqual(profile.quizAttempts.BUC111, { attempted: 1, correct: 1 });
});

test('cross-device merge preserves different completed modules in one subject', () => {
  const remote = {
    ...createEmptyProfile(),
    updatedAt: '2026-08-08T11:00:00.000Z',
    progress: { BUC111: { one: true } },
    bookmarks: { BUC111: { one: true } },
  };
  const local = {
    ...createEmptyProfile(),
    updatedAt: '2026-08-08T12:00:00.000Z',
    progress: { BUC111: { two: true } },
    bookmarks: { BUC111: { two: true } },
  };

  const merged = mergeProfiles(local, remote);
  assert.deepEqual(merged.progress.BUC111, { one: true, two: true });
  assert.deepEqual(merged.bookmarks.BUC111, { one: true, two: true });
});
