import { useEffect, useRef, useState } from 'react';
import { createBlankSlide } from '../../lib/contentLibrary.js';
import { lineList, linesText } from './StudioFields.jsx';

const clone = (value) => JSON.parse(JSON.stringify(value));
const createShapeId = () => `shape-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`}`;
const POWERPOINT_TABS = ['File', 'Home', 'Insert', 'Draw', 'Design', 'Transitions', 'Animations', 'Slide Show', 'Record', 'Review', 'View', 'Help'];
const SLIDE_LAYOUTS = [
  ['title-content', 'Title and Content'],
  ['title-only', 'Title Only'],
  ['split', 'Two Content'],
  ['quote', 'Statement'],
];
const SHAPES = [
  ['rectangle', '▭'],
  ['circle', '○'],
  ['line', '╱'],
  ['arrow', '→'],
  ['star', '☆'],
];

function RibbonGroup({ label, wide = false, children }) {
  return <div className={`office-ribbon-group${wide ? ' office-ribbon-group--wide' : ''}`}><div className="office-ribbon-group__body">{children}</div><span className="office-ribbon-group__label">{label}</span></div>;
}

function RibbonButton({ label, icon, active = false, large = false, disabled = false, onClick, title }) {
  return <button type="button" className={`office-command${large ? ' office-command--large' : ''}${active ? ' is-active' : ''}`} onClick={onClick} disabled={disabled} title={title || label}><span aria-hidden="true">{icon}</span><small>{label}</small></button>;
}

function SlideShape({ shape, selected, onSelect, onMoveEnd }) {
  const dragRef = useRef(null);
  const style = {
    left: `${shape.x}%`,
    top: `${shape.y}%`,
    width: `${shape.width}%`,
    height: `${shape.height}%`,
    '--shape-fill': shape.fill || '#d2a216',
  };
  const pointerDown = (event) => {
    event.stopPropagation();
    onSelect();
    dragRef.current = { x: event.clientX, y: event.clientY, left: shape.x, top: shape.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event) => {
    if (!dragRef.current) return;
    const slide = event.currentTarget.closest('.slide-canvas')?.getBoundingClientRect();
    if (!slide) return;
    const x = Math.max(0, Math.min(100 - shape.width, dragRef.current.left + ((event.clientX - dragRef.current.x) / slide.width) * 100));
    const y = Math.max(0, Math.min(100 - shape.height, dragRef.current.top + ((event.clientY - dragRef.current.y) / slide.height) * 100));
    onMoveEnd({ x, y });
  };
  return <button type="button" className={`slide-shape slide-shape--${shape.type}${selected ? ' is-selected' : ''}`} style={style} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { dragRef.current = null; }} onClick={(event) => event.stopPropagation()} aria-label={`${shape.type} shape`}><span>{shape.text || (shape.type === 'arrow' ? '→' : shape.type === 'star' ? '★' : '')}</span></button>;
}

export function PresentationEditor({ block, update, onNotice, onOpenFiles, onTogglePreview, previewOpen = true }) {
  const slides = block.content?.slides || [];
  const [selectedId, setSelectedId] = useState(slides[0]?.id || null);
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [activeTab, setActiveTab] = useState('Home');
  const [zoom, setZoom] = useState(82);
  const [showGrid, setShowGrid] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [presentIndex, setPresentIndex] = useState(0);

  useEffect(() => {
    if (!slides.some((slide) => slide.id === selectedId)) setSelectedId(slides[0]?.id || null);
  }, [block.id, selectedId, slides]);

  const selectedIndex = Math.max(0, slides.findIndex((slide) => slide.id === selectedId));
  const selected = slides[selectedIndex] || null;
  const shapes = selected?.shapes || [];
  const setSlides = (next) => update({ content: { ...block.content, slides: next } });
  const updateSlide = (patch) => setSlides(slides.map((slide) => slide.id === selected.id ? { ...slide, ...patch } : slide));
  const addSlide = () => {
    const slide = createBlankSlide();
    slide.title = '';
    setSlides([...slides, slide]);
    setSelectedId(slide.id);
  };
  const duplicateSlide = () => {
    if (!selected) return;
    const slide = { ...clone(selected), id: createBlankSlide().id, title: `${selected.title || 'Slide'} copy`, shapes: (selected.shapes || []).map((shape) => ({ ...shape, id: createShapeId() })) };
    const next = [...slides];
    next.splice(selectedIndex + 1, 0, slide);
    setSlides(next);
    setSelectedId(slide.id);
  };
  const removeSlide = () => {
    if (!selected || slides.length === 1) return;
    const next = slides.filter((slide) => slide.id !== selected.id);
    setSlides(next);
    setSelectedId(next[Math.min(selectedIndex, next.length - 1)]?.id || null);
  };
  const moveSlide = (direction) => {
    const nextIndex = selectedIndex + direction;
    if (nextIndex < 0 || nextIndex >= slides.length) return;
    const next = [...slides];
    [next[selectedIndex], next[nextIndex]] = [next[nextIndex], next[selectedIndex]];
    setSlides(next);
  };
  const addShape = (type) => {
    const shape = { id: createShapeId(), type, x: 35, y: 42, width: type === 'line' || type === 'arrow' ? 24 : 15, height: type === 'line' || type === 'arrow' ? 4 : 15, fill: '#d2a216', text: '' };
    updateSlide({ shapes: [...shapes, shape] });
    setSelectedShapeId(shape.id);
  };
  const updateShape = (id, patch) => updateSlide({ shapes: shapes.map((shape) => shape.id === id ? { ...shape, ...patch } : shape) });
  const removeShape = () => {
    if (!selectedShapeId) return;
    updateSlide({ shapes: shapes.filter((shape) => shape.id !== selectedShapeId) });
    setSelectedShapeId(null);
  };
  const findSlide = () => {
    const query = (window.prompt('Find text in slides:') || '').trim().toLowerCase();
    if (!query) return;
    const match = slides.find((slide) => [slide.title, slide.titleAr, slide.body, slide.bodyAr, ...(slide.items || []), ...(slide.itemsAr || [])].some((value) => String(value).toLowerCase().includes(query)));
    if (match) setSelectedId(match.id);
    else onNotice?.(`“${query}” was not found in this deck.`);
  };
  const startShow = (fromCurrent = false) => {
    setPresentIndex(fromCurrent ? selectedIndex : 0);
    setIsPresenting(true);
  };

  if (!selected) return <div className="studio-stage-empty"><strong>No slides yet</strong><button type="button" className="primary-button" onClick={addSlide}>Add first slide</button></div>;

  const selectedShape = shapes.find((shape) => shape.id === selectedShapeId) || null;
  const renderRibbon = () => {
    if (activeTab === 'Home') return <>
      <RibbonGroup label="Clipboard"><div className="office-command-row"><RibbonButton large icon="▣" label="Paste" onClick={() => onNotice?.('Use Ctrl+V or Cmd+V to paste text into the selected placeholder.')} /><RibbonButton icon="▤" label="Copy" onClick={duplicateSlide} /></div></RibbonGroup>
      <RibbonGroup label="Slides" wide><div className="office-command-row"><RibbonButton large icon="▯＋" label="New Slide" onClick={addSlide} /><div className="office-command-stack"><label>Layout <select value={selected.layout} onChange={(event) => updateSlide({ layout: event.target.value })}>{SLIDE_LAYOUTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><button type="button" onClick={() => updateSlide({ layout: 'title-content', title: '', titleAr: '', subtitle: '', subtitleAr: '', body: '', bodyAr: '', items: [], itemsAr: [] })}>↺ Reset</button><button type="button" onClick={duplicateSlide}>▣ Duplicate</button></div></div></RibbonGroup>
      <RibbonGroup label="Font" wide><div className="office-font-row"><select value={selected.fontFamily || 'Aptos'} onChange={(event) => updateSlide({ fontFamily: event.target.value })} aria-label="Slide font"><option>Aptos</option><option>Arial</option><option>Georgia</option><option>Times New Roman</option></select><select value={selected.fontSize || 28} onChange={(event) => updateSlide({ fontSize: Number(event.target.value) })} aria-label="Slide font size">{[18, 24, 28, 32, 40, 48, 54].map((size) => <option key={size}>{size}</option>)}</select><button type="button" className={selected.bold ? 'is-active' : ''} onClick={() => updateSlide({ bold: !selected.bold })}><b>B</b></button><button type="button" className={selected.italic ? 'is-active' : ''} onClick={() => updateSlide({ italic: !selected.italic })}><i>I</i></button><button type="button" className={selected.underline ? 'is-active' : ''} onClick={() => updateSlide({ underline: !selected.underline })}><u>U</u></button></div></RibbonGroup>
      <RibbonGroup label="Paragraph"><div className="office-paragraph-grid"><button type="button" onClick={() => updateSlide({ align: 'start' })}>≡</button><button type="button" onClick={() => updateSlide({ align: 'center' })}>≡</button><button type="button" onClick={() => updateSlide({ align: 'end' })}>≡</button><button type="button" onClick={() => updateSlide({ direction: 'ltr' })}>¶→</button><button type="button" onClick={() => updateSlide({ direction: 'rtl' })}>←¶</button><button type="button" onClick={() => updateSlide({ items: [...(selected.items || []), 'New point'] })}>• ≡</button></div></RibbonGroup>
      <RibbonGroup label="Drawing" wide><div className="office-shape-gallery">{SHAPES.map(([type, icon]) => <button type="button" key={type} onClick={() => addShape(type)} title={`Add ${type}`}>{icon}</button>)}</div><div className="office-command-row"><RibbonButton icon="▣" label="Arrange" onClick={() => selectedShape && updateShape(selectedShape.id, { x: 42, y: 42 })} disabled={!selectedShape} /><RibbonButton icon="✕" label="Delete" onClick={removeShape} disabled={!selectedShape} /></div></RibbonGroup>
      <RibbonGroup label="Editing"><div className="office-command-stack"><button type="button" onClick={findSlide}>⌕ Find</button><button type="button" onClick={duplicateSlide}>⇄ Duplicate</button><button type="button" onClick={() => setSelectedShapeId(shapes[0]?.id || null)}>⌁ Select</button></div></RibbonGroup>
    </>;
    if (activeTab === 'Insert') return <><RibbonGroup label="Slides"><RibbonButton large icon="▯＋" label="New slide" onClick={addSlide} /></RibbonGroup><RibbonGroup label="Content"><div className="office-command-row"><RibbonButton large icon="▧" label="Pictures" onClick={onOpenFiles} /><RibbonButton large icon="▦" label="Table" onClick={() => updateSlide({ layout: 'split' })} /><RibbonButton large icon="Σ" label="Equation" onClick={() => addShape('rectangle')} /><RibbonButton large icon="▶" label="Media" onClick={onOpenFiles} /></div></RibbonGroup><RibbonGroup label="Shapes" wide><div className="office-shape-gallery">{SHAPES.map(([type, icon]) => <button type="button" key={type} onClick={() => addShape(type)} title={`Add ${type}`}>{icon}</button>)}</div></RibbonGroup></>;
    if (activeTab === 'Draw') return <><RibbonGroup label="Drawing tools"><div className="office-command-row">{SHAPES.map(([type, icon]) => <RibbonButton key={type} large icon={icon} label={type} onClick={() => addShape(type)} />)}</div></RibbonGroup><RibbonGroup label="Selected shape">{selectedShape ? <div className="office-command-stack"><label>Fill <input type="color" value={selectedShape.fill || '#d2a216'} onChange={(event) => updateShape(selectedShape.id, { fill: event.target.value })} /></label><button type="button" onClick={removeShape}>Delete shape</button></div> : <p className="office-ribbon-note">Select or add a shape.</p>}</RibbonGroup></>;
    if (activeTab === 'Design') return <><RibbonGroup label="Themes" wide><div className="powerpoint-themes">{[['gold', 'AG Gold'], ['green', 'Study Green'], ['blue', 'Academic Blue'], ['purple', 'Focus Purple']].map(([tone, label]) => <button type="button" key={tone} className={`ppt-theme-card ppt-theme-card--${tone}${selected.tone === tone ? ' is-active' : ''}`} onClick={() => updateSlide({ tone })}><span>Aa</span><small>{label}</small></button>)}</div></RibbonGroup><RibbonGroup label="Designer"><p className="office-ribbon-note">The student version automatically uses {block.title || 'this subject'}’s published theme.</p></RibbonGroup></>;
    if (activeTab === 'Transitions') return <><RibbonGroup label="Transition to this slide" wide><div className="office-command-row">{[['none', '⊘', 'None'], ['fade', '◩', 'Fade'], ['push', '▰', 'Push'], ['wipe', '◧', 'Wipe']].map(([id, icon, label]) => <RibbonButton key={id} large icon={icon} label={label} active={(selected.transition || 'none') === id} onClick={() => updateSlide({ transition: id })} />)}</div></RibbonGroup><RibbonGroup label="Timing"><label className="office-range">Duration <input type="range" min="200" max="2000" step="100" value={selected.transitionDuration || 500} onChange={(event) => updateSlide({ transitionDuration: Number(event.target.value) })} /><span>{(selected.transitionDuration || 500) / 1000}s</span></label></RibbonGroup></>;
    if (activeTab === 'Animations') return <><RibbonGroup label="Animation" wide><div className="office-command-row">{[['none', '⊘', 'None'], ['appear', '★', 'Appear'], ['fade', '☆', 'Fade'], ['float', '↑', 'Float In']].map(([id, icon, label]) => <RibbonButton key={id} large icon={icon} label={label} active={(selected.animation || 'none') === id} onClick={() => updateSlide({ animation: id })} />)}</div></RibbonGroup><RibbonGroup label="Sequence"><p className="office-ribbon-note">Animations apply to the title and content when students open this slide.</p></RibbonGroup></>;
    if (activeTab === 'Slide Show') return <><RibbonGroup label="Start slide show"><div className="office-command-row"><RibbonButton large icon="▶" label="From Beginning" onClick={() => startShow(false)} /><RibbonButton large icon="▷" label="From Current Slide" onClick={() => startShow(true)} /></div></RibbonGroup><RibbonGroup label="Student view"><RibbonButton large icon="▣" label={previewOpen ? 'Hide preview' : 'Show preview'} active={previewOpen} onClick={onTogglePreview} /></RibbonGroup></>;
    if (activeTab === 'Record') return <><RibbonGroup label="Presenter tools"><RibbonButton large icon="●" label="Presenter notes" onClick={() => document.querySelector('.slide-notes-editor')?.focus()} /></RibbonGroup><RibbonGroup label="Privacy"><p className="office-ribbon-note">Notes remain private. No paid recording or transcription service is used.</p></RibbonGroup></>;
    if (activeTab === 'Review') return <><RibbonGroup label="Proofing"><RibbonButton large icon="ABC✓" label="Spelling" onClick={() => onNotice?.('Browser spelling and grammar checking is enabled in slide fields.')} /></RibbonGroup><RibbonGroup label="Language"><div className="office-command-row"><RibbonButton large icon="EN" label="English" active={selected.direction !== 'rtl'} onClick={() => updateSlide({ direction: 'ltr' })} /><RibbonButton large icon="ع" label="Arabic" active={selected.direction === 'rtl'} onClick={() => updateSlide({ direction: 'rtl' })} /></div></RibbonGroup></>;
    if (activeTab === 'View') return <><RibbonGroup label="Presentation views"><div className="office-command-row"><RibbonButton large icon="▯" label="Normal" active /><RibbonButton large icon="▦" label="Gridlines" active={showGrid} onClick={() => setShowGrid((value) => !value)} /><RibbonButton large icon="▤" label="Preview" active={previewOpen} onClick={onTogglePreview} /></div></RibbonGroup><RibbonGroup label="Zoom"><label className="office-range"><input type="range" min="55" max="120" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /><span>{zoom}%</span></label></RibbonGroup></>;
    if (activeTab === 'File') return <><RibbonGroup label="Presentation"><div className="office-file-summary"><strong>{block.title || 'Untitled presentation'}</strong><span>{slides.length} slides · saved in the selected subject</span></div></RibbonGroup><RibbonGroup label="Safety"><p className="office-ribbon-note">Slides are structured data; no macros or embedded scripts are run.</p></RibbonGroup></>;
    return <><RibbonGroup label="Help"><RibbonButton large icon="?" label="Editor help" onClick={() => onNotice?.('Use Home for slides and text, Insert for media and shapes, Design for themes, and Slide Show to present.')} /></RibbonGroup><RibbonGroup label="Keyboard"><p className="office-ribbon-note">Arrow keys edit text · Delete removes selected text · Esc closes slide show</p></RibbonGroup></>;
  };

  const slideStyle = {
    '--ppt-font': selected.fontFamily || 'Aptos',
    '--ppt-font-size': `${selected.fontSize || 28}px`,
    '--ppt-align': selected.align || 'center',
    '--ppt-zoom': zoom / 100,
  };

  return <div className="slides-editor office-editor" style={slideStyle}>
    <nav className="office-tabs office-tabs--powerpoint" aria-label="Presentation ribbon tabs">{POWERPOINT_TABS.map((tab) => <button type="button" key={tab} className={activeTab === tab ? 'is-active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>)}</nav>
    <div className="office-ribbon slides-ribbon" role="toolbar" aria-label={`${activeTab} presentation tools`}>{renderRibbon()}</div>
    <div className="slides-workspace">
      <aside className="slides-filmstrip" aria-label="Slides">{slides.map((slide, index) => <button type="button" key={slide.id} className={slide.id === selected.id ? 'slides-thumb is-active' : 'slides-thumb'} onClick={() => { setSelectedId(slide.id); setSelectedShapeId(null); }}><span>{index + 1}</span><div className={`slides-thumb__canvas slides-thumb__canvas--${slide.tone}`}><strong>{slide.title || 'Click to add title'}</strong><small>{slide.subtitle || slide.items?.[0] || slide.body || 'Click to add subtitle'}</small></div></button>)}<button type="button" className="slides-filmstrip__add" onClick={addSlide}>＋ New slide</button></aside>
      <div className="slides-stage">
        <div className={`slide-canvas-frame${showGrid ? ' has-grid' : ''}`}>
          <div className={`slide-canvas slide-canvas--${selected.layout} slide-canvas--${selected.tone} slide-canvas--transition-${selected.transition || 'none'}`} onClick={() => setSelectedShapeId(null)}>
            <input spellCheck className="slide-canvas__title" style={{ fontWeight: selected.bold ? 700 : 400, fontStyle: selected.italic ? 'italic' : 'normal', textDecoration: selected.underline ? 'underline' : 'none' }} dir={selected.direction === 'rtl' ? 'rtl' : 'ltr'} value={selected.title} onChange={(event) => updateSlide({ title: event.target.value })} placeholder="Click to add title" aria-label="Slide title in English" />
            <input spellCheck className="slide-canvas__subtitle" dir={selected.direction === 'rtl' ? 'rtl' : 'ltr'} value={selected.subtitle} onChange={(event) => updateSlide({ subtitle: event.target.value })} placeholder="Click to add subtitle" aria-label="Slide subtitle in English" />
            {selected.layout !== 'title-only' ? <textarea spellCheck className="slide-canvas__body" dir={selected.direction === 'rtl' ? 'rtl' : 'ltr'} value={selected.body} onChange={(event) => updateSlide({ body: event.target.value })} placeholder="Click to add text" aria-label="Slide body in English" /> : null}
            {selected.layout !== 'title-only' ? <textarea spellCheck className="slide-canvas__bullets" value={linesText(selected.items)} onChange={(event) => updateSlide({ items: lineList(event.target.value) })} placeholder="• Click to add bullet points" aria-label="Slide bullet points" /> : null}
            {shapes.map((shape) => <SlideShape key={shape.id} shape={shape} selected={shape.id === selectedShapeId} onSelect={() => setSelectedShapeId(shape.id)} onMoveEnd={(patch) => updateShape(shape.id, patch)} />)}
          </div>
        </div>
        <div className="slide-language-strip"><label>Arabic title<input dir="rtl" value={selected.titleAr} onChange={(event) => updateSlide({ titleAr: event.target.value })} placeholder="عنوان الشريحة" /></label><label>Arabic subtitle<input dir="rtl" value={selected.subtitleAr} onChange={(event) => updateSlide({ subtitleAr: event.target.value })} placeholder="العنوان الفرعي" /></label><label>Arabic content<textarea dir="rtl" value={selected.bodyAr} onChange={(event) => updateSlide({ bodyAr: event.target.value })} placeholder="محتوى الشريحة" /></label><label>Arabic bullets<textarea dir="rtl" value={linesText(selected.itemsAr)} onChange={(event) => updateSlide({ itemsAr: lineList(event.target.value) })} placeholder="نقطة واحدة في كل سطر" /></label></div>
        <textarea className="slide-notes-editor" value={selected.notes} onChange={(event) => updateSlide({ notes: event.target.value })} placeholder="Click to add presenter notes (private)" aria-label="Presenter notes" />
      </div>
    </div>
    <div className="powerpoint-status"><span>Slide {selectedIndex + 1} of {slides.length}</span><span>{selected.notes ? 'Notes available' : 'No notes'}</span><span className="word-status__spacer" /><button type="button" onClick={() => setZoom((value) => Math.max(55, value - 10))}>−</button><input type="range" min="55" max="120" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} aria-label="Slide zoom" /><button type="button" onClick={() => setZoom((value) => Math.min(120, value + 10))}>＋</button><span>{zoom}%</span></div>
    {isPresenting ? <div className="slide-show-overlay" role="dialog" aria-modal="true" aria-label="Slide show" onKeyDown={(event) => { if (event.key === 'Escape') setIsPresenting(false); }} tabIndex="-1"><button type="button" className="slide-show-overlay__close" onClick={() => setIsPresenting(false)}>× End show</button><div className={`slide-show-canvas slide-show-canvas--${slides[presentIndex]?.tone || 'gold'} slide-show-canvas--${slides[presentIndex]?.animation || 'none'}`}><span>{presentIndex + 1} / {slides.length}</span><h2>{slides[presentIndex]?.title || 'Untitled slide'}</h2>{slides[presentIndex]?.subtitle ? <h3>{slides[presentIndex].subtitle}</h3> : null}<p>{slides[presentIndex]?.body}</p>{slides[presentIndex]?.items?.length ? <ul>{slides[presentIndex].items.map((item, index) => <li key={index}>{item}</li>)}</ul> : null}</div><div className="slide-show-controls"><button type="button" disabled={presentIndex === 0} onClick={() => setPresentIndex((value) => Math.max(0, value - 1))}>← Previous</button><button type="button" disabled={presentIndex === slides.length - 1} onClick={() => setPresentIndex((value) => Math.min(slides.length - 1, value + 1))}>Next →</button></div></div> : null}
  </div>;
}
