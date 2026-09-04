const HTTPS_URL = /^https:\/\//i;
const DATA_IMAGE_URL = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i;

const escapeHtml = (value) => String(value || '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

export const safeContentUrl = (value, { allowDataImage = false } = {}) => {
  if (typeof value !== 'string') return '';
  const candidate = value.trim();
  if (HTTPS_URL.test(candidate)) return candidate;
  if (allowDataImage && DATA_IMAGE_URL.test(candidate)) return candidate;
  return '';
};

const sameMarks = (left, right) => left.bold === right.bold
  && left.italic === right.italic
  && left.underline === right.underline
  && left.strike === right.strike
  && left.subscript === right.subscript
  && left.superscript === right.superscript
  && left.link === right.link;

export const normalizeRichRuns = (value) => {
  if (!Array.isArray(value)) return [];
  return value.reduce((runs, candidate) => {
    const text = typeof candidate?.text === 'string' ? candidate.text : '';
    if (!text) return runs;
    const run = {
      text,
      bold: Boolean(candidate?.bold),
      italic: Boolean(candidate?.italic),
      underline: Boolean(candidate?.underline),
      strike: Boolean(candidate?.strike),
      subscript: Boolean(candidate?.subscript),
      superscript: Boolean(candidate?.superscript),
      link: safeContentUrl(candidate?.link),
    };
    const previous = runs[runs.length - 1];
    if (previous && sameMarks(previous, run)) previous.text += run.text;
    else runs.push(run);
    return runs;
  }, []);
};

export const textToRichRuns = (value) => {
  const text = typeof value === 'string' ? value : '';
  return text ? [{ text, bold: false, italic: false, underline: false, strike: false, subscript: false, superscript: false, link: '' }] : [];
};

export const richRunsToText = (runs) => normalizeRichRuns(runs).map((run) => run.text).join('');

export const richRunsToEditorHtml = (runs) => normalizeRichRuns(runs).map((run) => {
  let value = escapeHtml(run.text).replaceAll('\n', '<br>');
  if (run.bold) value = `<strong>${value}</strong>`;
  if (run.italic) value = `<em>${value}</em>`;
  if (run.underline) value = `<u>${value}</u>`;
  if (run.strike) value = `<s>${value}</s>`;
  if (run.subscript) value = `<sub>${value}</sub>`;
  if (run.superscript) value = `<sup>${value}</sup>`;
  if (run.link) value = `<a href="${escapeHtml(run.link)}">${value}</a>`;
  return value;
}).join('');

export const editorElementToRichRuns = (root) => {
  if (!root) return [];
  const output = [];
  const push = (text, marks) => {
    if (!text) return;
    const run = { text, ...marks, link: safeContentUrl(marks.link) };
    const previous = output[output.length - 1];
    if (previous && sameMarks(previous, run)) previous.text += text;
    else output.push(run);
  };
  const walk = (node, marks) => {
    if (node.nodeType === 3) {
      push(node.nodeValue || '', marks);
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName?.toUpperCase();
    if (tag === 'BR') {
      push('\n', marks);
      return;
    }
    const next = {
      ...marks,
      bold: marks.bold || tag === 'STRONG' || tag === 'B',
      italic: marks.italic || tag === 'EM' || tag === 'I',
      underline: marks.underline || tag === 'U',
      strike: marks.strike || tag === 'S' || tag === 'STRIKE' || tag === 'DEL',
      subscript: marks.subscript || tag === 'SUB',
      superscript: marks.superscript || tag === 'SUP',
      link: tag === 'A' ? safeContentUrl(node.getAttribute('href')) : marks.link,
    };
    const isBlock = ['DIV', 'P', 'LI'].includes(tag);
    if (isBlock && output.length && !output[output.length - 1].text.endsWith('\n')) push('\n', marks);
    [...node.childNodes].forEach((child) => walk(child, next));
    if (isBlock && output.length && !output[output.length - 1].text.endsWith('\n')) push('\n', marks);
  };
  const emptyMarks = { bold: false, italic: false, underline: false, strike: false, subscript: false, superscript: false, link: '' };
  [...root.childNodes].forEach((node) => walk(node, emptyMarks));
  const normalized = normalizeRichRuns(output);
  if (normalized.length) normalized[normalized.length - 1].text = normalized[normalized.length - 1].text.replace(/\n+$/, '');
  return normalized.filter((run) => run.text);
};
