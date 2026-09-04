import { useMemo, useState } from 'react';
import { CHAPTER_SECTIONS } from '../../lib/contentLibrary.js';
import { importHtmlDocument } from '../../lib/htmlImporter.js';
import { ContentBlockReader } from '../ContentBlockReader.jsx';

export function HtmlImportPanel({ subject, onImport, onError }) {
  const [chapterId, setChapterId] = useState(subject.modules?.[0]?.id || '');
  const [section, setSection] = useState(subject.modules?.[0]?.section || 'course');
  const [paste, setPaste] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const counts = useMemo(() => result?.blocks?.reduce((summary, block) => ({ ...summary, [block.type]: (summary[block.type] || 0) + 1 }), {}) || {}, [result]);

  const analyse = (html) => {
    setBusy(true);
    try {
      setResult(importHtmlDocument(html, { chapterId, section }));
    } catch (error) {
      setResult(null);
      onError?.(error.message || 'The HTML document could not be imported.');
    } finally {
      setBusy(false);
    }
  };
  const chooseFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/\.html?$/i.test(file.name) && file.type !== 'text/html') {
      onError?.('Choose an HTML or HTM file.');
      return;
    }
    analyse(await file.text());
  };
  const drop = async (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (!/\.html?$/i.test(file.name) && file.type !== 'text/html') {
      onError?.('Choose an HTML or HTM file.');
      return;
    }
    analyse(await file.text());
  };

  return <div className="html-importer">
    <section className="html-importer__setup">
      <div className="studio-section-heading"><div><span className="studio-kicker">Theme-aware converter</span><h3>Import an HTML page</h3><p>The importer keeps headings, paragraphs, inline emphasis, lists, tables, quotes, code, links, and HTTPS images. External colours, fonts, scripts, forms, and layouts are removed so the page adopts AG Project automatically.</p></div></div>
      <div className="studio-form-grid">
        <label className="studio-field"><span>Place under chapter</span><select value={chapterId} onChange={(event) => { const value = event.target.value; setChapterId(value); const chapter = subject.modules.find((item) => item.id === value); if (chapter) setSection(chapter.section || 'course'); }}><option value="">Subject-wide</option>{subject.modules.map((chapter) => <option value={chapter.id} key={chapter.id}>{chapter.title}</option>)}</select></label>
        <label className="studio-field"><span>Assessment section</span><select value={section} onChange={(event) => setSection(event.target.value)}>{CHAPTER_SECTIONS.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
      </div>
      <label className="html-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={drop}><input type="file" accept="text/html,.html,.htm" onChange={chooseFile} /><span className="html-dropzone__icon">HTML</span><strong>Drop an HTML file here</strong><small>or choose a file · maximum 2 MB</small></label>
      <div className="html-importer__divider"><span>or paste HTML</span></div>
      <textarea className="html-source" value={paste} onChange={(event) => setPaste(event.target.value)} rows={9} spellCheck="false" placeholder="Paste the page source here…" aria-label="HTML source" />
      <button type="button" className="secondary-button" disabled={!paste.trim() || busy} onClick={() => analyse(paste)}>{busy ? 'Analysing…' : 'Analyse pasted HTML'}</button>
    </section>
    <section className="html-importer__result">
      {result ? <>
        <div className="html-result__header"><div><span className="studio-kicker">Ready to convert</span><h3>{result.title}</h3><p>{result.blocks.length} safe theme-matched blocks found.</p></div><button type="button" className="primary-button" onClick={() => onImport(result)}>Add to {subject.code}</button></div>
        <div className="html-result__counts">{Object.entries(counts).map(([type, count]) => <span key={type}><strong>{count}</strong> {type.replaceAll('_', ' ')}</span>)}</div>
        {result.warnings.length ? <div className="html-result__warnings">{result.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null}
        <div className="html-result__preview"><ContentBlockReader subject={subject} blocks={result.blocks} compact /></div>
      </> : <div className="html-result__empty"><span>◎</span><strong>Your converted page preview appears here.</strong><p>No uploaded HTML is executed. It becomes safe AG Project content blocks first.</p></div>}
    </section>
  </div>;
}
