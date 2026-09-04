import { useEffect, useMemo, useState } from 'react';
import {
  CHAPTER_SECTIONS,
  createBlankContentBlock,
  createBlankTool,
} from '../lib/contentLibrary.js';
import { AssetUploader } from './studio/AssetUploader.jsx';
import { HtmlImportPanel } from './studio/HtmlImportPanel.jsx';
import { LivePreview } from './studio/LivePreview.jsx';
import { PresentationEditor } from './studio/PresentationEditor.jsx';
import { RichTextEditor } from './studio/RichTextEditor.jsx';
import {
  DrawingPad,
  JsonField,
  LanguageFields,
  lineList,
  linesText,
  StudioField,
  StudioText,
} from './studio/StudioFields.jsx';

const BLOCK_TYPES = [
  ['rich_text', 'Rich text', '¶'],
  ['heading', 'Heading', 'H'],
  ['paragraph', 'Plain paragraph', 'T'],
  ['bullet_list', 'Bullet points', '•'],
  ['numbered_list', 'Numbered steps', '1'],
  ['checklist', 'Checklist', '✓'],
  ['callout', 'Key callout', '!'],
  ['quote', 'Quote', '“'],
  ['table', 'Table', '▦'],
  ['formula', 'Formula', 'Σ'],
  ['comparison', 'Comparison', '⇄'],
  ['timeline', 'Timeline', '↦'],
  ['link', 'Resource link', '↗'],
  ['image', 'Image', '▧'],
  ['video', 'Video link', '▶'],
  ['audio', 'Audio link', '♪'],
  ['code', 'Code block', '</>'],
  ['drawing', 'Drawing', '✎'],
  ['divider', 'Divider', '—'],
  ['custom', 'Custom data', '{}'],
];

const TOOL_TYPES = [
  ['calculator', 'Calculator'],
  ['formula_practice', 'Formula practice'],
  ['graph', 'Interactive graph'],
  ['matching', 'Matching activity'],
  ['timeline', 'Timeline activity'],
  ['custom', 'Custom tool configuration'],
];

const MODES = [
  { id: 'document', label: 'Document', icon: 'W', description: 'Word-style pages' },
  { id: 'slides', label: 'Slides', icon: 'P', description: 'Presentation builder' },
  { id: 'html', label: 'HTML import', icon: '</>', description: 'Theme converter' },
  { id: 'assets', label: 'Files', icon: '＋', description: 'Media and documents' },
  { id: 'tools', label: 'Tools', icon: '⌘', description: 'Interactive content' },
];

const updateAt = (items, id, patch) => items.map((item) => item.id === id ? { ...item, ...patch } : item);
const clone = (value) => JSON.parse(JSON.stringify(value));
const labelForBlock = (block) => block.type === 'presentation' ? 'Presentation' : BLOCK_TYPES.find(([id]) => id === block.type)?.[1] || 'Content block';
const iconForBlock = (block) => block.type === 'presentation' ? 'P' : BLOCK_TYPES.find(([id]) => id === block.type)?.[2] || '•';

