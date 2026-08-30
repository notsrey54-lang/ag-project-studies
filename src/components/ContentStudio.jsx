import { useEffect, useRef, useState } from 'react';
import { CHAPTER_SECTIONS, createBlankContentBlock, createBlankTool } from '../lib/contentLibrary';

const BLOCK_TYPES = [
  ['paragraph', 'Paragraph'],
  ['heading', 'Heading'],
  ['bullet_list', 'Bullet points'],
  ['numbered_list', 'Numbered steps'],
  ['checklist', 'Checklist'],
  ['callout', 'Key callout'],
  ['quote', 'Quote'],
  ['table', 'Table'],
  ['formula', 'Formula'],
  ['comparison', 'Comparison'],
  ['timeline', 'Timeline'],
  ['link', 'Resource link'],
  ['image', 'Image'],
  ['video', 'Video link'],
  ['audio', 'Audio link'],
  ['code', 'Code block'],
  ['drawing', 'Drawing'],
  ['custom', 'Custom JSON block'],
];

const TOOL_TYPES = [
  ['calculator', 'Calculator'],
  ['formula_practice', 'Formula practice'],
  ['graph', 'Interactive graph'],
  ['matching', 'Matching activity'],
  ['timeline', 'Timeline activity'],
  ['custom', 'Custom tool configuration'],
];

const updateAt = (items, id, patch) => items.map((item) => item.id === id ? { ...item, ...patch } : item);
const clone = (value) => JSON.parse(JSON.stringify(value));
const lineList = (value) => String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const linesText = (value) => Array.isArray(value) ? value.join('\n') : '';

function StudioField({ label, value, onChange, placeholder = '', type = 'text', min, max, step, help }) {
  return <label className="studio-field"><span>{label}</span><input type={type} value={value ?? ''} min={min} max={max} step={step} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{help ? <small>{help}</small> : null}</label>;
}

function StudioText({ label, value, onChange, placeholder = '', rows = 5, dir, help }) {
  return <label className="studio-field studio-field--wide"><span>{label}</span><textarea value={value ?? ''} rows={rows} dir={dir} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{help ? <small>{help}</small> : null}</label>;
}

function LanguageFields({ value, onChange, label = 'Text' }) {
  const content = value || {};
  return <div className="studio-language-grid"><StudioText label={`${label} · English`} value={content.text} onChange={(text) => onChange({ ...content, text })} rows={5} /><StudioText label={`${label} · Arabic`} value={content.textAr} onChange={(textAr) => onChange({ ...content, textAr })} dir="rtl" rows={5} /></div>;
}

function JsonField({ label, value, onChange, help }) {
  const [draft, setDraft] = useState(() => JSON.stringify(value || {}, null, 2));
  useEffect(() => setDraft(JSON.stringify(value || {}, null, 2)), [value]);
  const change = (next) => {
    setDraft(next);
    try { onChange(JSON.parse(next)); } catch { /* keep the draft editable until valid JSON is entered */ }
  };
  return <label className="studio-field studio-field--wide"><span>{label}</span><textarea value={draft} rows={8} spellCheck="false" onChange={(event) => change(event.target.value)} />{help ? <small>{help}</small> : null}</label>;
}

function DrawingPad({ value, onChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#5b4a12');
  const [width, setWidth] = useState(4);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 960;
    canvas.height = 440;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fffdf5';
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (value) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.src = value;
    }
  }, []);

  const point = (event) => {
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * (canvas.width / bounds.width), y: (event.clientY - bounds.top) * (canvas.height / bounds.height) };
  };
  const start = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = canvasRef.current.getContext('2d');
    const { x, y } = point(event);
    context.beginPath();
    context.moveTo(x, y);
    drawingRef.current = true;
  };
  const move = (event) => {
    if (!drawingRef.current) return;
    const context = canvasRef.current.getContext('2d');
    const { x, y } = point(event);
    context.lineTo(x, y);
    context.strokeStyle = tool === 'eraser' ? '#fffdf5' : color;
    context.lineWidth = tool === 'eraser' ? Math.max(width * 3, 12) : width;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.stroke();
  };
  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(canvasRef.current.toDataURL('image/png'));
  };
  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fffdf5';
    context.fillRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return <div className="studio-drawing"><div className="studio-drawing__toolbar"><button type="button" className={tool === 'pen' ? 'studio-tool-button studio-tool-button--active' : 'studio-tool-button'} onClick={() => setTool('pen')}>Pen</button><button type="button" className={tool === 'eraser' ? 'studio-tool-button studio-tool-button--active' : 'studio-tool-button'} onClick={() => setTool('eraser')}>Eraser</button><label>Colour <input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label><label>Width <input type="range" min="1" max="18" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label><button type="button" className="studio-tool-button" onClick={clear}>Clear</button></div><canvas ref={canvasRef} className="studio-canvas" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={end} aria-label="Drawing editor" /></div>;
}

