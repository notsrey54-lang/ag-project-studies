import { localizeField } from '../lib/contentModel';

export function MistakeBook({ subject, mistakes = [], onClear, language = 'en' }) {
  return (
    <section className="tool-card mistake-book" aria-labelledby={`${subject.id}-mistakes-title`}>
      <div className="tool-card__heading">
        <div><span className="eyebrow">Targeted revision</span><h3 id={`${subject.id}-mistakes-title`}>Mistake book</h3></div>
        <span className="tool-card__counter">{mistakes.length}</span>
      </div>
      {mistakes.length === 0 ? (
        <div className="empty-state"><strong>No mistakes saved.</strong><p>Wrong quiz answers will appear here so you can revise the exact weak points.</p></div>
      ) : (
        <div className="mistake-list">
          {mistakes.slice(0, 8).map((mistake) => (
            <article className="mistake-item" key={mistake.id}>
              <div className="mistake-item__top"><span>Review question</span><button type="button" className="icon-button icon-button--small" onClick={() => onClear(mistake.id)} aria-label="Remove mistake from book">×</button></div>
              <strong>{localizeField(mistake.prompt, mistake.promptAr, language)}</strong>
              <p><b>{language === 'ar' ? 'الإجابة الصحيحة:' : 'Correct:'}</b> {(language === 'ar' && mistake.optionsAr?.[mistake.correctAnswer]) || mistake.options?.[mistake.correctAnswer] || (language === 'ar' ? 'راجعوا الشرح' : 'See explanation')}</p>
              <small>{localizeField(mistake.explanation, mistake.explanationAr, language)}</small>
            </article>
          ))}
          {mistakes.length > 8 && <p className="tool-card__description">Showing the latest 8 mistakes.</p>}
        </div>
      )}
    </section>
  );
}
