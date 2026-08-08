import { SUBJECTS } from '../data/courses';
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

export function Sidebar({ selectedSubject, profile, onSelect, onHome, mobileOpen, onClose, theme, onThemeToggle, session, onSignIn, onSignOut, onSync }) {
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
          {SUBJECTS.map((subject) => (
            <SubjectButton key={subject.id} subject={subject} selectedSubject={selectedSubject} profile={profile} onSelect={onSelect} />
          ))}
        </nav>

        <div className="sidebar__lower">
          <section className="sync-card" aria-live="polite">
            <div className="sync-card__top">
              <span className="sync-card__icon" aria-hidden="true">{session.status === 'signed-in' || session.status === 'syncing' ? '☁' : '⌂'}</span>
              <div>
                <strong>{session.status === 'signed-in' || session.status === 'syncing' ? 'Study sync' : 'This device'}</strong>
                <p>{session.message}</p>
              </div>
            </div>
            {session.status === 'signed-in' || session.status === 'syncing' ? (
              <div className="sync-card__actions">
                <button type="button" className="text-button" onClick={onSync}>Sync now</button>
                <button type="button" className="text-button" onClick={onSignOut}>Sign out</button>
              </div>
            ) : (
              <>
                <button type="button" className="sync-card__button" onClick={onSignIn}>Sign in with GitHub</button>
                <p className="sync-card__privacy">Sync uses a secret GitHub Gist. Avoid putting sensitive information in notes.</p>
              </>
            )}
          </section>

          <button type="button" className="theme-button" onClick={onThemeToggle}>
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '◐'}</span>
            {theme === 'dark' ? 'Use light view' : 'Use dark view'}
          </button>
        </div>
      </aside>
    </>
  );
}