function BlockFields({ block, update }) {
  const content = block.content || {};
  const setContent = (patch) => update({ content: { ...content, ...patch } });
  if (['paragraph', 'heading', 'callout'].includes(block.type)) return <LanguageFields label={block.type === 'heading' ? 'Heading' : block.type === 'callout' ? 'Callout text' : 'Paragraph'} value={content} onChange={setContent} />;
  if (['bullet_list', 'numbered_list', 'checklist'].includes(block.type)) return <div className="studio-language-grid"><StudioText label="Items · English" value={linesText(content.items)} onChange={(value) => setContent({ items: lineList(value) })} placeholder="One item per line" rows={8} /><StudioText label="Items · Arabic" value={linesText(content.itemsAr)} onChange={(value) => setContent({ itemsAr: lineList(value) })} dir="rtl" placeholder="عنصر واحد في كل سطر" rows={8} /></div>;
  if (block.type === 'quote') return <div className="studio-language-grid"><StudioText label="Quote · English" value={content.quote} onChange={(quote) => setContent({ quote })} rows={5} /><StudioText label="Quote · Arabic" value={content.quoteAr} onChange={(quoteAr) => setContent({ quoteAr })} dir="rtl" rows={5} /></div>;
  if (block.type === 'table') {
    const columns = Array.isArray(content.columns) ? content.columns : [];
    const rows = Array.isArray(content.rows) ? content.rows : [];
    return <div className="studio-form-stack"><StudioText label="Column headings" value={columns.join(' | ')} onChange={(value) => setContent({ columns: value.split('|').map((item) => item.trim()).filter(Boolean) })} placeholder="Concept | Definition | Example" rows={2} /><StudioText label="Rows" value={rows.map((row) => row.join(' | ')).join('\n')} onChange={(value) => { const nextColumns = columns.length || 1; setContent({ rows: lineList(value).map((row) => row.split('|').map((cell) => cell.trim()).slice(0, nextColumns)) }); }} placeholder="Scarcity | Limited resources | Time and money" rows={8} help="Use the pipe character to separate cells. One row per line." /></div>;
  }
  if (block.type === 'formula') return <div className="studio-form-stack"><div className="studio-language-grid"><StudioField label="Formula · English" value={content.formula} onChange={(formula) => setContent({ formula })} placeholder="Fixed cost ÷ contribution margin" /><StudioField label="Formula · Arabic" value={content.formulaAr} onChange={(formulaAr) => setContent({ formulaAr })} placeholder="الصيغة" /></div><LanguageFields label="Explanation" value={{ text: content.text, textAr: content.textAr }} onChange={setContent} /></div>;
  if (block.type === 'comparison') return <div className="studio-form-grid"><StudioField label="Left title" value={content.leftTitle} onChange={(leftTitle) => setContent({ leftTitle })} placeholder="Demand movement" /><StudioField label="Right title" value={content.rightTitle} onChange={(rightTitle) => setContent({ rightTitle })} placeholder="Demand shift" /><StudioText label="Left points" value={linesText(content.leftItems)} onChange={(value) => setContent({ leftItems: lineList(value) })} rows={6} /><StudioText label="Right points" value={linesText(content.rightItems)} onChange={(value) => setContent({ rightItems: lineList(value) })} rows={6} /></div>;
  if (block.type === 'timeline') return <JsonField label="Timeline events JSON" value={{ events: content.events || [] }} onChange={(value) => setContent({ events: Array.isArray(value.events) ? value.events : [] })} help="Example: { &quot;events&quot;: [{ &quot;date&quot;: &quot;Week 1&quot;, &quot;title&quot;: &quot;Topic&quot;, &quot;text&quot;: &quot;Details&quot; }] }" />;
  if (['link', 'video', 'audio'].includes(block.type)) return <div className="studio-form-grid"><StudioField label="HTTPS URL" value={content.url} onChange={(url) => setContent({ url })} placeholder="https://example.com/resource" help="Only HTTPS links are published." /><StudioField label="Display label" value={content.label} onChange={(label) => setContent({ label })} placeholder="Open lecture recording" /></div>;
  if (block.type === 'image') return <div className="studio-form-grid"><StudioField label="Image HTTPS URL" value={content.url} onChange={(url) => setContent({ url })} placeholder="https://..." /><StudioField label="Alt text" value={content.alt} onChange={(alt) => setContent({ alt })} placeholder="Describe the image for accessibility" /><StudioField label="Source / credit" value={content.source} onChange={(source) => setContent({ source })} /></div>;
  if (block.type === 'drawing') return <DrawingPad value={content.imageData} onChange={(imageData) => setContent({ imageData })} />;
  if (block.type === 'code') return <div className="studio-form-stack"><StudioField label="Language" value={content.language} onChange={(language) => setContent({ language })} placeholder="javascript" /><StudioText label="Code" value={content.code} onChange={(code) => setContent({ code })} rows={12} /></div>;
  return <JsonField label="Custom block configuration" value={content.config || {}} onChange={(config) => setContent({ config })} help="Use safe declarative JSON. The public reader will never execute code from this field." />;
}