function BlockFields({ block, update, onNotice }) {
  const content = block.content || {};
  const setContent = (patch) => update({ content: { ...content, ...patch } });

  if (block.type === 'rich_text') return <RichTextEditor block={block} update={update} onNotice={onNotice} />;
  if (block.type === 'presentation') return <PresentationEditor block={block} update={update} />;
  if (block.type === 'divider') return <div className="studio-divider-editor"><span /><strong>Section divider</strong><span /></div>;
  if (['paragraph', 'callout'].includes(block.type)) return <LanguageFields label={block.type === 'callout' ? 'Callout text' : 'Paragraph'} value={content} onChange={setContent} />;
  if (block.type === 'heading') return <div className="studio-form-stack"><label className="studio-field"><span>Heading level</span><select value={content.level || 2} onChange={(event) => setContent({ level: Number(event.target.value) })}><option value="2">Heading 2</option><option value="3">Heading 3</option><option value="4">Heading 4</option></select></label><LanguageFields label="Heading" value={content} onChange={setContent} rows={3} /></div>;
  if (['bullet_list', 'numbered_list', 'checklist'].includes(block.type)) return <div className="studio-language-grid"><StudioText label="Items · English" value={linesText(content.items)} onChange={(value) => setContent({ items: lineList(value) })} placeholder="One item per line" rows={8} /><StudioText label="Items · Arabic" value={linesText(content.itemsAr)} onChange={(value) => setContent({ itemsAr: lineList(value) })} dir="rtl" placeholder="عنصر واحد في كل سطر" rows={8} /></div>;
  if (block.type === 'quote') return <div className="studio-form-grid"><StudioText label="Quote · English" value={content.quote} onChange={(quote) => setContent({ quote })} rows={5} /><StudioText label="Quote · Arabic" value={content.quoteAr} onChange={(quoteAr) => setContent({ quoteAr })} dir="rtl" rows={5} /><StudioField label="Citation" value={content.citation} onChange={(citation) => setContent({ citation })} placeholder="Author or source" /></div>;
  if (block.type === 'table') {
    const columns = Array.isArray(content.columns) ? content.columns : [];
    const rows = Array.isArray(content.rows) ? content.rows : [];
    return <div className="studio-form-stack"><StudioText label="Column headings" value={columns.join(' | ')} onChange={(value) => setContent({ columns: value.split('|').map((item) => item.trim()).filter(Boolean) })} placeholder="Concept | Definition | Example" rows={2} /><StudioText label="Rows" value={rows.map((row) => row.join(' | ')).join('\n')} onChange={(value) => { const width = columns.length || 1; setContent({ rows: lineList(value).map((row) => row.split('|').map((cell) => cell.trim()).slice(0, width)) }); }} placeholder="Scarcity | Limited resources | Time and money" rows={9} help="Use | between cells and a new line for each row." /></div>;
  }
  if (block.type === 'formula') return <div className="studio-form-stack"><div className="studio-language-grid"><StudioField label="Formula · English" value={content.formula} onChange={(formula) => setContent({ formula })} placeholder="Fixed cost ÷ contribution margin" /><StudioField label="Formula · Arabic" value={content.formulaAr} onChange={(formulaAr) => setContent({ formulaAr })} placeholder="الصيغة" dir="rtl" /></div><LanguageFields label="Explanation" value={{ text: content.text, textAr: content.textAr }} onChange={setContent} /></div>;
  if (block.type === 'comparison') return <div className="studio-form-grid"><StudioField label="Left title" value={content.leftTitle} onChange={(leftTitle) => setContent({ leftTitle })} placeholder="Demand movement" /><StudioField label="Right title" value={content.rightTitle} onChange={(rightTitle) => setContent({ rightTitle })} placeholder="Demand shift" /><StudioText label="Left points" value={linesText(content.leftItems)} onChange={(value) => setContent({ leftItems: lineList(value) })} rows={7} /><StudioText label="Right points" value={linesText(content.rightItems)} onChange={(value) => setContent({ rightItems: lineList(value) })} rows={7} /></div>;
  if (block.type === 'timeline') return <JsonField label="Timeline events" value={{ events: content.events || [] }} onChange={(value) => setContent({ events: Array.isArray(value.events) ? value.events : [] })} help='Use: { "events": [{ "date": "Week 1", "title": "Topic", "text": "Details" }] }' />;
  if (['link', 'video', 'audio'].includes(block.type)) return <div className="studio-form-grid"><StudioField label="HTTPS URL" value={content.url} onChange={(url) => setContent({ url })} placeholder="https://example.com/resource" help="Only HTTPS links are published." /><StudioField label="Display label" value={content.label} onChange={(label) => setContent({ label })} placeholder="Open lecture recording" /></div>;
  if (block.type === 'image') return <div className="studio-form-grid"><StudioField label="Image HTTPS URL" value={content.url} onChange={(url) => setContent({ url })} placeholder="https://…" /><StudioField label="Alt text" value={content.alt} onChange={(alt) => setContent({ alt })} placeholder="Describe the image" /><StudioField label="Source / credit" value={content.source} onChange={(source) => setContent({ source })} /></div>;
  if (block.type === 'drawing') return <DrawingPad value={content.imageData} onChange={(imageData) => setContent({ imageData })} />;
  if (block.type === 'code') return <div className="studio-form-stack"><StudioField label="Language" value={content.language} onChange={(language) => setContent({ language })} placeholder="javascript" /><StudioText label="Code" value={content.code} onChange={(code) => setContent({ code })} rows={14} /></div>;
  return <JsonField label="Custom block data" value={content.config || {}} onChange={(config) => setContent({ config })} help="Safe declarative JSON only. Code is never executed in the student site." />;
}

