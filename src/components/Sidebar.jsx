import { getSubjectProgress } from '../lib/studyProfile';
import { ProgressRing } from './ProgressRing';

function SubjectButton({ subject, selectedSubject, profile, onSelect }) {
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
        <small>{subject.shortName}</small>
      </span>
      <ProgressRing percent={progress.percent} compact />
    </button>
  );
}

export function Sidebar({ subjects, selectedSubject, profile, onSelect, onHome, activeView, onOpenGpa, onOpenAdministrator, mobileOpen, onClose, theme, onThemeToggle }) {
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
            <SubjectButton key={subject.id} subject={subject} selectedSubject={selectedSubject} profile={profile} onSelect={onSelect} />
          ))}
        </nav>

        <div className="sidebar__tools">
          <span className="eyebrow">Study tools</span>
          <button type="button" className={`sidebar-tool-button ${activeView === 'gpa' ? 'sidebar-tool-button--active' : ''}`} onClick={onOpenGpa}><span aria-hidden="true">Σ</span><span><strong>GPA Calculator</strong><small>Terms, targets, projections</small></span></button>
        </div>

        <div className="sidebar__lower">
          <section className="sync-card" aria-live="polite">
            <div className="sync-card__top">
              <span className="sync-card__icon" aria-hidden="true">⌂</span>
              <div>
                <strong>This device</strong>
                <p>Your progress is saved on this device.</p>
              </div>
            </div>
          </section>

          <button type="button" className={`administrator-button ${activeView === 'admin' ? 'administrator-button--active' : ''}`} onClick={onOpenAdministrator}><span aria-hidden="true">⌘</span><span><strong>Administrator</strong><small>Manage university content</small></span></button>

          <button type="button" className="theme-button" onClick={onThemeToggle}>
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '◐'}</span>
            {theme === 'dark' ? 'Use light view' : 'Use dark view'}
          </button>
        </div>
      </aside>
    </>
  );
}
