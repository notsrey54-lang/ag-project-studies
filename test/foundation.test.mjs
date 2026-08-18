import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const appPath = new URL('../src/App.jsx', import.meta.url);
const landingPath = new URL('../src/components/LandingPage.jsx', import.meta.url);
const coursePath = new URL('../src/data/courses.js', import.meta.url);
const sidebarPath = new URL('../src/components/Sidebar.jsx', import.meta.url);

test('the study hub exposes AG Project and both subject choices', () => {
  assert.equal(existsSync(appPath), true, 'src/App.jsx should exist');

  const appSource = readFileSync(appPath, 'utf8');
  const landingSource = readFileSync(landingPath, 'utf8');
  const courseSource = readFileSync(coursePath, 'utf8');
  assert.match(appSource, /StudyWorkspace/);
  assert.match(landingSource, /AG Project/);
  assert.match(courseSource, /BUC111/);
  assert.match(courseSource, /ECO101/);
});

test('guest study profiles stay local while content management is separated', () => {
  const sidebarSource = readFileSync(sidebarPath, 'utf8');

  assert.match(sidebarSource, /Manage content/);
  assert.match(sidebarSource, /saved automatically on this device/);
  assert.doesNotMatch(sidebarSource, /Sync uses a secret GitHub Gist/);
});