function BlockEditor({
  block,
  chapters,
  siblings,
  update,
  duplicate,
  remove,
  moveUp,
  moveDown,
  first,
  last,
  onNotice,
  onSelect,
  onAdd,
  onOpenFiles,
  onOpenHtml,
  onTogglePreview,
  previewOpen,
}) {
  const changeType = (type) => update({ type, content: createBlankContentBlock(type).content });
  if (['rich_text', 'presentation'].includes(block.type)) {
    const isSlides = block.type === 'presentation';
    return <article className={`office-block-editor office-block-editor--${isSlides ? 'powerpoint' : 'word'}`}>
      <header className="office-titlebar">
        <span className={`office-titlebar__app office-titlebar__app--${isSlides ? 'powerpoint' : 'word'}`} aria-hidden="true">{isSlides ? 'P' : 'W'}</span>
        <div className="office-titlebar__name"><input value={block.title} onChange={(event) => update({ title: event.target.value })} placeholder={isSlides ? 'Untitled presentation' : 'Untitled document'} aria-label={isSlides ? 'Presentation name' : 'Document name'} /><small>{isSlides ? 'Presentation' : 'Document'} · saved inside this subject draft</small></div>
        <label className="office-titlebar__switcher"><span>{isSlides ? 'Deck' : 'Page'}</span><select value={block.id} onChange={(event) => onSelect(event.target.value)}>{siblings.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.title || labelForBlock(item)}</option>)}</select></label>
        <button type="button" className="office-titlebar__new" onClick={() => onAdd(isSlides ? 'presentation' : 'rich_text')}>＋ New {isSlides ? 'deck' : 'page'}</button>
        <div className="office-titlebar__actions"><button type="button" onClick={moveUp} disabled={first} title="Move earlier">↑</button><button type="button" onClick={moveDown} disabled={last} title="Move later">↓</button><button type="button" onClick={duplicate}>Duplicate</button><button type="button" className="is-danger" onClick={remove}>Delete</button></div>
      </header>
      {isSlides
        ? <PresentationEditor block={block} update={update} onNotice={onNotice} onOpenFiles={onOpenFiles} onTogglePreview={onTogglePreview} previewOpen={previewOpen} />
        : <RichTextEditor block={block} update={update} onNotice={onNotice} onInsertBlock={onAdd} onOpenFiles={onOpenFiles} onOpenHtml={onOpenHtml} onTogglePreview={onTogglePreview} previewOpen={previewOpen} />}
      <details className="office-placement"><summary>Course placement and bilingual metadata</summary><div className="studio-document-meta"><StudioField label="Title · Arabic" value={block.titleAr} onChange={(titleAr) => update({ titleAr })} placeholder="عنوان اختياري" dir="rtl" /><label className="studio-field"><span>Chapter</span><select value={block.chapterId || ''} onChange={(event) => update({ chapterId: event.target.value })}><option value="">Subject-wide</option>{chapters.map((chapter) => <option value={chapter.id} key={chapter.id}>{chapter.title}</option>)}</select></label><label className="studio-field"><span>Assessment</span><select value={block.section || 'course'} onChange={(event) => update({ section: event.target.value })}>{CHAPTER_SECTIONS.map((section) => <option value={section.id} key={section.id}>{section.label}</option>)}</select></label></div></details>
    </article>;
  }
  return <article className={`studio-editor-card studio-editor-card--${block.type}`}>
    <div className="studio-editor-card__header"><div><span className="studio-kicker">{block.type === 'presentation' ? 'PowerPoint-style canvas' : block.type === 'rich_text' ? 'Word-style canvas' : 'Content block'}</span><h3>{block.title || labelForBlock(block)}</h3></div><div className="studio-editor-card__actions"><button type="button" className="studio-tool-button" onClick={moveUp} disabled={first}>↑ Move</button><button type="button" className="studio-tool-button" onClick={moveDown} disabled={last}>↓ Move</button><button type="button" className="studio-tool-button" onClick={duplicate}>Duplicate</button><button type="button" className="studio-tool-button studio-tool-button--danger" onClick={remove}>Delete</button></div></div>
    <div className="studio-document-meta">
      {block.type !== 'presentation' ? <label className="studio-field"><span>Block type</span><select value={block.type} onChange={(event) => changeType(event.target.value)}>{BLOCK_TYPES.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label> : null}
      <StudioField label="Title · English" value={block.title} onChange={(title) => update({ title })} placeholder="Optional title" />
      <StudioField label="Title · Arabic" value={block.titleAr} onChange={(titleAr) => update({ titleAr })} placeholder="عنوان اختياري" dir="rtl" />
      <label className="studio-field"><span>Chapter</span><select value={block.chapterId || ''} onChange={(event) => update({ chapterId: event.target.value })}><option value="">Subject-wide</option>{chapters.map((chapter) => <option value={chapter.id} key={chapter.id}>{chapter.title}</option>)}</select></label>
      <label className="studio-field"><span>Assessment</span><select value={block.section || 'course'} onChange={(event) => update({ section: event.target.value })}>{CHAPTER_SECTIONS.map((section) => <option value={section.id} key={section.id}>{section.label}</option>)}</select></label>
    </div>
    <div className="studio-block-fields"><BlockFields block={block} update={update} onNotice={onNotice} /></div>
  </article>;
}

