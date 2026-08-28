import { useEffect, useState } from 'react';
import { AdministratorPanel } from './components/AdministratorPanel';
import { GpaCalculator } from './components/GpaCalculator';
import { LandingPage } from './components/LandingPage';
import { Sidebar } from './components/Sidebar';
import { StudyWorkspace } from './components/StudyWorkspace';
import { SUBJECTS } from './data/courses';
import { useStudyProfile } from './hooks/useStudyProfile';
import { loadSharedContent, mergeSharedSubjects, normalizeSubjects } from './lib/contentLibrary';
import { recordQuizAttempt, reviewFlashcard, saveNote, toggleBookmark, toggleModule } from './lib/studyProfile';

const getInitialTheme = () => window.localStorage.getItem('ag-project-theme') || 'light';

export default function App() {
  const [view, setView] = useState('home');
  const [subjects, setSubjects] = useState(() => normalizeSubjects(SUBJECTS));
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const { profile, updateProfile } = useStudyProfile();
  const subject = selectedSubject ? subjects.find((candidate) => candidate.id === selectedSubject) : null;

  useEffect(() => {
    loadSharedContent()
      .then((shared) => setSubjects(mergeSharedSubjects(SUBJECTS, shared.subjects)))
      .catch(() => {
        // The bundled subjects remain available if the optional shared file is unavailable.
      });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('ag-project-theme', theme);
  }, [theme]);

  const chooseSubject = (subjectId) => {
    setView('study');
    setSelectedSubject(subjectId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goHome = () => {
    setView('home');
    setSelectedSubject(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openGpa = () => {
    setView('gpa');
    setSelectedSubject(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAdministrator = () => {
    setView('admin');
    setSelectedSubject(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePublished = (publishedSubjects) => {
    setSubjects(mergeSharedSubjects(SUBJECTS, publishedSubjects));
  };

  return (
    <div className="app-shell">
      <Sidebar
        subjects={subjects}
        selectedSubject={selectedSubject}
        profile={profile}
        onSelect={chooseSubject}
        onHome={goHome}
        activeView={view}
        onOpenGpa={openGpa}
        onOpenAdministrator={openAdministrator}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        theme={theme}
        onThemeToggle={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
      />
      <div className="app-content">
        {view === 'gpa' ? <GpaCalculator onOpenMenu={() => setMobileMenuOpen(true)} /> : null}
        {view === 'admin' ? <AdministratorPanel subjects={subjects} profile={profile} onUpdateProfile={updateProfile} onPublished={handlePublished} onClose={goHome} /> : null}
        {view === 'study' && subject ? (
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
        ) : view === 'home' ? <LandingPage subjects={subjects} profile={profile} onChooseSubject={chooseSubject} onOpenMenu={() => setMobileMenuOpen(true)} /> : null}
      </div>
    </div>
  );
}
