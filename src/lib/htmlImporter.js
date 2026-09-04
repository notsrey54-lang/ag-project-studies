import { createBlankContentBlock } from './contentLibrary.js';
import { editorElementToRichRuns, richRunsToText, safeContentUrl } from './richText.js';

const MAX_HTML_BYTES = 2_000_000;
const MAX_IMPORTED_BLOCKS = 300;
const CONTAINER_TAGS = new Set(['BODY', 'MAIN', 'ARTICLE', 'SECTION', 'DIV', 'HEADER', 'FOOTER', 'ASIDE']);
const STRUCTURAL_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'UL', 'OL', 'BLOCKQUOTE', 'TABLE', 'PRE', 'HR', 'IMG', 'FIGURE']);

const cleanText = (value) => String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

const baseBlock = (type, context) => ({
  ...createBlankContentBlock(type),
  chapterId: context.chapterId || '',
  section: context.section || 'course',
});

const createHeading = (element, context) => {
  const block = baseBlock('heading', context);
  block.content.text = cleanText(element.textContent);
  block.content.level = Math.min(6, Math.max(1, Number(element.tagName.slice(1)) || 2));
  return block;
};

const createParagraph = (element, context) => {
  const runs = editorElementToRichRuns(element);
  if (!richRunsToText(runs).trim()) return null;
  const block = baseBlock('rich_text', context);
  block.content.runs = runs;
  block.content.text = richRunsToText(runs);
  block.content.direction = element.getAttribute('dir') === 'rtl' ? 'rtl' : 'ltr';
  block.content.alignment = 'start';
  return block;
};

const createList = (element, context) => {
  const items = [...element.children]
    .filter((child) => child.tagName === 'LI')
    .map((child) => cleanText(child.textContent))
    .filter(Boolean);
  if (!items.length) return null;
  const block = baseBlock(element.tagName === 'OL' ? 'numbered_list' : 'bullet_list', context);
  block.content.items = items;
  return block;
};

const createTable = (element, context) => {
  const sourceRows = [...element.querySelectorAll('tr')]
    .map((row) => [...row.children].filter((cell) => ['TH', 'TD'].includes(cell.tagName)).map((cell) => cleanText(cell.textContent)))
    .filter((row) => row.length);
  if (!sourceRows.length) return null;
  const firstRow = element.querySelector('tr');
  const hasHeader = firstRow ? [...firstRow.children].some((cell) => cell.tagName === 'TH') : false;
  const width = Math.max(...sourceRows.map((row) => row.length));
  const columns = hasHeader ? sourceRows[0] : Array.from({ length: width }, (_, index) => `Column ${index + 1}`);
  const rows = (hasHeader ? sourceRows.slice(1) : sourceRows).map((row) => Array.from({ length: width }, (_, index) => row[index] || ''));
  const block = baseBlock('table', context);
  block.content.columns = columns;
  block.content.rows = rows;
  return block;
};

const createImage = (element, context, warnings) => {
  const url = safeContentUrl(element.getAttribute('src'));
  if (!url) {
    warnings.add('One or more embedded or relative images were skipped. Upload those images separately so they remain available to students.');
    return null;
  }
  const block = baseBlock('image', context);
  block.content.url = url;
  block.content.alt = cleanText(element.getAttribute('alt')) || 'Imported study image';
  return block;
};

const createLink = (element, context, warnings) => {
  const url = safeContentUrl(element.getAttribute('href'));
  if (!url) {
    warnings.add('A non-HTTPS link was skipped during import.');
    return null;
  }
  const block = baseBlock('link', context);
  block.content.url = url;
  block.content.label = cleanText(element.textContent) || url;
  return block;
};

export const importHtmlDocument = (html, context = {}) => {
  if (typeof DOMParser === 'undefined') throw new Error('HTML import is only available in the browser.');
  const source = String(html || '');
  if (!source.trim()) throw new Error('The HTML file is empty.');
  if (new TextEncoder().encode(source).length > MAX_HTML_BYTES) throw new Error('Choose an HTML file smaller than 2 MB.');

  const document = new DOMParser().parseFromString(source, 'text/html');
  const warnings = new Set();
  document.querySelectorAll('script, style, iframe, object, embed, form, input, button, meta, link, base, template, noscript').forEach((element) => element.remove());
  document.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith('on') || ['style', 'class', 'id'].includes(attribute.name.toLowerCase())) element.removeAttribute(attribute.name);
    });
  });

  const blocks = [];
  const add = (block) => {
    if (!block || blocks.length >= MAX_IMPORTED_BLOCKS) return;
    block.order = blocks.length;
    blocks.push(block);
  };

  const visit = (node) => {
    if (blocks.length >= MAX_IMPORTED_BLOCKS || node.nodeType !== 1) return;
    const element = node;
    const tag = element.tagName;
    if (/^H[1-6]$/.test(tag)) return add(createHeading(element, context));
    if (tag === 'P') return add(createParagraph(element, context));
    if (tag === 'UL' || tag === 'OL') return add(createList(element, context));
    if (tag === 'BLOCKQUOTE') {
      const block = baseBlock('quote', context);
      block.content.quote = cleanText(element.textContent);
      return add(block.content.quote ? block : null);
    }
    if (tag === 'TABLE') return add(createTable(element, context));
    if (tag === 'PRE') {
      const block = baseBlock('code', context);
      block.content.code = String(element.textContent || '').trim();
      block.content.language = element.querySelector('code')?.getAttribute('data-language') || 'text';
      return add(block.content.code ? block : null);
    }
    if (tag === 'HR') return add(baseBlock('divider', context));
    if (tag === 'IMG') return add(createImage(element, context, warnings));
    if (tag === 'FIGURE') {
      const image = element.querySelector('img');
      const block = image ? createImage(image, context, warnings) : null;
      if (block) block.content.source = cleanText(element.querySelector('figcaption')?.textContent);
      return add(block);
    }
    if (tag === 'A' && element.parentElement?.childNodes.length === 1) return add(createLink(element, context, warnings));
    if (CONTAINER_TAGS.has(tag)) {
      const structuralChildren = [...element.children].filter((child) => STRUCTURAL_TAGS.has(child.tagName) || CONTAINER_TAGS.has(child.tagName));
      if (structuralChildren.length) structuralChildren.forEach(visit);
      else add(createParagraph(element, context));
      return;
    }
    if (cleanText(element.textContent)) add(createParagraph(element, context));
  };

  [...document.body.children].forEach(visit);
  if (blocks.length >= MAX_IMPORTED_BLOCKS) warnings.add(`Only the first ${MAX_IMPORTED_BLOCKS} content blocks were imported.`);
  if (!blocks.length) throw new Error('No readable headings, paragraphs, lists, tables, images, or links were found in this HTML file.');

  return {
    title: cleanText(document.title) || cleanText(document.querySelector('h1')?.textContent) || 'Imported HTML document',
    blocks,
    warnings: [...warnings],
    removedThemeStyles: true,
  };
};
