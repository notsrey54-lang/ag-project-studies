import { useEffect, useState } from 'react';
import { normalizeRichRuns, safeContentUrl } from '../lib/richText.js';

const lines = (value) => String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

function BilingualText({ english, arabic, className = '' }) {
  return <>
    {english ? <p className={className}>{english}</p> : null}
    {arabic ? <p className={`${className} content-arabic`} dir="rtl">{arabic}</p> : null}
  </>;
}

function TableBlock({ content }) {
  const columns = Array.isArray(content.columns) ? content.columns : [];
  const rows = Array.isArray(content.rows) ? content.rows : [];
  if (!columns.length && !rows.length) return null;
  return <div className="content-table-wrap"><table className="content-table"><thead><tr>{columns.map((column, index) => <th key={`column-${index}`}>{column}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={`row-${rowIndex}`}>{columns.map((_, columnIndex) => <td key={`cell-${rowIndex}-${columnIndex}`}>{row?.[columnIndex] || ''}</td>)}</tr>)}</tbody></table></div>;
}

function RichTextBlock({ content }) {
  const runs = normalizeRichRuns(content.runs);
  const fallback = !runs.length && content.text ? [{ text: content.text }] : [];
  const values = runs.length ? runs : fallback;
  return <p className={`content-rich-text content-rich-text--${content.alignment || 'start'} content-rich-text--${content.scale || 'body'}`} dir={content.direction === 'rtl' ? 'rtl' : 'ltr'}>
    {values.map((run, index) => {
      let node = run.text;
      if (run.bold) node = <strong>{node}</strong>;
      if (run.italic) node = <em>{node}</em>;
      if (run.underline) node = <u>{node}</u>;
      if (run.strike) node = <s>{node}</s>;
      if (run.subscript) node = <sub>{node}</sub>;
      if (run.superscript) node = <sup>{node}</sup>;
      if (run.link) node = <a href={safeContentUrl(run.link)} target="_blank" rel="noreferrer">{node}</a>;
      return <span key={`run-${index}`}>{node}</span>;
    })}
  </p>;
}

function PresentationBlock({ block }) {
  const slides = Array.isArray(block.content?.slides) ? block.content.slides : [];
  const [active, setActive] = useState(0);
  useEffect(() => setActive((current) => Math.min(current, Math.max(0, slides.length - 1))), [slides.length]);
  if (!slides.length) return <p>Presentation unavailable.</p>;
  const slide = slides[active];
  const previous = () => setActive((current) => current === 0 ? slides.length - 1 : current - 1);
  const next = () => setActive((current) => current === slides.length - 1 ? 0 : current + 1);
  return <section className="content-presentation" aria-label={block.title || 'Study presentation'}>
    <div className="content-presentation__top"><div><span className="eyebrow">Presentation</span><strong>{block.title || 'Study slides'}</strong></div><span>{active + 1} / {slides.length}</span></div>
    <article key={slide.id || active} className={`content-slide content-slide--${slide.layout || 'title-content'} content-slide--${slide.tone || 'gold'} content-slide--animation-${slide.animation || 'none'}`} aria-live="polite">
      <div className="content-slide__number">{String(active + 1).padStart(2, '0')}</div>
      <div className="content-slide__copy" dir={slide.direction === 'rtl' ? 'rtl' : 'ltr'} style={{ fontFamily: slide.fontFamily || 'Aptos, Arial, sans-serif', textAlign: slide.align || 'start' }}>
        {slide.title ? <h3>{slide.title}</h3> : null}
        {slide.titleAr ? <h3 dir="rtl" className="content-arabic">{slide.titleAr}</h3> : null}
        {slide.subtitle ? <p className="content-slide__subtitle">{slide.subtitle}</p> : null}
        {slide.subtitleAr ? <p dir="rtl" className="content-slide__subtitle content-arabic">{slide.subtitleAr}</p> : null}
        {slide.body ? <p>{slide.body}</p> : null}
        {slide.bodyAr ? <p dir="rtl" className="content-arabic">{slide.bodyAr}</p> : null}
        {slide.items?.length ? <ul>{slide.items.map((item, index) => <li key={`slide-item-${index}`}>{item}</li>)}</ul> : null}
        {slide.itemsAr?.length ? <ul dir="rtl" className="content-arabic">{slide.itemsAr.map((item, index) => <li key={`slide-item-ar-${index}`}>{item}</li>)}</ul> : null}
      </div>
      {(slide.shapes || []).map((shape) => <span key={shape.id} className={`content-slide-shape content-slide-shape--${shape.type}`} style={{ left: `${shape.x}%`, top: `${shape.y}%`, width: `${shape.width}%`, height: `${shape.height}%`, '--shape-fill': shape.fill }} aria-hidden="true">{shape.text || (shape.type === 'arrow' ? '→' : shape.type === 'star' ? '★' : '')}</span>)}
    </article>
    <div className="content-presentation__controls"><button type="button" onClick={previous} aria-label="Previous slide">← Previous</button><div>{slides.map((item, index) => <button type="button" key={item.id || index} className={index === active ? 'is-active' : ''} onClick={() => setActive(index)} aria-label={`Open slide ${index + 1}`} aria-current={index === active ? 'true' : undefined} />)}</div><button type="button" onClick={next} aria-label="Next slide">Next →</button></div>
  </section>;
}

