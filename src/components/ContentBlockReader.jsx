const safeUrl = (value, allowDataImage = false) => {
  if (typeof value !== 'string' || !value.trim()) return '';
  if (/^https:\/\//i.test(value)) return value;
  if (allowDataImage && /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(value)) return value;
  return '';
};

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

function RenderBlock({ block }) {
  const content = block.content || {};
  const title = block.title || '';
  const titleAr = block.titleAr || '';
  const titleNode = title || titleAr ? <div className="content-block__title">{title ? <h4>{title}</h4> : null}{titleAr ? <h4 dir="rtl" className="content-arabic">{titleAr}</h4> : null}</div> : null;
  const itemList = Array.isArray(content.items) ? content.items : lines(content.text);
  const itemListAr = Array.isArray(content.itemsAr) ? content.itemsAr : lines(content.textAr);

  if (block.type === 'heading') return <div className="content-block content-block--heading">{titleNode || <><h3>{content.text}</h3>{content.textAr ? <h3 dir="rtl" className="content-arabic">{content.textAr}</h3> : null}</>}</div>;
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
    const url = safeUrl(content.url);
    return <div className="content-block content-embed">{titleNode}{url ? <a href={url} target="_blank" rel="noreferrer"><span>{content.label || block.type}</span><strong>{content.label || url}</strong></a> : <p>Resource link unavailable.</p>}</div>;
  }
  if (block.type === 'image' || block.type === 'drawing') {
    const url = safeUrl(content.imageData || content.url, true);
    return <div className="content-block content-image">{titleNode}{url ? <img src={url} alt={content.alt || title || 'Study illustration'} /> : <p>Image unavailable.</p>}{content.source ? <small>{content.source}</small> : null}</div>;
  }
  if (block.type === 'code') return <div className="content-block content-code">{titleNode}<pre><code>{content.code || content.text || ''}</code></pre></div>;
  if (block.type === 'custom') return <div className="content-block content-custom">{titleNode}<BilingualText english={content.text} arabic={content.textAr} />{content.config && Object.keys(content.config).length ? <pre>{JSON.stringify(content.config, null, 2)}</pre> : null}</div>;
  return <div className="content-block content-block--paragraph">{titleNode}<BilingualText english={content.text} arabic={content.textAr} /></div>;
}

export function ContentBlockReader({ subject }) {
  const blocks = [...(subject?.contentBlocks || [])].sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
  if (!blocks.length) return null;
  const chapters = subject.modules || [];
  return <section className="content-block-reader" aria-label={`${subject.code} extended study notes`}>
    <div className="content-block-reader__heading"><span className="eyebrow">Administrator-built notes</span><h2>Extended study material</h2><p>Structured notes, references, tables, formulas, drawings, and review tools for this subject.</p></div>
    {blocks.map((block) => {
      const chapter = chapters.find((item) => item.id === block.chapterId);
      return <article className="content-block-card" key={block.id}>{chapter ? <span className="content-block-card__chapter">{chapter.title}</span> : null}<RenderBlock block={block} /></article>;
    })}
  </section>;
}