function StudioOutline({ mode, blocks, selectedId, onSelect, onAdd, onMode }) {
  const title = mode === 'slides' ? 'Slide decks' : mode === 'document' ? 'Document outline' : 'Workspace';
  return <aside className="studio-outline">
    <div className="studio-outline__heading"><div><span className="studio-kicker">{mode === 'slides' ? 'Presentations' : 'Pages'}</span><strong>{title}</strong></div>{['document', 'slides'].includes(mode) ? <button type="button" onClick={() => onAdd(mode === 'slides' ? 'presentation' : 'rich_text')} aria-label={mode === 'slides' ? 'Add presentation' : 'Add rich text'}>＋</button> : null}</div>
    {['document', 'slides'].includes(mode) ? <div className="studio-outline__list">{blocks.map((block, index) => <button type="button" key={block.id} className={selectedId === block.id ? 'studio-outline-item is-active' : 'studio-outline-item'} onClick={() => onSelect(block.id)}><span>{iconForBlock(block)}</span><div><strong>{block.title || labelForBlock(block)}</strong><small>{String(index + 1).padStart(2, '0')} · {labelForBlock(block)}</small></div></button>)}{!blocks.length ? <div className="studio-outline__empty"><strong>No {mode === 'slides' ? 'decks' : 'blocks'} yet</strong><button type="button" onClick={() => onAdd(mode === 'slides' ? 'presentation' : 'rich_text')}>Create one</button></div> : null}</div> : <div className="studio-outline__utilities">{MODES.filter((item) => !['document', 'slides'].includes(item.id)).map((item) => <button type="button" key={item.id} className={mode === item.id ? 'is-active' : ''} onClick={() => onMode(item.id)}><span>{item.icon}</span><div><strong>{item.label}</strong><small>{item.description}</small></div></button>)}</div>}
    <div className="studio-outline__footer"><span>{blocks.length} items</span><span>Auto theme</span></div>
  </aside>;
}