function RenderBlock({ block }) {
  const content = block.content || {};
  const title = block.title || '';
  const titleAr = block.titleAr || '';
  const titleNode = title || titleAr ? <div className="content-block__title">{title ? <h4>{title}</h4> : null}{titleAr ? <h4 dir="rtl" className="content-arabic">{titleAr}</h4> : null}</div> : null;
  const itemList = Array.isArray(content.items) ? content.items : lines(content.text);
  const itemListAr = Array.isArray(content.itemsAr) ? content.itemsAr : lines(content.textAr);

  if (block.type === 'heading') {
    const Heading = `h${Math.min(6, Math.max(2, Number(content.level) || 3))}`;
    return <div className="content-block content-block--heading">{titleNode || <><Heading>{content.text}</Heading>{content.textAr ? <Heading dir="rtl" className="content-arabic">{content.textAr}</Heading> : null}</>}</div>;
  }
  if (block.type === 'rich_text') return <div className="content-block content-block--rich">{titleNode}<RichTextBlock content={content} /></div>;
  if (block.type === 'bullet_list' || block.type === 'numbered_list' || block.type === 'checklist') {
    const Tag = block.type === 'numbered_list' ? 'ol' : 'ul';
    return <div className={`content-block content-block--${block.type}`}>{titleNode}<Tag>{itemList.map((item, index) => <li key={`item-${index}`}>{block.type === 'checklist' ? <span className="content-check">□</span> : null}{item}</li>)}</Tag>{itemListAr.length ? <Tag dir="rtl" className="content-arabic">{itemListAr.map((item, index) => <li key={`arabic-item-${index}`}>{block.type === 'checklist' ? <span className="content-check">□</span> : null}{item}</li>)}</Tag> : null}</div>;
  }
  if (block.type === 'callout') return <aside className="content-block content-callout"><span className="eyebrow">{content.label || 'Key point'}</span>{titleNode}<BilingualText english={content.text} arabic={content.textAr} /></aside>;
  if (block.type === 'quote') return <blockquote className="content-block content-quote">{titleNode}<BilingualText english={content.quote || content.text} arabic={content.quoteAr || content.textAr} /><cite>{content.citation || ''}</cite></blockquote>;
  if (block.type === 'table') return <div className="content-block">{titleNode}<TableBlock content={content} /></div>;
  if (block.type === 'formula') return <div className="content-block content-formula">{titleNode}<code>{content.formula || content.text}</code>{content.formulaAr ? <code dir="rtl" className="content-arabic">{content.formulaAr}</code> : null}<BilingualText english={content.text && content.text !== content.formula ? content.text : ''} arabic={content.textAr && content.textAr !== content.formulaAr ? content.textAr : ''} /></div>;
  if (block.type === 'comparison') return <div className="content-block content-comparison">{titleNode}<div><article><strong>{content.leftTitle || 'Option A'}</strong><ul>{(content.leftItems || []).map((item, index) => <li key={`left-${index}`}>{item}</li>)}</ul></article><article><strong>{content.rightTitle || 'Option B'}</strong><ul>{(content.rightItems || []).map((item, index) => <li key={`right-${index}`}>{item}</li>)}</ul></article></div></div>;
  if (block.type === 'timeline') return <div className="content-block content-timeline">{titleNode}{(content.events || []).map((event, index) => <article key={`event-${index}`}><span>{event.date || event.label || index + 1}</span><div><strong>{event.title || ''}</strong><p>{event.text || ''}</p>{event.textAr ? <p dir="rtl" className="content-arabic">{event.textAr}</p> : null}</div></article>)}</div>;
  if (block.type === 'link' || block.type === 'video' || block.type === 'audio') {
    const url = safeContentUrl(content.url);
    return <div className="content-block content-embed">{titleNode}{url ? <a href={url} target="_blank" rel="noreferrer"><span>{content.label || block.type}</span><strong>{content.label || url}</strong></a> : <p>Resource link unavailable.</p>}</div>;
  }
  if (block.type === 'image' || block.type === 'drawing') {
    const url = safeContentUrl(content.imageData || content.url, { allowDataImage: true });
    return <div className="content-block content-image">{titleNode}{url ? <img src={url} alt={content.alt || title || 'Study illustration'} /> : <p>Image unavailable.</p>}{content.source ? <small>{content.source}</small> : null}</div>;
  }
  if (block.type === 'code') return <div className="content-block content-code">{titleNode}<pre><code>{content.code || content.text || ''}</code></pre></div>;
  if (block.type === 'divider') return <hr className="content-divider" />;
  if (block.type === 'presentation') return <PresentationBlock block={block} />;
  if (block.type === 'custom') return <div className="content-block content-custom">{titleNode}<BilingualText english={content.text} arabic={content.textAr} />{content.config && Object.keys(content.config).length ? <pre>{JSON.stringify(content.config, null, 2)}</pre> : null}</div>;
  return <div className="content-block content-block--paragraph">{titleNode}<BilingualText english={content.text} arabic={content.textAr} /></div>;
}

export function ContentBlockReader({ subject, blocks: providedBlocks, compact = false }) {
  const blocks = [...(providedBlocks || subject?.contentBlocks || [])].sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
  if (!blocks.length) return null;
  const chapters = subject.modules || [];
  return <section className={`content-block-reader ${compact ? 'content-block-reader--compact' : ''}`} aria-label={`${subject.code} extended study notes`}>
    {!compact ? <div className="content-block-reader__heading"><span className="eyebrow">Administrator-built notes</span><h2>Extended study material</h2><p>Structured notes, references, tables, formulas, drawings, and review tools for this subject.</p></div> : null}
    {blocks.map((block) => {
      const chapter = chapters.find((item) => item.id === block.chapterId);
      return <article className="content-block-card" key={block.id}>{chapter ? <span className="content-block-card__chapter">{chapter.title}</span> : null}<RenderBlock block={block} /></article>;
    })}
  </section>;
}
