import { CHAPTER_SECTIONS } from '../lib/contentLibrary';
import { getBookmarkCount, getSectionProgress, getSubjectProgress } from '../lib/studyProfile';
import { FlashcardDeck } from './FlashcardDeck';
import { MaterialReader } from './MaterialReader';
import { NotesPanel } from './NotesPanel';
import { ProgressRing } from './ProgressRing';
import { QuizPanel } from './QuizPanel';

export function StudyWorkspace({ subject, profile, onToggleModule, onToggleBookmark, onReviewFlashcard, onQuizAnswer, onSaveNote, onOpenMenu }) {
  const progress = getSubjectProgress(profile, subject);
  const bookmarkCount = getBookmarkCount(profile, subject.id);
  const modules = subject.modules || [];
  const groupedModules = CHAPTER_SECTIONS.map((section) => ({
    ...section,
    modules: modules
      .map((module, index) => ({ module, index }))
      .filter(({ module }) => (module.section || 'course') === section.id),
  })).filter((section) => section.modules.length > 0);

  return (
    <main className={`workspace workspace--${subject.color}`}>
      <header className="mobile-header">
        <button type="button" className="icon-button" onClick={onOpenMenu} aria-label="Open subject menu">☰</button>
        <span className="mobile-header__brand">{subject.code}</span>
      </header>

      <section className="subject-hero">
        <div className="subject-hero__copy">
          <span className="eyebrow">{subject.eyebrow}</span>
          <h1>{subject.code} <span>{subject.name}</span></h1>
          <p>{subject.description}</p>
          <div className="subject-hero__chips"><span>✦ Flashcards</span><span>✓ Quick quiz</span><span>⌁ Personal notes</span></div>
        </div>
        <div className="subject-hero__progress">
          <ProgressRing percent={progress.percent} label={`${subject.code} complete`} />
          <div><strong>{progress.completed} of {progress.total}</strong><span>chapters completed</span></div>
        </div>
      </section>

      <section className="section-progress-grid" aria-label={`${subject.code} assessment progress`}>
        {CHAPTER_SECTIONS.map((section) => {
          const sectionProgress = getSectionProgress(profile, subject, section.id);
          return (
            <article className="section-progress-card" key={section.id}>
              <ProgressRing percent={sectionProgress.percent} compact label={`${section.label} progress`} />
              <div><span>{section.label}</span><strong>{sectionProgress.percent}%</strong><small>{sectionProgress.completed} of {sectionProgress.total} chapters</small></div>
            </article>
          );
        })}
      </section>

      <section className="module-card" aria-labelledby={`${subject.id}-modules-title`}>
        <div className="module-card__header"><div><span className="eyebrow">Study plan</span><h2 id={`${subject.id}-modules-title`}>Track what you understand</h2></div><span>{bookmarkCount} saved {bookmarkCount === 1 ? 'concept' : 'concepts'}</span></div>
        <div className="module-list">
          {groupedModules.map((section) => {
            const sectionProgress = getSectionProgress(profile, subject, section.id);
            return (
              <section className="module-section" key={section.id} aria-labelledby={`${subject.id}-${section.id}-title`}>
                <div className="module-section__heading"><div><span className="eyebrow">Assessment section</span><h3 id={`${subject.id}-${section.id}-title`}>{section.label}</h3></div><span>{sectionProgress.completed} / {sectionProgress.total} complete</span></div>
                <div className="module-section__list">
                  {section.modules.map(({ module, index }) => {
                    const done = Boolean(profile.progress[subject.id]?.[module.id]);
                    const bookmarked = Boolean(profile.bookmarks[subject.id]?.[module.id]);
                    return (
                      <article className={`module-item ${done ? 'module-item--done' : ''}`} key={module.id}>
                        <button type="button" className="module-check" onClick={() => onToggleModule(module.id)} aria-pressed={done} aria-label={`${done ? 'Mark incomplete' : 'Mark complete'}: ${module.title}`}><span>{done ? '✓' : index + 1}</span></button>
                        <div className="module-item__copy"><strong>{module.title}</strong><p>{module.subtitle}</p></div>
                        <span className="module-item__duration">{module.duration}</span>
                        <button type="button" className={`bookmark-button ${bookmarked ? 'bookmark-button--saved' : ''}`} onClick={() => onToggleBookmark(module.id)} aria-pressed={bookmarked} aria-label={`${bookmarked ? 'Remove' : 'Save'} ${module.title}`}>{bookmarked ? '★' : '☆'}</button>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {groupedModules.length === 0 ? <div className="module-empty"><strong>No chapters published yet.</strong><span>The administrator can add Course, Midterm, and Final chapters for this subject.</span></div> : null}
        </div>
      </section>

      <section className="tool-grid">
        <FlashcardDeck subject={subject} reviewedCards={profile.flashcardReviews[subject.id]} onReview={(cardId) => onReviewFlashcard(cardId)} />
        <QuizPanel subject={subject} quizStats={profile.quizAttempts[subject.id]} onAnswer={onQuizAnswer} />
        <NotesPanel subject={subject} note={profile.notes[subject.id]} onChange={onSaveNote} />
      </section>

      <MaterialReader subject={subject} />
    </main>
  );
}
