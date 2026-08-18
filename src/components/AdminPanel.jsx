import { useEffect, useMemo, useState } from 'react';
import {
  cloneSubjects,
  createFlashcardDraft,
  createMaterialDraft,
  createModuleDraft,
  createQuestionDraft,
  createSubjectDraft,
  normalizeContentDocument,
} from '../lib/contentModel';

const DRAFT_KEY = 'ag-project-admin-draft';

const pointsToText = (points = []) => points.map(([term, explanation]) => `${term} :: ${explanation}`).join('\n');
const textToPoints = (value) => String(value || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
  const [term, ...rest] = line.split('::');
  return [term.trim(), rest.join('::').trim() || term.trim()];
});

const Field = ({ label, value, onChange, placeholder, dir }) => (
  <label className="admin-field"><span className="field-label">{label}</span><input className="admin-input" value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} dir={dir} /></label>
);

const Area = ({ label, value, onChange, placeholder, rows = 4, dir }) => (
  <label className="admin-field admin-field--wide"><span className="field-label">{label}</span><textarea className="admin-input admin-textarea" value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} dir={dir} /></label>
);

function EditorSection({ title, description, children, action }) {
  return <section className="admin-editor-section"><div className="admin-section-heading"><div><span className="eyebrow">Content builder</span><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>{children}</section>;
}

