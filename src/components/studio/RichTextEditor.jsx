import { useEffect, useMemo, useRef, useState } from 'react';
import { editorElementToRichRuns, richRunsToEditorHtml, safeContentUrl } from '../../lib/richText.js';

const WORD_TABS = ['File', 'Home', 'Insert', 'Draw', 'Design', 'Layout', 'References', 'Mailings', 'Review', 'View', 'Help'];
const FONT_FAMILIES = ['Aptos', 'Arial', 'Georgia', 'Times New Roman', 'Verdana'];
const FONT_SIZES = [10, 11, 12, 14, 16, 18, 24, 32, 42];
const TEXT_COLORS = ['#111111', '#1f4e79', '#a61b1b', '#2f6b4f', '#8a6500'];
const HIGHLIGHTS = ['transparent', '#fff2a8', '#d9ead3', '#cfe2f3', '#f4cccc'];

function RibbonGroup({ label, wide = false, children }) {
  return <div className={`office-ribbon-group${wide ? ' office-ribbon-group--wide' : ''}`}><div className="office-ribbon-group__body">{children}</div><span className="office-ribbon-group__label">{label}</span></div>;
}

function RibbonButton({ label, icon, active = false, large = false, disabled = false, onClick, title }) {
  return <button type="button" className={`office-command${large ? ' office-command--large' : ''}${active ? ' is-active' : ''}`} onMouseDown={(event) => event.preventDefault()} onClick={onClick} disabled={disabled} title={title || label}><span aria-hidden="true">{icon}</span><small>{label}</small></button>;
}

