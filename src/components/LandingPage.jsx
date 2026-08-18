import { localizeField } from '../lib/contentModel';
import { getSubjectProgress } from '../lib/studyProfile';
import { ProgressRing } from './ProgressRing';

export function LandingPage({ subjects, profile, language, onChooseSubject, onOpenMenu }) {
  const completed = subjects.reduce((total, subject) => total + getSubjectProgress(profile, subject).completed, 0);
  const total = subjects.reduce((sum, subject) => sum + subject.modules.length, 0);
  const percent = total ? Math.round((completed / total) * 100) : 0;

  return (
    <main className="landing">
      <header className="mobile-header">
        <button type="button" className="icon-button" onClick={onOpenMenu} aria-label="Open subject menu">☰</button>
        <span className="mobile-header__brand">AG Project</span>
      </header>

      <section className="welcome-hero">
        <div className="welcome-hero__copy">
          <span className="eyebrow">A calmer way to revise</span>
          <h1>AG Project</h1>
          <p className="welcome-hero__lead">{language === 'ar' ? 'سعيدون برؤيتكم تدرسون من موقعي. رتّبوا ملاحظاتكم واختبروا ذاكرتكم خطوة بخطوة.' : 'Happy to see you studying from my site. Keep your notes, test your memory, and build progress one focused step at a time.'}</p>
          <div className="welcome-hero__callout">
            <span aria-hidden="true">←</span>
            <p>{language === 'ar' ? 'ابدأوا الدراسة بالضغط على المادة من الجانب.' : 'Start studying by pressing on the side.'}</p>
          </div>
          <div className="welcome-hero__actions">
            <button type="button" className="primary-button" onClick={() => onChooseSubject(subjects[0]?.id)}>Continue studying <span aria-hidden="true">→</span></button>
            <button type="button" className="secondary-button" onClick={onOpenMenu}>{language === 'ar' ? 'عرض المواد' : 'View subjects'}</button>
          </div>
        </div>
        <div className="welcome-hero__visual" aria-hidden="true">
          <div className="study-orbit study-orbit--one" />
          <div className="study-orbit study-orbit--two" />
          <div className="study-desk-card">
            <div className="study-desk-card__tabs"><span /><span /><span /></div>
            <div className="study-desk-card__lines"><i /><i /><i /><i /></div>
            <div className="study-desk-card__check"><span>✓</span><p>One useful step</p></div>
          </div>
          <div className="floating-tag floating-tag--focus">Focused review</div>
          <div className="floating-tag floating-tag--ready">Ready when you are</div>
        </div>
      </section>

      <section className="landing-grid" aria-label="Study overview">
        <article className="overview-card overview-card--progress">
          <div>
            <span className="eyebrow">Your momentum</span>
            <h2>{completed === 0 ? 'Make your first mark today.' : 'You are building real progress.'}</h2>
            <p>{completed} of {total} learning sections completed.</p>
          </div>
          <ProgressRing percent={percent} />
        </article>
        <article className="overview-card overview-card--tip">
          <span className="tip-icon" aria-hidden="true">✦</span>
          <div>
            <span className="eyebrow">Study tip</span>
            <h2>Test yourself before rereading.</h2>
            <p>Flip a few flashcards or take a quick quiz to find the topics that need your attention.</p>
          </div>
        </article>
      </section>

      <section className="subject-showcase">
        <div className="section-heading">
          <div><span className="eyebrow">Your study shelf</span><h2>Choose your next subject</h2></div>
          <p>Each space includes materials, quick practice, notes, and a clear progress view.</p>
        </div>
        <div className="subject-showcase__grid">
          {subjects.map((subject) => {
            const progress = getSubjectProgress(profile, subject);
            return (
              <button key={subject.id} type="button" className={`showcase-card showcase-card--${subject.color}`} onClick={() => onChooseSubject(subject.id)}>
                <span className="showcase-card__code">{subject.code}</span>
                <h3>{localizeField(subject.name, subject.nameAr, language)}</h3>
                <p>{localizeField(subject.description, subject.descriptionAr, language)}</p>
                <span className="showcase-card__footer"><span>{progress.percent}% complete</span><b>Open subject →</b></span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
