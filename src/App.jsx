import { useEffect, useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { LandingPage } from './components/LandingPage';
import { Sidebar } from './components/Sidebar';
import { StudyWorkspace } from './components/StudyWorkspace';
import { useSubjectCatalog } from './hooks/useSubjectCatalog';
import { useStudyProfile } from './hooks/useStudyProfile';
import { clearMistake, recordExamAttempt, recordQuizResult, reviewFlashcard, saveNote, toggleBookmark, toggleModule } from './lib/studyProfile';

const getInitialTheme = () => window.localStorage.getItem('ag-project-theme') || 'light';

export default function App() {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const [language, setLanguage] = useState(() => window.localStorage.getItem('ag-project-language') || 'en');
  const { subjects, contentStatus, replaceSubjects } = useSubjectCatalog();
  const { profile, updateProfile, session, startSignIn, signOut } = useStudyProfile();
  const publicSubjects = subjects.filter((candidate) => !candidate.archived);
  const subject = selectedSubject ? publicSubjects.find((candidate) => candidate.id === selectedSubject) : null;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('ag-project-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    window.localStorage.setItem('ag-project-language', language);
  }, [language]);

  const chooseSubject = (subjectId) => {
    setSelectedSubject(subjectId);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goHome = () => {
    setSelectedSubject(null);
    setAdminOpen(false);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAdmin = () => {
    setAdminOpen(true);
    setSelectedSubject(null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeAdmin = () => {
    setAdminOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-shell" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Sidebar
        subjects={publicSubjects}
        selectedSubject={selectedSubject}
        profile={profile}
        onSelect={chooseSubject}
        onHome={goHome}
        onOpenAdmin={openAdmin}
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        theme={theme}
        onThemeToggle={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
        language={language}
        onLanguageToggle={() => setLanguage((current) => current === 'en' ? 'ar' : 'en')}
      />
      <div className="app-content">
        {adminOpen ? (
          <AdminPanel
            subjects={subjects}
            session={session}
            language={language}
            onSignIn={startSignIn}
            onSignOut={signOut}
            onClose={closeAdmin}
            onSubjectsSaved={replaceSubjects}
            contentStatus={contentStatus}
          />
        ) : subject ? (
          <StudyWorkspace
            subject={subject}
            profile={profile}
            language={language}
            onToggleModule={(moduleId) => updateProfile((current) => toggleModule(current, subject.id, moduleId))}
            onToggleBookmark={(moduleId) => updateProfile((current) => toggleBookmark(current, subject.id, moduleId))}
            onReviewFlashcard={(cardId, rating) => updateProfile((current) => reviewFlashcard(current, subject.id, cardId, rating))}
            onQuizAnswer={(result) => updateProfile((current) => recordQuizResult(current, subject.id, result.question, result.selected))}
            onSaveNote={(note) => updateProfile((current) => saveNote(current, subject.id, note))}
            onClearMistake={(mistakeId) => updateProfile((current) => clearMistake(current, subject.id, mistakeId))}
            onExamComplete={(result) => updateProfile((current) => recordExamAttempt(current, subject.id, result))}
            onOpenMenu={() => setMobileMenuOpen(true)}
          />
        ) : <LandingPage subjects={publicSubjects} profile={profile} language={language} onChooseSubject={chooseSubject} onOpenMenu={() => setMobileMenuOpen(true)} />}
      </div>
    </div>
  );
}
