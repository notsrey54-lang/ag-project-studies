import { useEffect, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { Sidebar } from './components/Sidebar';
import { StudyWorkspace } from './components/StudyWorkspace';
import { getSubject } from './data/courses';
import { useStudyProfile } from './hooks/useStudyProfile';
import { recordQuizAttempt, reviewFlashcard, saveNote, toggleBookmark, toggleModule } from './lib/studyProfile';

const getInitialTheme = () => window.localStorage.getItem('ag-project-theme') || 'light';

export default function App() {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const { profile, updateProfile, session, startSignIn, signOut, syncNow } = useStudyProfile();
  const subject = selectedSubject ? getSubject(selectedSubject) : null;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('ag-project-theme', theme);
  }, [theme]);

  const chooseSubject = (subjectId) => {
    setSelectedSubject(subjectId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goHome = () => {
    setSelectedSubject(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-shell">
      <Sidebar
        selectedSubject={selectedSubject}
        profile={profile}
        onSelect={chooseSubject}
        onHome={goHome}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        theme={theme}
        onThemeToggle={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
        session={session}
        onSignIn={startSignIn}
        onSignOut={signOut}
        onSync={syncNow}
      />
      <div className="app-content">
        {subject ? (
          <StudyWorkspace
            subject={subject}
            profile={profile}
            onToggleModule={(moduleId) => updateProfile((current) => toggleModule(current, subject.id, moduleId))}
            onToggleBookmark={(moduleId) => updateProfile((current) => toggleBookmark(current, subject.id, moduleId))}
            onReviewFlashcard={(cardId) => updateProfile((current) => reviewFlashcard(current, subject.id, cardId))}
            onQuizAnswer={(correct) => updateProfile((current) => recordQuizAttempt(current, subject.id, correct))}
            onSaveNote={(note) => updateProfile((current) => saveNote(current, subject.id, note))}
            onOpenMenu={() => setMobileMenuOpen(true)}
          />
        ) : <LandingPage profile={profile} onChooseSubject={chooseSubject} onOpenMenu={() => setMobileMenuOpen(true)} />}
      </div>
    </div>
  );
}