export function AdminPanel({ subjects, session, onSignIn, onSignOut, onClose, onSubjectsSaved, contentStatus }) {
  const initialDraft = useMemo(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(DRAFT_KEY));
      if (saved?.subjects?.length) return cloneSubjects(saved.subjects);
    } catch {
      // Ignore an incomplete local draft and use the published catalogue.
    }
    return cloneSubjects(subjects);
  }, [subjects]);
  const [draftSubjects, setDraftSubjects] = useState(initialDraft);
  const [selectedId, setSelectedId] = useState(initialDraft[0]?.id || null);
  const [section, setSection] = useState('subject');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraftSubjects(initialDraft);
    setSelectedId((current) => initialDraft.some((subject) => subject.id === current) ? current : initialDraft[0]?.id || null);
  }, [initialDraft]);

  const current = draftSubjects.find((subject) => subject.id === selectedId) || null;

  const updateSubject = (patch) => setDraftSubjects((items) => items.map((subject) => subject.id === selectedId ? { ...subject, ...patch } : subject));
  const updateArrayItem = (field, itemId, patch) => updateSubject({ [field]: (current?.[field] || []).map((item) => item.id === itemId ? { ...item, ...patch } : item) });
  const removeArrayItem = (field, itemId) => updateSubject({ [field]: (current?.[field] || []).filter((item) => item.id !== itemId) });

  const addSubject = () => {
    const next = createSubjectDraft(draftSubjects.length);
    setDraftSubjects((items) => [...items, next]);
    setSelectedId(next.id);
    setSection('subject');
    setStatus('New subject added to this draft.');
  };

  const duplicateSubject = () => {
    if (!current) return;
    const copy = { ...JSON.parse(JSON.stringify(current)), id: `${current.id}-copy`, code: `${current.code}-COPY`, name: `${current.name} copy` };
    setDraftSubjects((items) => [...items, copy]);
    setSelectedId(copy.id);
  };

  const archiveCurrent = () => updateSubject({ archived: !current.archived });

  const saveDraft = () => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(normalizeContentDocument({ subjects: draftSubjects })));
    setStatus('Draft saved on this device.');
  };

  const resetDraft = () => {
    const next = cloneSubjects(subjects);
    setDraftSubjects(next);
    setSelectedId(next[0]?.id || null);
    window.localStorage.removeItem(DRAFT_KEY);
    setStatus('Draft reset to the latest published content.');
  };

  const exportDraft = () => {
    const contentDocument = normalizeContentDocument({ subjects: draftSubjects });
    const blob = new Blob([JSON.stringify(contentDocument, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ag-project-subjects.json';
    link.click();
    URL.revokeObjectURL(url);
    setStatus('Content JSON exported.');
  };

  const publish = async () => {
    if (session.status !== 'signed-in') {
      setStatus('Sign in with your admin GitHub account before publishing.');
      onSignIn();
      return;
    }
    setBusy(true);
    setStatus('Publishing to GitHub…');
    try {
      const document = normalizeContentDocument({ subjects: draftSubjects });
      const response = await fetch('/.netlify/functions/content-publish', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document, message: `Update study content (${new Date().toLocaleDateString()})` }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Publishing is not configured yet.');
      onSubjectsSaved(document.subjects);
      window.localStorage.removeItem(DRAFT_KEY);
      setStatus('Published. Netlify will deploy this content for everyone shortly.');
    } catch (error) {
      setStatus(error.message || 'The content could not be published. Your local draft is still safe.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin-page">
      <header className="admin-page__header">
        <div><span className="eyebrow">Private workspace</span><h1>Content builder</h1><p>Create subjects, chapters, notes, flashcards, and quizzes without editing React code.</p></div>
        <div className="admin-page__header-actions"><button type="button" className="secondary-button" onClick={onClose}>← Back to study site</button>{session.status === 'signed-in' && <button type="button" className="text-button" onClick={onSignOut}>Sign out admin</button>}</div>
      </header>

      <section className="admin-toolbar" aria-live="polite">
        <span className={`admin-status-dot admin-status-dot--${contentStatus}`} />
        <span>{status || (session.status === 'signed-in' ? `Signed in as ${session.user?.login || 'admin'}.` : 'Publishing requires your GitHub admin sign-in.')}</span>
        <div className="admin-toolbar__actions"><button type="button" className="text-button" onClick={saveDraft}>Save draft</button><button type="button" className="text-button" onClick={exportDraft}>Export JSON</button><button type="button" className="text-button" onClick={resetDraft}>Reset</button><button type="button" className="primary-button primary-button--small" onClick={publish} disabled={busy}>{busy ? 'Publishing…' : 'Publish to GitHub'}</button></div>
      </section>

      <div className="admin-layout">
        <aside className="admin-subjects" aria-label="Content subjects">
          <div className="admin-subjects__heading"><div><span className="eyebrow">Catalogue</span><h2>Subjects</h2></div><button type="button" className="round-button" onClick={addSubject} aria-label="Add subject">+</button></div>
          <div className="admin-subject-list">{draftSubjects.map((subject) => <button type="button" key={subject.id} className={`admin-subject-row ${subject.id === selectedId ? 'admin-subject-row--active' : ''} ${subject.archived ? 'admin-subject-row--archived' : ''}`} onClick={() => { setSelectedId(subject.id); setSection('subject'); }}><span><strong>{subject.code}</strong><small>{subject.name}</small></span><b>{subject.archived ? 'Archived' : `${subject.modules.length} chapters`}</b></button>)}</div>
        </aside>

        {current ? (
          <div className="admin-editor">
            <div className="admin-editor__top"><div><span className="eyebrow">Editing</span><h2>{current.code} · {current.name}</h2></div><div className="admin-editor__top-actions"><button type="button" className="text-button" onClick={duplicateSubject}>Duplicate</button><button type="button" className="text-button" onClick={archiveCurrent}>{current.archived ? 'Restore subject' : 'Archive subject'}</button></div></div>
            <nav className="admin-tabs" aria-label="Editor sections">{[['subject', 'Subject'], ['chapters', 'Chapters'], ['notes', 'Notes'], ['cards', 'Flashcards'], ['quiz', 'Quiz']].map(([id, label]) => <button type="button" key={id} className={section === id ? 'admin-tab admin-tab--active' : 'admin-tab'} onClick={() => setSection(id)}>{label}</button>)}</nav>

            {section === 'subject' && <EditorSection title="Subject identity" description="This information appears in the left panel, landing page, and subject header."><div className="admin-form-grid"><Field label="Code" value={current.code} onChange={(value) => updateSubject({ code: value, id: current.id === current.code ? value : current.id })} placeholder="ECO101" /><Field label="Color" value={current.color} onChange={(value) => updateSubject({ color: value })} placeholder="gold / green / blue" /><Field label="English name" value={current.name} onChange={(value) => updateSubject({ name: value })} placeholder="Principles of Economics" /><Field label="Arabic name" value={current.nameAr} onChange={(value) => updateSubject({ nameAr: value })} placeholder="مبادئ الاقتصاد" dir="rtl" /><Field label="Short name" value={current.shortName} onChange={(value) => updateSubject({ shortName: value })} placeholder="Economics" /><Field label="Arabic short name" value={current.shortNameAr} onChange={(value) => updateSubject({ shortNameAr: value })} placeholder="اقتصاد" dir="rtl" /><Field label="Eyebrow" value={current.eyebrow} onChange={(value) => updateSubject({ eyebrow: value })} placeholder="Your economics starter" /><Field label="Arabic eyebrow" value={current.eyebrowAr} onChange={(value) => updateSubject({ eyebrowAr: value })} placeholder="مساحتك الدراسية" dir="rtl" /><Area label="English description" value={current.description} onChange={(value) => updateSubject({ description: value })} placeholder="What will this subject help students understand?" rows={3} /><Area label="Arabic description" value={current.descriptionAr} onChange={(value) => updateSubject({ descriptionAr: value })} placeholder="وصف المادة" rows={3} dir="rtl" /></div><div className="admin-tool-picker"><span className="field-label">Reusable subject tools</span><label><input type="checkbox" checked={current.tools?.includes('economics')} onChange={(event) => updateSubject({ tools: event.target.checked ? [...new Set([...(current.tools || []), 'economics'])] : (current.tools || []).filter((tool) => tool !== 'economics') })} /> Economics graph and formula lab</label></div></EditorSection>}

            {section === 'chapters' && <EditorSection title="Chapters and modules" description="Chapters control the progress checklist and give students a clear route through the subject." action={<button type="button" className="secondary-button secondary-button--small" onClick={() => updateSubject({ modules: [...(current.modules || []), createModuleDraft(current.id, current.modules?.length || 0)] })}>+ Add chapter</button>}><div className="admin-repeat-list">{(current.modules || []).map((module, index) => <article className="admin-repeat-card" key={module.id}><div className="admin-repeat-card__heading"><strong>Chapter {index + 1}</strong><button type="button" className="icon-button icon-button--small" onClick={() => removeArrayItem('modules', module.id)} aria-label="Remove chapter">×</button></div><div className="admin-form-grid"><Field label="Title" value={module.title} onChange={(value) => updateArrayItem('modules', module.id, { title: value })} placeholder="Chapter 1" /><Field label="Arabic title" value={module.titleAr} onChange={(value) => updateArrayItem('modules', module.id, { titleAr: value })} placeholder="الفصل الأول" dir="rtl" /><Field label="Subtitle" value={module.subtitle} onChange={(value) => updateArrayItem('modules', module.id, { subtitle: value })} placeholder="Core concepts" /><Field label="Arabic subtitle" value={module.subtitleAr} onChange={(value) => updateArrayItem('modules', module.id, { subtitleAr: value })} placeholder="المفاهيم الأساسية" dir="rtl" /><Field label="Duration" value={module.duration} onChange={(value) => updateArrayItem('modules', module.id, { duration: value })} placeholder="15 min" /></div></article>)}{!current.modules?.length && <div className="empty-state"><strong>No chapters yet.</strong><p>Add the first chapter to create a study path.</p></div>}</div></EditorSection>}

            {section === 'notes' && <EditorSection title="Lesson notes" description="Add structured notes. Students see the English or Arabic field when available." action={<button type="button" className="secondary-button secondary-button--small" onClick={() => updateSubject({ materials: [...(current.materials || []), createMaterialDraft(current.id, current.materials?.length || 0)] })}>+ Add lesson</button>}><div className="admin-repeat-list">{(current.materials || []).map((material, index) => <article className="admin-repeat-card" key={material.id}><div className="admin-repeat-card__heading"><strong>Lesson {index + 1}</strong><button type="button" className="icon-button icon-button--small" onClick={() => removeArrayItem('materials', material.id)} aria-label="Remove lesson">×</button></div><div className="admin-form-grid"><Field label="Title" value={material.title} onChange={(value) => updateArrayItem('materials', material.id, { title: value })} placeholder="Key concept" /><Field label="Arabic title" value={material.titleAr} onChange={(value) => updateArrayItem('materials', material.id, { titleAr: value })} placeholder="المفهوم" dir="rtl" /><Area label="Summary" value={material.summary} onChange={(value) => updateArrayItem('materials', material.id, { summary: value })} placeholder="Explain the main idea in simple words." rows={4} /><Area label="Arabic summary" value={material.summaryAr} onChange={(value) => updateArrayItem('materials', material.id, { summaryAr: value })} placeholder="شرح الفكرة بالعربية" rows={4} dir="rtl" /><Area label="Key points" value={pointsToText(material.points)} onChange={(value) => updateArrayItem('materials', material.id, { points: textToPoints(value) })} placeholder="Term :: explanation (one per line)" rows={4} /><Area label="النقاط الرئيسية" value={pointsToText(material.pointsAr)} onChange={(value) => updateArrayItem('materials', material.id, { pointsAr: textToPoints(value) })} placeholder="المصطلح :: الشرح (سطر لكل نقطة)" rows={4} dir="rtl" /><Area label="Example" value={material.example} onChange={(value) => updateArrayItem('materials', material.id, { example: value })} placeholder="Give a concrete example." rows={3} /><Area label="Arabic example" value={material.exampleAr} onChange={(value) => updateArrayItem('materials', material.id, { exampleAr: value })} placeholder="مثال بالعربية" rows={3} dir="rtl" /></div></article>)}{!current.materials?.length && <div className="empty-state"><strong>No lessons yet.</strong><p>Add notes here instead of editing the source code.</p></div>}</div></EditorSection>}

            {section === 'cards' && <EditorSection title="Flashcards" description="Keep each card focused on one definition, rule, example, or comparison." action={<button type="button" className="secondary-button secondary-button--small" onClick={() => updateSubject({ flashcards: [...(current.flashcards || []), createFlashcardDraft(current.id, current.flashcards?.length || 0)] })}>+ Add card</button>}><div className="admin-repeat-list">{(current.flashcards || []).map((card, index) => <article className="admin-repeat-card" key={card.id}><div className="admin-repeat-card__heading"><strong>Card {index + 1}</strong><button type="button" className="icon-button icon-button--small" onClick={() => removeArrayItem('flashcards', card.id)} aria-label="Remove flashcard">×</button></div><div className="admin-form-grid"><Area label="Question" value={card.prompt} onChange={(value) => updateArrayItem('flashcards', card.id, { prompt: value })} placeholder="What is…?" rows={3} /><Area label="Answer" value={card.answer} onChange={(value) => updateArrayItem('flashcards', card.id, { answer: value })} placeholder="The answer…" rows={3} /><Area label="السؤال بالعربية" value={card.promptAr} onChange={(value) => updateArrayItem('flashcards', card.id, { promptAr: value })} placeholder="ما هو...؟" rows={3} dir="rtl" /><Area label="الإجابة بالعربية" value={card.answerAr} onChange={(value) => updateArrayItem('flashcards', card.id, { answerAr: value })} placeholder="الإجابة..." rows={3} dir="rtl" /><Field label="Label" value={card.label} onChange={(value) => updateArrayItem('flashcards', card.id, { label: value })} placeholder="Chapter 1" /></div></article>)}{!current.flashcards?.length && <div className="empty-state"><strong>No flashcards yet.</strong><p>Add a card or use the future AI generator after the non-AI platform is stable.</p></div>}</div></EditorSection>}

            {section === 'quiz' && <EditorSection title="Quiz question bank" description="Create reusable questions now; the exam simulator will draw from this bank." action={<button type="button" className="secondary-button secondary-button--small" onClick={() => updateSubject({ quiz: [...(current.quiz || []), createQuestionDraft(current.id, current.quiz?.length || 0)] })}>+ Add question</button>}><div className="admin-repeat-list">{(current.quiz || []).map((question, index) => <article className="admin-repeat-card" key={question.id}><div className="admin-repeat-card__heading"><strong>Question {index + 1}</strong><button type="button" className="icon-button icon-button--small" onClick={() => removeArrayItem('quiz', question.id)} aria-label="Remove question">×</button></div><div className="admin-form-grid"><Area label="Question" value={question.prompt} onChange={(value) => updateArrayItem('quiz', question.id, { prompt: value })} placeholder="Write the question" rows={3} /><Area label="Arabic question" value={question.promptAr} onChange={(value) => updateArrayItem('quiz', question.id, { promptAr: value })} placeholder="اكتب السؤال" rows={3} dir="rtl" />{question.options.map((option, optionIndex) => <Field key={`${question.id}-option-${optionIndex}`} label={`Option ${String.fromCharCode(65 + optionIndex)}${optionIndex === question.answer ? ' · correct' : ''}`} value={option} onChange={(value) => updateArrayItem('quiz', question.id, { options: question.options.map((item, itemIndex) => itemIndex === optionIndex ? value : item) })} placeholder="Answer choice" />)}<label className="admin-field"><span className="field-label">Correct answer</span><select className="admin-input" value={question.answer} onChange={(event) => updateArrayItem('quiz', question.id, { answer: Number(event.target.value) })}>{question.options.map((_, optionIndex) => <option key={optionIndex} value={optionIndex}>Option {String.fromCharCode(65 + optionIndex)}</option>)}</select></label><label className="admin-field"><span className="field-label">Difficulty</span><select className="admin-input" value={question.difficulty || 'medium'} onChange={(event) => updateArrayItem('quiz', question.id, { difficulty: event.target.value })}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="evil">Evil</option></select></label><Area label="Explanation" value={question.explanation} onChange={(value) => updateArrayItem('quiz', question.id, { explanation: value })} placeholder="Explain why the correct answer is correct." rows={3} /><Area label="Arabic explanation" value={question.explanationAr} onChange={(value) => updateArrayItem('quiz', question.id, { explanationAr: value })} placeholder="اشرح الإجابة بالعربية" rows={3} dir="rtl" /></div></article>)}{!current.quiz?.length && <div className="empty-state"><strong>No quiz questions yet.</strong><p>Add questions for quick practice and mock exams.</p></div>}</div></EditorSection>}
          </div>
        ) : <div className="admin-empty"><h2>Create your first subject</h2><p>Use the plus button to start your shared catalogue.</p><button type="button" className="primary-button" onClick={addSubject}>Add subject</button></div>}
      </div>
    </main>
  );
}