function BlockEditor({ block, chapters, update, duplicate, remove }) {
  return <article className="studio-editor-card"><div className="studio-editor-card__header"><div><span className="eyebrow">Content block</span><h3>{BLOCK_TYPES.find(([id]) => id === block.type)?.[1] || 'Block'}</h3></div><div className="studio-editor-card__actions"><button type="button" className="studio-tool-button" onClick={duplicate}>Duplicate</button><button type="button" className="studio-tool-button studio-tool-button--danger" onClick={remove}>Delete</button></div></div><div className="studio-form-grid"><label className="studio-field"><span>Block type</span><select value={block.type} onChange={(event) => update({ type: event.target.value })}>{BLOCK_TYPES.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label><StudioField label="Order" type="number" min="0" value={block.order} onChange={(value) => update({ order: Number(value) || 0 })} /><label className="studio-field"><span>Place under chapter</span><select value={block.chapterId || ''} onChange={(event) => update({ chapterId: event.target.value })}><option value="">Subject-wide</option>{chapters.map((chapter) => <option value={chapter.id} key={chapter.id}>{chapter.title}</option>)}</select></label><label className="studio-field"><span>Assessment section</span><select value={block.section || 'course'} onChange={(event) => update({ section: event.target.value })}>{CHAPTER_SECTIONS.map((section) => <option value={section.id} key={section.id}>{section.label}</option>)}</select></label><StudioField label="Block title · English" value={block.title} onChange={(title) => update({ title })} placeholder="Optional title" /><StudioField label="Block title · Arabic" value={block.titleAr} onChange={(titleAr) => update({ titleAr })} placeholder="عنوان اختياري" /></div><div className="studio-block-fields"><BlockFields block={block} update={update} /></div></article>;
}

function ToolEditor({ tool, chapters, update, remove }) {
  return <article className="studio-tool-card"><div className="studio-editor-card__header"><div><span className="eyebrow">Subject tool</span><h3>{tool.name || 'Untitled tool'}</h3></div><button type="button" className="studio-tool-button studio-tool-button--danger" onClick={remove}>Delete</button></div><div className="studio-form-grid"><StudioField label="Tool name · English" value={tool.name} onChange={(name) => update({ name })} placeholder="Supply and demand lab" /><StudioField label="Tool name · Arabic" value={tool.nameAr} onChange={(nameAr) => update({ nameAr })} placeholder="اسم الأداة" /><label className="studio-field"><span>Tool type</span><select value={tool.type} onChange={(event) => update({ type: event.target.value })}>{TOOL_TYPES.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label><label className="studio-field"><span>Chapter</span><select value={tool.chapterId || ''} onChange={(event) => update({ chapterId: event.target.value })}><option value="">Subject-wide</option>{chapters.map((chapter) => <option value={chapter.id} key={chapter.id}>{chapter.title}</option>)}</select></label><StudioText label="Description · English" value={tool.description} onChange={(description) => update({ description })} rows={3} /><StudioText label="Description · Arabic" value={tool.descriptionAr} onChange={(descriptionAr) => update({ descriptionAr })} dir="rtl" rows={3} /><JsonField label="Tool configuration JSON" value={tool.config} onChange={(config) => update({ config })} help="Use declarative configuration only. This is not an executable-code editor." /></div></article>;
}

export function ContentStudio({ subject, updateSubject }) {
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [showTypeEditor, setShowTypeEditor] = useState(false);
  const blocks = subject?.contentBlocks || [];
  const tools = subject?.tools || [];
  const chapters = subject?.modules || [];

  useEffect(() => {
    if (!blocks.some((block) => block.id === selectedBlockId)) setSelectedBlockId(blocks[0]?.id || null);
  }, [subject?.id, blocks.length, selectedBlockId]);

  if (!subject) return <div className="admin-tab"><div className="admin-empty"><span className="admin-empty__icon">✦</span><strong>Select a subject first</strong><p>Every block and tool in this studio belongs to one subject, so content never leaks across courses.</p></div></div>;

  const addBlock = (type) => {
    const block = createBlankContentBlock(type);
    block.order = blocks.length;
    block.chapterId = chapters[0]?.id || '';
    updateSubject({ contentBlocks: [...blocks, block] });
    setSelectedBlockId(block.id);
    setShowBlockMenu(false);
  };
  const updateBlock = (id, patch) => updateSubject({ contentBlocks: updateAt(blocks, id, patch) });
  const duplicateBlock = (block) => {
    const copy = clone(block);
    copy.id = `${block.id}-copy-${Date.now()}`;
    copy.order = blocks.length;
    updateSubject({ contentBlocks: [...blocks, copy] });
    setSelectedBlockId(copy.id);
  };
  const removeBlock = (id) => {
    const next = blocks.filter((block) => block.id !== id).map((block, index) => ({ ...block, order: index }));
    updateSubject({ contentBlocks: next });
  };
  const moveBlock = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    updateSubject({ contentBlocks: next.map((block, itemIndex) => ({ ...block, order: itemIndex })) });
  };
  const addTool = () => updateSubject({ tools: [...tools, { ...createBlankTool(), chapterId: chapters[0]?.id || '', order: tools.length }] });
  const addCustomType = () => updateSubject({ customTypes: [...(subject.customTypes || []), { id: `custom-type-${Date.now()}`, name: 'New custom type', nameAr: '', schema: { fields: [] } }] });

  return <div className="admin-tab content-studio">
    <div className="admin-tab-heading"><div><span className="eyebrow">Advanced subject CMS</span><h2>Content Studio</h2><p>Build this subject as a professional course document. Every block, question, tool, and custom type stays scoped to <strong>{subject.code}</strong>.</p></div><div className="studio-header-actions"><button type="button" className="secondary-button" onClick={() => setShowTypeEditor((current) => !current)}>Custom types</button><div className="studio-add-wrap"><button type="button" className="primary-button" onClick={() => setShowBlockMenu((current) => !current)}>+ Add content block</button>{showBlockMenu ? <div className="studio-add-menu">{BLOCK_TYPES.map(([id, label]) => <button type="button" key={id} onClick={() => addBlock(id)}>{label}</button>)}</div> : null}</div></div></div>
    <div className="studio-capabilities"><span>English + Arabic</span><span>Tables + formulas</span><span>Drawings</span><span>Safe media links</span><span>Chapter / Midterm / Final</span><span>Declarative tools</span></div>
    <div className="studio-layout">
      <aside className="studio-block-rail"><div className="studio-block-rail__heading"><div><span className="eyebrow">Blocks</span><strong>{blocks.length} blocks</strong></div><button type="button" className="round-button" onClick={() => addBlock('paragraph')} aria-label="Add paragraph">＋</button></div>{blocks.map((block, index) => <button type="button" className={block.id === selectedBlockId ? 'studio-block-item studio-block-item--active' : 'studio-block-item'} key={block.id} onClick={() => setSelectedBlockId(block.id)}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{block.title || BLOCK_TYPES.find(([id]) => id === block.type)?.[1]}</strong><small>{chapters.find((chapter) => chapter.id === block.chapterId)?.title || 'Subject-wide'}</small></div></button>)}{!blocks.length ? <p className="studio-rail-empty">Add a block to begin this subject’s notes.</p> : null}</aside>
      <div className="studio-stage">{selectedBlockId ? (() => { const block = blocks.find((item) => item.id === selectedBlockId); const index = blocks.findIndex((item) => item.id === selectedBlockId); return block ? <><div className="studio-reorder"><span>Selected block {index + 1} of {blocks.length}</span><div><button type="button" className="studio-tool-button" onClick={() => moveBlock(index, -1)} disabled={index === 0}>Move up</button><button type="button" className="studio-tool-button" onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1}>Move down</button></div></div><BlockEditor block={block} chapters={chapters} update={(patch) => updateBlock(block.id, patch)} duplicate={() => duplicateBlock(block)} remove={() => removeBlock(block.id)} /></> : null; })() : <div className="studio-stage-empty"><span>✦</span><strong>Your subject document starts here.</strong><p>Add paragraphs, tables, formulas, diagrams, drawings, links, or any other block from the menu.</p><button type="button" className="primary-button" onClick={() => addBlock('paragraph')}>Add first paragraph</button></div>}</div>
    </div>
    <section className="studio-tools-section"><div className="admin-tab-heading"><div><span className="eyebrow">Reusable subject tools</span><h3>Interactive tools for {subject.code}</h3><p>Add a calculator, graph, formula practice, matching activity, timeline, or a safe custom configuration. The site can render new tool types once their reader is implemented.</p></div><button type="button" className="secondary-button" onClick={addTool}>+ Add subject tool</button></div>{tools.map((tool) => <ToolEditor key={tool.id} tool={tool} chapters={chapters} update={(patch) => updateSubject({ tools: updateAt(tools, tool.id, patch) })} remove={() => updateSubject({ tools: tools.filter((item) => item.id !== tool.id) })} />)}{!tools.length ? <div className="studio-inline-empty">No custom tools yet. Add one when this subject needs an interactive calculator, graph, or activity.</div> : null}</section>
    {showTypeEditor ? <section className="studio-tools-section"><div className="admin-tab-heading"><div><span className="eyebrow">Extensible schema</span><h3>Custom content types</h3><p>Define the fields you want for this subject, then keep the structure in JSON for reliable import/export.</p></div><button type="button" className="secondary-button" onClick={addCustomType}>+ Add custom type</button></div>{(subject.customTypes || []).map((type) => <article className="studio-tool-card" key={type.id}><div className="studio-form-grid"><StudioField label="Type name · English" value={type.name} onChange={(name) => updateSubject({ customTypes: updateAt(subject.customTypes || [], type.id, { name }) })} /><StudioField label="Type name · Arabic" value={type.nameAr} onChange={(nameAr) => updateSubject({ customTypes: updateAt(subject.customTypes || [], type.id, { nameAr }) })} /><JsonField label="Field schema" value={type.schema} onChange={(schema) => updateSubject({ customTypes: updateAt(subject.customTypes || [], type.id, { schema }) })} /></div><button type="button" className="studio-tool-button studio-tool-button--danger" onClick={() => updateSubject({ customTypes: (subject.customTypes || []).filter((item) => item.id !== type.id) })}>Delete type</button></article>)}</section> : null}
  </div>;
}
