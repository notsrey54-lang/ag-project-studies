import { useEffect, useState } from 'react';

function LegacyBUCReader() {
  const [state, setState] = useState({ loading: true, sections: [], error: false });

  useEffect(() => {
    let mounted = true;
    fetch('/buc111-legacy.html')
      .then((response) => {
        if (!response.ok) throw new Error('Course material was unavailable.');
        return response.text();
      })
      .then((html) => {
        const document = new DOMParser().parseFromString(html, 'text/html');
        const sections = [...document.querySelectorAll('.container > section')].map((section, index) => ({
          id: section.id || `buc-section-${index}`,
          title: section.querySelector('h2')?.textContent?.replace(/^[^A-Za-z0-9]+/, '') || `BUC111 section ${index + 1}`,
          markup: section.innerHTML,
        }));
        if (mounted) setState({ loading: false, sections, error: sections.length === 0 });
      })
      .catch(() => {
        if (mounted) setState({ loading: false, sections: [], error: true });
      });
    return () => { mounted = false; };
  }, []);

  if (state.loading) return <div className="material-loading"><span className="loading-dot" /> Loading the complete BUC111 study material…</div>;
  if (state.error) return <div className="material-error"><strong>The complete material could not load.</strong><a href="/buc111-legacy.html" target="_blank" rel="noreferrer">Open the original BUC111 summary</a></div>;

  return (
    <div className="legacy-material">
      <p className="material-intro">Complete Chapters 7–9 and the final comparison from the original BUC111 study material.</p>
      {state.sections.map((section, index) => (
        <details key={section.id} className="material-accordion" open={index === 0}>
          <summary><span>{section.title}</span><span aria-hidden="true">⌄</span></summary>
          <div className="legacy-material__content" dangerouslySetInnerHTML={{ __html: section.markup }} />
        </details>
      ))}
      <a className="material-source-link" href="/buc111-legacy.html" target="_blank" rel="noreferrer">Open the original study summary in a new tab ↗</a>
    </div>
  );
}

function StructuredReader({ subject }) {
  return (
    <div className="structured-material">
      {(subject.materials || []).map((material, index) => (
        <details key={material.id} className="material-accordion" open={index === 0}>
          <summary><span>{material.title}</span><span aria-hidden="true">⌄</span></summary>
          <div className="structured-material__content">
            <p>{material.summary}</p>
            {material.body ? <div className="structured-material__body">{material.body.split(/\n\s*\n/).filter(Boolean).map((paragraph, paragraphIndex) => <p key={`${material.id}-paragraph-${paragraphIndex}`}>{paragraph}</p>)}</div> : null}
            <dl>
              {material.points.map(([term, explanation]) => <div key={term}><dt>{term}</dt><dd>{explanation}</dd></div>)}
            </dl>
            {material.example ? <aside><strong>Short example</strong><p>{material.example}</p></aside> : null}
          </div>
        </details>
      ))}
      {subject.resources?.length ? <section className="material-reference-section"><div className="material-reference-heading"><span className="eyebrow">Supporting material</span><h3>Resources</h3></div><div className="material-resource-grid">{subject.resources.map((resource) => <a className="material-resource-card" key={resource.id} href={resource.url || '#'} target="_blank" rel="noreferrer"><span>{resource.type || 'Link'}</span><strong>{resource.title}</strong>{resource.description ? <small>{resource.description}</small> : null}</a>)}</div></section> : null}
      {subject.glossary?.length ? <section className="material-reference-section"><div className="material-reference-heading"><span className="eyebrow">Quick reference</span><h3>Glossary</h3></div><dl className="material-glossary">{subject.glossary.map((item) => <div key={item.id}><dt>{item.term}</dt><dd>{item.definition}</dd></div>)}</dl></section> : null}
      {subject.formulas?.length ? <section className="material-reference-section"><div className="material-reference-heading"><span className="eyebrow">Quick reference</span><h3>Formulas</h3></div><div className="material-formula-grid">{subject.formulas.map((formula) => <article className="material-formula-card" key={formula.id}><strong>{formula.name}</strong><code>{formula.expression}</code>{formula.explanation ? <p>{formula.explanation}</p> : null}{formula.example ? <aside><b>Example</b><p>{formula.example}</p></aside> : null}</article>)}</div></section> : null}
    </div>
  );
}

export function MaterialReader({ subject }) {
  return (
    <section className="material-card" aria-labelledby={`${subject.id}-material-title`}>
      <div className="material-card__header"><div><span className="eyebrow">Course material</span><h2 id={`${subject.id}-material-title`}>Read, review, return</h2></div><span className="material-card__badge">{subject.materialType === 'legacy' ? 'Complete summary' : 'Starter notes'}</span></div>
      {subject.materialType === 'legacy' ? <><StructuredReader subject={subject} /><LegacyBUCReader /></> : <StructuredReader subject={subject} />}
    </section>
  );
}
