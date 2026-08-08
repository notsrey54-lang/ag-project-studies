import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const legacyPath = new URL('../public/buc111-legacy.html', import.meta.url);
const readerPath = new URL('../src/components/MaterialReader.jsx', import.meta.url);
const coursesPath = new URL('../src/data/courses.js', import.meta.url);

test('BUC111 complete source material is bundled with the app', () => {
  assert.equal(existsSync(legacyPath), true);
  const material = readFileSync(legacyPath, 'utf8');
  const reader = readFileSync(readerPath, 'utf8');

  assert.match(material, /CHAPTER 7/);
  assert.match(material, /CHAPTER 8/);
  assert.match(material, /CHAPTER 9/);
  assert.match(material, /FINAL COMPARISON TABLE/);
  assert.match(reader, /buc111-legacy\.html/);
});

test('ECO101 is configured as an independent study workspace', () => {
  const courses = readFileSync(coursesPath, 'utf8');
  assert.match(courses, /Principles of Economics/);
  assert.match(courses, /Demand: movement versus shift/);
  assert.match(courses, /Market equilibrium/);
});
