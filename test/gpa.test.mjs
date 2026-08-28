import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateGpa, calculateTermStats, projectGpa } from '../src/lib/gpa.js';

test('calculates attempted, earned, and GPA credits correctly', () => {
  const terms = [{
    id: 'term-1',
    name: 'Term 1',
    courses: [
      { id: 'a', name: 'A', credits: 3, grade: 'A' },
      { id: 'b', name: 'B', credits: 3, grade: 'B+' },
      { id: 'f', name: 'F', credits: 3, grade: 'F' },
      { id: 'p', name: 'P', credits: 2, grade: 'P' },
      { id: 'tbd', name: 'Planned', credits: 3, grade: 'TBD' },
      { id: 'w', name: 'Withdrawn', credits: 3, grade: 'W' },
    ],
  }];
  const stats = calculateTermStats(terms[0]);
  assert.equal(stats.attemptedCredits, 11);
  assert.equal(stats.earnedCredits, 8);
  assert.equal(stats.plannedCredits, 3);
  assert.equal(stats.gpaCredits, 9);
  assert.equal(stats.qualityPoints, 3 * 4 + 3 * 3.33);

  const summary = calculateGpa(terms);
  assert.equal(summary.attemptedCredits, 11);
  assert.equal(summary.gpaCredits, 9);
  assert.equal(Number(summary.gpa.toFixed(2)), 2.44);
});

test('projects planned credits without changing the recorded GPA', () => {
  const terms = [{ courses: [
    { credits: 3, grade: 'B' },
    { credits: 3, grade: 'TBD' },
  ] }];
  const recorded = calculateGpa(terms);
  assert.equal(Number(recorded.gpa.toFixed(2)), 3);
  assert.equal(Number(projectGpa(terms, 'A').toFixed(2)), 3.5);
  assert.equal(Number(calculateGpa(terms).gpa.toFixed(2)), 3);
});
