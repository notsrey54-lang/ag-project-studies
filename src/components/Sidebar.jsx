import { localizeField } from '../lib/contentModel';
import { getSubjectProgress } from '../lib/studyProfile';

function SubjectButton({ subject, selectedSubject, profile, onSelect, language }) {
  const progress = getSubjectProgress(profile, subject);
  const isSelected = selectedSubject === subject.id;

  return (
    <button
      type="button"
      className={`subject-button ${isSelected ? 'subject-button--active' : ''} subject-button--${subject.color}`}
      onClick={() => onSelect(subject.id)}
      aria-current={isSelected ? 'page' : undefined}
    >
      <span className="subject-button__icon" aria-hidden="true">{subject.id === 'BUC111' ? '✦' : '◒'}</span>
      <span className="subject-button__copy">
        <strong>{subject.code}</strong>
        <small>{localizeField(subject.shortName, subject.shortNameAr, language)}</small>
      </span>
      <span className="subject-button__meta">{progress.completed}/{progress.total}</span>
    </button>
  );
}

export function Sidebar({ subjects, selectedSubject, profile, onSelect, onHome, onOpenAdmin, mobileOpen, onClose, theme, onThemeToggle, language, onLanguageToggle }) {
  return (
    <>
      <button className={`sidebar-backdrop ${mobileOpen ? 'sidebar-backdrop--visible' : ''}`} aria-label="Close subject menu" onClick={onClose} />
      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`} aria-label="Study navigation">
        <div className="sidebar__brand-row">
          <button type="button" className="brand" onClick={onHome} aria-label="Go to AG Project home">
            <span className="brand__mark">AG</span>
            <span><strong>AG Project</strong><small>Study space</small></span>
          </button>
          <button className="icon-button sidebar__close" type="button" onClick={onClose} aria-label="Close navigation">×</button>
        </div>

        <div className="sidebar__welcome">
          <span className="eyebrow">Your subjects</span>
          <p>Choose a subject and pick up exactly where you stopped.</p>
        </div>

        <nav className="subject-list" aria-label="Subjects">
          {subjects.map((subject) => (
            <SubjectButton key={subject.id} subject={subject} selectedSubject={selectedSubject} profile={profile} onSelect={onSelect} language={language} />
          ))}
        </nav>

        <div className="sidebar__lower">
          <section className="sync-card sync-card--local" aria-live="polite">
            <div className="sync-card__top">
              <span className="sync-card__icon" aria-hidden="true">⌂</span>
              <div>
                <strong>This device</strong>
                <p>Your progress is saved automatically on this device.</p>
              </div>
            </div>
          </section>

          <button type="button" className="admin-link" onClick={onOpenAdmin}><span aria-hidden="true">⚙</span> Manage content</button>
          <button type="button" className="language-button" onClick={onLanguageToggle}><span aria-hidden="true">文</span>{language === 'ar' ? 'English view' : 'العربية'}</button>
          <button type="button" className="theme-button" onClick={onThemeToggle}>
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '◐'}</span>
            {theme === 'dark' ? 'Use light view' : 'Use dark view'}
          </button>
        </div>
      </aside>
    </>
  );
}