function HomeRibbon({ content, command, updateContent, onInsertBlock, pasteFromClipboard, replaceText, dictate }) {
  return <>
    <RibbonGroup label="Clipboard"><div className="office-command-grid office-command-grid--clipboard"><RibbonButton large icon="▣" label="Paste" onClick={pasteFromClipboard} /><RibbonButton icon="✂" label="Cut" onClick={() => command('cut')} /><RibbonButton icon="▤" label="Copy" onClick={() => command('copy')} /></div></RibbonGroup>
    <RibbonGroup label="Font" wide><div className="office-font-row"><select aria-label="Font family" value={content.fontFamily || 'Aptos'} onChange={(event) => updateContent({ fontFamily: event.target.value })}>{FONT_FAMILIES.map((font) => <option key={font}>{font}</option>)}</select><select aria-label="Font size" value={content.fontSize || 12} onChange={(event) => updateContent({ fontSize: Number(event.target.value) })}>{FONT_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select><button type="button" onClick={() => updateContent({ fontSize: Math.min(42, (content.fontSize || 12) + 1) })}>A↑</button><button type="button" onClick={() => updateContent({ fontSize: Math.max(10, (content.fontSize || 12) - 1) })}>A↓</button></div><div className="office-font-row office-font-row--commands">{[['bold', 'B'], ['italic', 'I'], ['underline', 'U'], ['strikeThrough', 'ab̶']].map(([id, icon]) => <button type="button" key={id} className={`word-command word-command--${id}`} onMouseDown={(event) => event.preventDefault()} onClick={() => command(id)} title={id}>{icon}</button>)}<button type="button" onClick={() => command('subscript')} title="Subscript">x₂</button><button type="button" onClick={() => command('superscript')} title="Superscript">x²</button><label className="office-color-control" title="Highlight"><span>▰</span><select value={content.highlight || 'transparent'} onChange={(event) => updateContent({ highlight: event.target.value })}>{HIGHLIGHTS.map((color) => <option key={color} value={color}>{color === 'transparent' ? 'No highlight' : color}</option>)}</select></label><label className="office-color-control" title="Text color"><span style={{ color: content.textColor || '#111111' }}>A</span><select value={content.textColor || '#111111'} onChange={(event) => updateContent({ textColor: event.target.value })}>{TEXT_COLORS.map((color) => <option key={color} value={color}>{color}</option>)}</select></label></div></RibbonGroup>
    <RibbonGroup label="Paragraph" wide><div className="office-paragraph-grid"><button type="button" onClick={() => onInsertBlock?.('bullet_list')} title="Insert bullet list">• ≡</button><button type="button" onClick={() => onInsertBlock?.('numbered_list')} title="Insert numbered list">1 ≡</button><button type="button" onClick={() => onInsertBlock?.('checklist')} title="Insert checklist">☑</button><button type="button" onClick={() => command('outdent')} title="Decrease indent">⇤</button><button type="button" onClick={() => command('indent')} title="Increase indent">⇥</button><button type="button" onClick={() => updateContent({ direction: 'ltr' })} title="Left-to-right">¶→</button><button type="button" onClick={() => updateContent({ direction: 'rtl' })} title="Right-to-left">←¶</button>{[['start', '≡'], ['center', '≡'], ['end', '≡'], ['justify', '▤']].map(([id, icon], index) => <button type="button" key={id} className={`${content.alignment === id ? 'is-active ' : ''}office-align-${index}`} onClick={() => updateContent({ alignment: id })} title={`${id} alignment`}>{icon}</button>)}</div></RibbonGroup>
    <RibbonGroup label="Styles" wide><div className="office-style-gallery">{[['body', 'Normal'], ['compact', 'No Spacing'], ['heading1', 'Heading'], ['heading2', 'Heading 2'], ['title', 'Title'], ['subtitle', 'Subtitle']].map(([id, label]) => <button type="button" key={id} className={content.scale === id ? 'is-active' : ''} onClick={() => updateContent({ scale: id })}><span>{label}</span></button>)}</div></RibbonGroup>
    <RibbonGroup label="Editing"><div className="office-command-stack"><button type="button" onClick={() => window.find?.(window.prompt('Find text:') || '')}>⌕ Find</button><button type="button" onClick={replaceText}>⇄ Replace</button><button type="button" onClick={() => command('selectAll')}>⌁ Select</button></div></RibbonGroup>
    <RibbonGroup label="Voice"><RibbonButton large icon="🎙" label="Dictate" onClick={dictate} /></RibbonGroup>
  </>;
}

function InsertRibbon({ addLink, onInsertBlock, onOpenFiles, onOpenHtml }) {
  return <>
    <RibbonGroup label="Pages"><div className="office-command-row"><RibbonButton large icon="▯" label="Page" onClick={() => onInsertBlock?.('rich_text')} /><RibbonButton large icon="—" label="Break" onClick={() => onInsertBlock?.('divider')} /></div></RibbonGroup>
    <RibbonGroup label="Tables"><RibbonButton large icon="▦" label="Table" onClick={() => onInsertBlock?.('table')} /></RibbonGroup>
    <RibbonGroup label="Illustrations"><div className="office-command-row"><RibbonButton large icon="▧" label="Pictures" onClick={onOpenFiles} /><RibbonButton large icon="✎" label="Drawing" onClick={() => onInsertBlock?.('drawing')} /><RibbonButton large icon="⇄" label="Compare" onClick={() => onInsertBlock?.('comparison')} /></div></RibbonGroup>
    <RibbonGroup label="Links"><div className="office-command-row"><RibbonButton large icon="↗" label="Link" onClick={addLink} /><RibbonButton large icon="“" label="Quote" onClick={() => onInsertBlock?.('quote')} /></div></RibbonGroup>
    <RibbonGroup label="Media & import"><div className="office-command-row"><RibbonButton large icon="▶" label="Media" onClick={onOpenFiles} /><RibbonButton large icon="&lt;/&gt;" label="HTML" onClick={onOpenHtml} /></div></RibbonGroup>
    <RibbonGroup label="Symbols"><div className="office-command-row"><RibbonButton large icon="Σ" label="Formula" onClick={() => onInsertBlock?.('formula')} /><RibbonButton large icon="{}" label="Code" onClick={() => onInsertBlock?.('code')} /></div></RibbonGroup>
  </>;
}

export function RichTextEditor({ block, update, onNotice, onInsertBlock, onOpenFiles, onOpenHtml, onTogglePreview, previewOpen = true }) {
  const editorRef = useRef(null);
  const [activeTab, setActiveTab] = useState('Home');
  const [zoom, setZoom] = useState(90);
  const content = block.content || {};
  const words = useMemo(() => (content.text || '').trim().split(/\s+/).filter(Boolean).length, [content.text]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) return;
    const next = richRunsToEditorHtml(content.runs);
    if (editor.innerHTML !== next) editor.innerHTML = next;
  }, [block.id, content.runs]);

  const updateContent = (patch) => update({ content: { ...content, ...patch } });
  const sync = () => updateContent({ runs: editorElementToRichRuns(editorRef.current), text: editorRef.current?.innerText || '' });
  const command = (name, value = null) => {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
    sync();
  };
  const addLink = () => {
    const value = window.prompt('Paste an HTTPS link for the selected text:');
    if (value === null) return;
    const url = safeContentUrl(value);
    if (!url) return onNotice?.('Only HTTPS links can be added.');
    command('createLink', url);
  };
  const pastePlainText = (event) => {
    event.preventDefault();
    document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
    window.setTimeout(sync, 0);
  };
  const pasteFromClipboard = async () => {
    try {
      const value = await navigator.clipboard.readText();
      editorRef.current?.focus();
      document.execCommand('insertText', false, value);
      sync();
    } catch {
      onNotice?.('Use Ctrl+V or Cmd+V to paste. Your browser blocked the toolbar paste action.');
    }
  };
  const replaceText = () => {
    const from = window.prompt('Find:');
    if (!from) return;
    const to = window.prompt(`Replace “${from}” with:`, '') ?? '';
    const nextRuns = (content.runs || []).map((run) => ({ ...run, text: run.text.split(from).join(to) }));
    updateContent({ runs: nextRuns, text: nextRuns.map((run) => run.text).join('') });
  };
  const dictate = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return onNotice?.('Dictation is not available in this browser.');
    const recognition = new SpeechRecognition();
    recognition.lang = content.direction === 'rtl' ? 'ar' : 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      editorRef.current?.focus();
      document.execCommand('insertText', false, event.results[0][0].transcript);
      sync();
    };
    recognition.onerror = () => onNotice?.('Dictation could not start. Check the browser microphone permission.');
    recognition.start();
    onNotice?.('Dictation is listening…');
  };

  const renderRibbon = () => {
    if (activeTab === 'Home') return <HomeRibbon content={content} command={command} updateContent={updateContent} onInsertBlock={onInsertBlock} pasteFromClipboard={pasteFromClipboard} replaceText={replaceText} dictate={dictate} />;
    if (activeTab === 'Insert') return <InsertRibbon addLink={addLink} onInsertBlock={onInsertBlock} onOpenFiles={onOpenFiles} onOpenHtml={onOpenHtml} />;
    if (activeTab === 'Draw') return <><RibbonGroup label="Drawing"><div className="office-command-row"><RibbonButton large icon="✎" label="New canvas" onClick={() => onInsertBlock?.('drawing')} /><RibbonButton large icon="▧" label="Upload ink" onClick={onOpenFiles} /></div></RibbonGroup><RibbonGroup label="Ink guidance"><p className="office-ribbon-note">Drawings are stored as safe image blocks and inherit the subject theme.</p></RibbonGroup></>;
    if (activeTab === 'Design') return <><RibbonGroup label="Document formatting" wide><div className="office-style-gallery">{[['white', 'Office'], ['warm', 'Warm'], ['focus', 'Focus']].map(([id, label]) => <button type="button" key={id} className={(content.pageTheme || 'white') === id ? 'is-active' : ''} onClick={() => updateContent({ pageTheme: id })}><span>{label}</span></button>)}</div></RibbonGroup><RibbonGroup label="Theme rule"><p className="office-ribbon-note">Published content always adopts the current subject styling.</p></RibbonGroup></>;
    if (activeTab === 'Layout') return <><RibbonGroup label="Page setup"><div className="office-command-stack"><label>Margins <select value={content.pageMargins || 'normal'} onChange={(event) => updateContent({ pageMargins: event.target.value })}><option value="normal">Normal</option><option value="narrow">Narrow</option><option value="wide">Wide</option></select></label><label>Orientation <select value={content.pageOrientation || 'portrait'} onChange={(event) => updateContent({ pageOrientation: event.target.value })}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label></div></RibbonGroup><RibbonGroup label="Paragraph"><div className="office-command-row"><RibbonButton icon="¶→" label="LTR" active={content.direction !== 'rtl'} onClick={() => updateContent({ direction: 'ltr' })} /><RibbonButton icon="←¶" label="RTL" active={content.direction === 'rtl'} onClick={() => updateContent({ direction: 'rtl' })} /></div></RibbonGroup></>;
    if (activeTab === 'References') return <><RibbonGroup label="Links"><RibbonButton large icon="↗" label="Insert link" onClick={addLink} /></RibbonGroup><RibbonGroup label="Academic blocks"><div className="office-command-row"><RibbonButton large icon="“" label="Citation" onClick={() => onInsertBlock?.('quote')} /><RibbonButton large icon="Σ" label="Formula" onClick={() => onInsertBlock?.('formula')} /><RibbonButton large icon="↦" label="Timeline" onClick={() => onInsertBlock?.('timeline')} /></div></RibbonGroup></>;
    if (activeTab === 'Mailings') return <><RibbonGroup label="Languages" wide><div className="office-command-row"><RibbonButton large icon="EN" label="English" active={content.direction !== 'rtl'} onClick={() => updateContent({ direction: 'ltr' })} /><RibbonButton large icon="ع" label="Arabic" active={content.direction === 'rtl'} onClick={() => updateContent({ direction: 'rtl' })} /></div></RibbonGroup><RibbonGroup label="Course delivery"><p className="office-ribbon-note">This page publishes only inside its assigned subject and chapter.</p></RibbonGroup></>;
    if (activeTab === 'Review') return <><RibbonGroup label="Proofing"><div className="office-command-row"><RibbonButton large icon="ABC✓" label="Browser editor" onClick={() => { editorRef.current?.focus(); onNotice?.('Browser spelling and grammar checking is active.'); }} /><RibbonButton large icon="⇄" label="Replace" onClick={replaceText} /></div></RibbonGroup><RibbonGroup label="Document statistics"><div className="office-stat"><strong>{words}</strong><span>words</span></div><div className="office-stat"><strong>{(content.text || '').length}</strong><span>characters</span></div></RibbonGroup></>;
    if (activeTab === 'View') return <><RibbonGroup label="Zoom"><div className="office-command-row"><RibbonButton icon="−" label="Smaller" onClick={() => setZoom((value) => Math.max(55, value - 10))} /><RibbonButton icon={`${zoom}%`} label="Actual" onClick={() => setZoom(100)} /><RibbonButton icon="＋" label="Larger" onClick={() => setZoom((value) => Math.min(130, value + 10))} /></div></RibbonGroup><RibbonGroup label="Student view"><RibbonButton large icon="▣" label={previewOpen ? 'Hide preview' : 'Show preview'} active={previewOpen} onClick={onTogglePreview} /></RibbonGroup></>;
    if (activeTab === 'File') return <><RibbonGroup label="Document"><div className="office-file-summary"><strong>{block.title || 'Untitled document'}</strong><span>AG Project structured course content</span></div></RibbonGroup><RibbonGroup label="Safety"><p className="office-ribbon-note">Saved as structured JSON. Scripts and unsafe links are never executed.</p></RibbonGroup></>;
    return <><RibbonGroup label="Help"><div className="office-command-row"><RibbonButton large icon="?" label="Editor help" onClick={() => onNotice?.('Use the Home ribbon to format text, Insert to add course blocks, and View to control the live preview.')} /></div></RibbonGroup><RibbonGroup label="Keyboard"><p className="office-ribbon-note">Ctrl/Cmd+B bold · Ctrl/Cmd+I italic · Ctrl/Cmd+Z undo</p></RibbonGroup></>;
  };

  const pageStyle = {
    '--word-zoom': zoom / 100,
    '--word-font': content.fontFamily || 'Aptos',
    '--word-font-size': `${content.fontSize || 12}px`,
    '--word-color': content.textColor || '#111111',
    '--word-highlight': content.highlight || 'transparent',
  };

  return <div className="word-editor office-editor" style={pageStyle}>
    <nav className="office-tabs office-tabs--word" aria-label="Document ribbon tabs">{WORD_TABS.map((tab) => <button type="button" key={tab} className={activeTab === tab ? 'is-active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>)}</nav>
    <div className="office-ribbon word-ribbon" role="toolbar" aria-label={`${activeTab} document tools`}>{renderRibbon()}</div>
    <div className="word-workspace">
      <div className={`word-page word-page--${content.pageTheme || 'white'} word-page--${content.pageOrientation || 'portrait'} word-page--margins-${content.pageMargins || 'normal'}`} data-direction={content.direction === 'rtl' ? 'rtl' : 'ltr'}>
        <div ref={editorRef} className={`word-page__body word-page__body--${content.scale || 'body'}`} contentEditable spellCheck dir={content.direction === 'rtl' ? 'rtl' : 'ltr'} data-placeholder="Start writing your study material…" role="textbox" aria-multiline="true" aria-label="Rich document text" suppressContentEditableWarning onInput={sync} onBlur={sync} onPaste={pastePlainText} />
      </div>
    </div>
    <div className="word-status"><span>Page 1 of 1</span><span>{words} words</span><span>English (United Kingdom) · العربية</span><span className="word-status__spacer" /><button type="button" onClick={() => setZoom((value) => Math.max(55, value - 10))}>−</button><input type="range" min="55" max="130" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} aria-label="Document zoom" /><button type="button" onClick={() => setZoom((value) => Math.min(130, value + 10))}>＋</button><span>{zoom}%</span></div>
  </div>;
}
