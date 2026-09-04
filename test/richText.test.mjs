import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRichRuns,
  richRunsToEditorHtml,
  richRunsToText,
  safeContentUrl,
  textToRichRuns,
} from '../src/lib/richText.js';

test('accepts HTTPS and approved data images only', () => {
  assert.equal(safeContentUrl('https://example.com/file.pdf'), 'https://example.com/file.pdf');
  assert.equal(safeContentUrl('javascript:alert(1)'), '');
  assert.equal(safeContentUrl('data:text/html;base64,PHNjcmlwdD4='), '');
  assert.equal(safeContentUrl('data:image/png;base64,AAAA', { allowDataImage: true }), 'data:image/png;base64,AAAA');
});

test('merges matching rich runs and removes unsafe links', () => {
  const runs = normalizeRichRuns([
    { text: 'AG ', bold: true },
    { text: 'Project', bold: true },
    { text: ' unsafe', link: 'javascript:alert(1)' },
  ]);
  assert.equal(runs.length, 2);
  assert.equal(runs[0].text, 'AG Project');
  assert.equal(runs[1].link, '');
  assert.equal(richRunsToText(runs), 'AG Project unsafe');
});

test('serializes editor HTML with escaped text and supported formatting', () => {
  const html = richRunsToEditorHtml([{ text: '<study>', bold: true, superscript: true, link: 'https://example.com/?a=1&b=2' }]);
  assert.match(html, /&lt;study&gt;/);
  assert.match(html, /<strong>/);
  assert.match(html, /<sup>/);
  assert.doesNotMatch(html, /<study>/);
  assert.equal(textToRichRuns('Notes')[0].text, 'Notes');
});