function InsertMenu({ onAdd, onClose }) {
  return <div className="studio-insert-menu"><div><strong>Insert content</strong><button type="button" onClick={onClose} aria-label="Close insert menu">×</button></div><div>{BLOCK_TYPES.map(([id, label, icon]) => <button type="button" key={id} onClick={() => { onAdd(id); onClose(); }}><span>{icon}</span>{label}</button>)}</div></div>;
}

function ToolEditor({ tool, chapters, update, remove }) {
  return <article className="studio-tool-card"><div className="studio-editor-card__header"><div><span className="studio-kicker">Subject tool</span><h3>{tool.name || 'Untitled tool'}</h3></div><button type="button" className="studio-tool-button studio-tool-button--danger" onClick={remove}>Delete</button></div><div className="studio-form-grid"><StudioField label="Tool name · English" value={tool.name} onChange={(name) => update({ name })} /><StudioField label="Tool name · Arabic" value={tool.nameAr} onChange={(nameAr) => update({ nameAr })} dir="rtl" /><label className="studio-field"><span>Tool type</span><select value={tool.type} onChange={(event) => update({ type: event.target.value })}>{TOOL_TYPES.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label><label className="studio-field"><span>Chapter</span><select value={tool.chapterId || ''} onChange={(event) => update({ chapterId: event.target.value })}><option value="">Subject-wide</option>{chapters.map((chapter) => <option value={chapter.id} key={chapter.id}>{chapter.title}</option>)}</select></label><StudioText label="Description · English" value={tool.description} onChange={(description) => update({ description })} rows={3} /><StudioText label="Description · Arabic" value={tool.descriptionAr} onChange={(descriptionAr) => update({ descriptionAr })} dir="rtl" rows={3} /><JsonField label="Tool configuration" value={tool.config} onChange={(config) => update({ config })} help="Declarative settings only; no executable code." /></div></article>;
}

function ToolsPanel({ subject, updateSubject }) {
  const tools = subject.tools || [];
  const customTypes = subject.customTypes || [];
  const addTool = () => updateSubject({ tools: [...tools, { ...createBlankTool(), chapterId: subject.modules[0]?.id || '', order: tools.length }] });
  const addCustomType = () => updateSubject({ customTypes: [...customTypes, { id: `custom-type-${Date.now()}`, name: 'New custom type', nameAr: '', schema: { fields: [] } }] });
  return <div className="studio-tools-panel"><div className="studio-section-heading"><div><span className="studio-kicker">Reusable interactions</span><h3>Subject tools</h3><p>Configure calculators, formula practice, graphs, matching activities, timelines, and your own structured tool types.</p></div><button type="button" className="primary-button" onClick={addTool}>+ Add tool</button></div>{tools.map((tool) => <ToolEditor key={tool.id} tool={tool} chapters={subject.modules} update={(patch) => updateSubject({ tools: updateAt(tools, tool.id, patch) })} remove={() => updateSubject({ tools: tools.filter((item) => item.id !== tool.id) })} />)}{!tools.length ? <div className="studio-stage-empty"><strong>No interactive tools yet.</strong><button type="button" className="secondary-button" onClick={addTool}>Create first tool</button></div> : null}<section className="studio-custom-types"><div className="studio-section-heading"><div><span className="studio-kicker">Extensible structure</span><h3>Custom content types</h3><p>Define reusable data fields without writing code.</p></div><button type="button" className="secondary-button" onClick={addCustomType}>+ Add type</button></div>{customTypes.map((type) => <article className="studio-tool-card" key={type.id}><div className="studio-form-grid"><StudioField label="Type name · English" value={type.name} onChange={(name) => updateSubject({ customTypes: updateAt(customTypes, type.id, { name }) })} /><StudioField label="Type name · Arabic" value={type.nameAr} onChange={(nameAr) => updateSubject({ customTypes: updateAt(customTypes, type.id, { nameAr }) })} dir="rtl" /><JsonField label="Field schema" value={type.schema} onChange={(schema) => updateSubject({ customTypes: updateAt(customTypes, type.id, { schema }) })} /></div><button type="button" className="studio-tool-button studio-tool-button--danger" onClick={() => updateSubject({ customTypes: customTypes.filter((item) => item.id !== type.id) })}>Delete type</button></article>)}</section></div>;
}

export function ContentStudio({ subject, updateSubject, password, onMessage, onError }) {
  const [mode, setMode] = useState('document');
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [insertOpen, setInsertOpen] = useState(false);
  const [localNotice, setLocalNotice] = useState('');
  const [previewOpen, setPreviewOpen] = useState(true);
  const blocks = subject?.contentBlocks || [];
  const visibleBlocks = useMemo(() => blocks.filter((block) => mode === 'slides' ? block.type === 'presentation' : mode === 'document' ? block.type !== 'presentation' : true), [blocks, mode]);

  useEffect(() => {
    if (!visibleBlocks.some((block) => block.id === selectedBlockId)) setSelectedBlockId(visibleBlocks[0]?.id || null);
  }, [subject?.id, mode, selectedBlockId, visibleBlocks]);

  if (!subject) return <div className="admin-tab"><div className="admin-empty"><span className="admin-empty__icon">✦</span><strong>Select a subject first</strong><p>Every document, presentation, imported page, file, and tool stays inside its selected subject.</p></div></div>;

  const notify = (message) => {
    setLocalNotice(message);
    onMessage?.(message);
    window.setTimeout(() => setLocalNotice(''), 4500);
  };
  const fail = (message) => {
    setLocalNotice('');
    onError?.(message);
  };
  const addBlock = (type, preparedBlock = null) => {
    const block = preparedBlock || createBlankContentBlock(type);
    block.order = blocks.length;
    block.chapterId = block.chapterId || subject.modules[0]?.id || '';
    block.section = block.section || subject.modules[0]?.section || 'course';
    updateSubject({ contentBlocks: [...blocks, block] });
    setSelectedBlockId(block.id);
    setMode(block.type === 'presentation' ? 'slides' : 'document');
    notify(`${labelForBlock(block)} added to ${subject.code}.`);
  };
  const updateBlock = (id, patch) => updateSubject({ contentBlocks: updateAt(blocks, id, patch) });
  const duplicateBlock = (block) => {
    const copy = clone(block);
    copy.id = `${block.id}-copy-${Date.now()}`;
    copy.title = `${block.title || labelForBlock(block)} copy`;
    copy.order = blocks.length;
    if (copy.type === 'presentation') copy.content.slides = copy.content.slides.map((slide, index) => ({ ...slide, id: `${copy.id}-slide-${index + 1}` }));
    updateSubject({ contentBlocks: [...blocks, copy] });
    setSelectedBlockId(copy.id);
    notify('A separate editable copy was created.');
  };
  const removeBlock = (id) => {
    const next = blocks.filter((block) => block.id !== id).map((block, index) => ({ ...block, order: index }));
    updateSubject({ contentBlocks: next });
    notify('Content block removed from the draft.');
  };
  const moveBlock = (block, direction) => {
    const sourceIndex = blocks.findIndex((item) => item.id === block.id);
    const visibleIndex = visibleBlocks.findIndex((item) => item.id === block.id);
    const target = visibleBlocks[visibleIndex + direction];
    if (sourceIndex < 0 || !target) return;
    const targetIndex = blocks.findIndex((item) => item.id === target.id);
    const next = [...blocks];
    [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
    updateSubject({ contentBlocks: next.map((item, index) => ({ ...item, order: index })) });
  };
  const importHtml = (result) => {
    const imported = result.blocks.map((block, index) => ({ ...block, order: blocks.length + index }));
    updateSubject({ contentBlocks: [...blocks, ...imported] });
    setSelectedBlockId(imported[0]?.id || null);
    setMode('document');
    notify(`${result.title} was converted into ${imported.length} AG Project blocks.`);
  };
  const selected = blocks.find((block) => block.id === selectedBlockId) || null;
  const selectedVisibleIndex = visibleBlocks.findIndex((block) => block.id === selectedBlockId);

  return <div className="admin-tab content-studio content-studio--advanced">
    <header className="studio-topbar"><div><span className="studio-kicker">AG Project · Advanced CMS</span><h2>{subject.code} Content Studio</h2><p>{subject.name}</p></div><div className="studio-topbar__status"><span className="studio-live-dot" /><strong>Live preview connected</strong><small>{blocks.length} blocks · {subject.resources.length} files</small></div></header>
    <nav className="studio-modebar" aria-label="Content Studio modes">{MODES.map((item) => <button type="button" key={item.id} className={mode === item.id ? 'is-active' : ''} onClick={() => setMode(item.id)}><span>{item.icon}</span><div><strong>{item.label}</strong><small>{item.description}</small></div></button>)}<div className="studio-modebar__quick"><button type="button" onClick={() => addBlock('presentation')}>+ New deck</button><button type="button" onClick={() => setInsertOpen((current) => !current)}>+ Insert</button>{insertOpen ? <InsertMenu onAdd={addBlock} onClose={() => setInsertOpen(false)} /> : null}</div></nav>
    {localNotice ? <div className="studio-notice" aria-live="polite">✓ {localNotice}</div> : null}
    <div className={`studio-shell studio-shell--${mode}${previewOpen ? '' : ' studio-shell--preview-hidden'}`}>
      {!['document', 'slides'].includes(mode) ? <StudioOutline mode={mode} blocks={visibleBlocks} selectedId={selectedBlockId} onSelect={setSelectedBlockId} onAdd={addBlock} onMode={setMode} /> : null}
      <section className="studio-workarea">
        {['document', 'slides'].includes(mode) ? selected ? <BlockEditor key={selected.id} block={selected} chapters={subject.modules} siblings={visibleBlocks} update={(patch) => updateBlock(selected.id, patch)} duplicate={() => duplicateBlock(selected)} remove={() => removeBlock(selected.id)} moveUp={() => moveBlock(selected, -1)} moveDown={() => moveBlock(selected, 1)} first={selectedVisibleIndex === 0} last={selectedVisibleIndex === visibleBlocks.length - 1} onNotice={notify} onSelect={setSelectedBlockId} onAdd={addBlock} onOpenFiles={() => setMode('assets')} onOpenHtml={() => setMode('html')} onTogglePreview={() => setPreviewOpen((current) => !current)} previewOpen={previewOpen} /> : <div className="studio-stage-empty"><span>{mode === 'slides' ? 'P' : 'W'}</span><strong>{mode === 'slides' ? 'Build your first presentation.' : 'Start a clean course document.'}</strong><p>{mode === 'slides' ? 'Create and arrange themed slides with bilingual content and presenter notes.' : 'Add rich text, headings, tables, formulas, media, drawings, and reusable study blocks.'}</p><button type="button" className="primary-button" onClick={() => addBlock(mode === 'slides' ? 'presentation' : 'rich_text')}>{mode === 'slides' ? 'Create slide deck' : 'Create document block'}</button></div> : null}
        {mode === 'html' ? <HtmlImportPanel subject={subject} onImport={importHtml} onError={fail} /> : null}
        {mode === 'assets' ? <AssetUploader subject={subject} password={password} onAddBlock={(block) => addBlock(block.type, block)} updateSubject={updateSubject} onError={fail} onNotice={notify} /> : null}
        {mode === 'tools' ? <ToolsPanel subject={subject} updateSubject={updateSubject} /> : null}
      </section>
      {previewOpen ? <LivePreview subject={subject} selectedBlockId={selectedBlockId} /> : null}
    </div>
  </div>;
}
