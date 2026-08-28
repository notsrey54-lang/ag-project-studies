import { useEffect, useMemo, useState } from 'react';
import {
  buildContentDocument,
  CHAPTER_SECTIONS,
  clearContentDraft,
  createBlankFlashcard,
  createBlankFormula,
  createBlankGlossaryItem,
  createBlankMaterial,
  createBlankModule,
  createBlankQuizQuestion,
  createBlankResource,
  createBlankSubject,
  loadContentDraft,
  normalizeContentDocument,
  normalizeSubjects,
  publishSharedContent,
  saveContentDraft,
  validateContentSubjects,
} from '../lib/contentLibrary';
import {
  changeAdminPassword,
  isAdminUnlocked,
  lockAdmin,
  resetAdminPassword,
  unlockAdmin,
} from '../lib/adminAuth';
import {
  getSectionProgress,
  getSubjectProgress,
  markAllSubjectsComplete,
  markSubjectComplete,
  resetProgress,
} from '../lib/studyProfile';

const TABS = [
  { id: 'overview', label: 'Dashboard', icon: '⌂' },
  { id: 'subject', label: 'Subject setup', icon: '◈' },
  { id: 'chapters', label: 'Chapters', icon: '☷' },
  { id: 'notes', label: 'Notes & resources', icon: '▤' },
  { id: 'cards', label: 'Flashcards', icon: '◇' },
  { id: 'quizzes', label: 'Quizzes', icon: '?' },
  { id: 'library', label: 'Glossary & formulas', icon: 'Σ' },
];

const clone = (value) => JSON.parse(JSON.stringify(value));

const updateAt = (items, id, patch) => items.map((item) => item.id === id ? { ...item, ...patch } : item);

const parsePoints = (value) => value.split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const separator = line.indexOf('::');
    if (separator === -1) return [line, ''];
    return [line.slice(0, separator).trim(), line.slice(separator + 2).trim()];
  });

const pointsText = (points) => (Array.isArray(points) ? points : []).map(([term, explanation]) => `${term} :: ${explanation}`).join('\n');

function Field({ label, value, onChange, placeholder = '', type = 'text', min, max, step, help }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input type={type} value={value ?? ''} min={min} max={max} step={step} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      {help ? <small>{help}</small> : null}
    </label>
  );
}

function TextField({ label, value, onChange, placeholder = '', rows = 5, help }) {
  return (
    <label className="admin-field admin-field--wide">
      <span>{label}</span>
      <textarea value={value ?? ''} rows={rows} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      {help ? <small>{help}</small> : null}
    </label>
  );
}

function EmptyEditor({ title, description, onAdd, buttonLabel }) {
  return (
    <div className="admin-empty">
      <span className="admin-empty__icon">＋</span>
      <strong>{title}</strong>
      <p>{description}</p>
      <button type="button" className="secondary-button" onClick={onAdd}>{buttonLabel}</button>
    </div>
  );
}

function LoginView({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const valid = await unlockAdmin(password);
      if (!valid) {
        setError('That administrator password is not correct.');
        return;
      }
      onUnlock(password);
      setPassword('');
    } catch {
      setError('The administrator sign-in could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin-page admin-page--locked">
      <section className="admin-lock-card">
        <span className="admin-lock-card__icon">⌘</span>
        <span className="eyebrow">AG Project control room</span>
        <h1>Administrator</h1>
        <p>Manage the university study library, then publish the approved content for every visitor.</p>
        <form onSubmit={submit} className="admin-login-form">
          <label className="admin-field">
            <span>Administrator password</span>
            <input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter password" />
          </label>
          {error ? <p className="admin-error" role="alert">{error}</p> : null}
          <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Checking…' : 'Open administrator'}</button>
        </form>
        <small className="admin-lock-card__note">This control is for the site administrator. Students do not need an account.</small>
      </section>
    </main>
  );
}

function AdminHeader({ selectedSubject, activeTab, dirty, message, publishState, onPublish, onSaveDraft, onExport, onImport, onLogout, onClose }) {
  const tabLabel = TABS.find((tab) => tab.id === activeTab)?.label || 'Dashboard';
  return (
    <header className="admin-header">
      <div className="admin-header__title">
        <span className="eyebrow">Administrator · {tabLabel}</span>
        <h1>{selectedSubject ? selectedSubject.code : 'University content control'}</h1>
        <p>{dirty ? 'Unsaved draft changes are ready for review.' : message || 'Your published study library is the source of truth for every device.'}</p>
      </div>
      <div className="admin-header__actions">
        <button type="button" className="text-button" onClick={onClose}>Back to site</button>
        <button type="button" className="secondary-button" onClick={onSaveDraft}>Save draft</button>
        <button type="button" className="secondary-button" onClick={onExport}>Export JSON</button>
        <label className="admin-import-button secondary-button">Import JSON<input type="file" accept="application/json,.json" onChange={onImport} /></label>
        <button type="button" className="primary-button" onClick={onPublish} disabled={publishState === 'publishing'}>{publishState === 'publishing' ? 'Publishing…' : 'Publish to GitHub'}</button>
        <button type="button" className="icon-button" onClick={onLogout} aria-label="Lock administrator">×</button>
      </div>
    </header>
  );
}

function SubjectPicker({ subjects, selectedId, onSelect, onAdd, onDuplicate, onArchive }) {
  return (
    <aside className="admin-subject-rail">
      <div className="admin-subject-rail__top"><div><span className="eyebrow">Library</span><strong>{subjects.length} subjects</strong></div><button type="button" className="round-button" onClick={onAdd} aria-label="Add subject">＋</button></div>
      <div className="admin-subject-list">
        {subjects.map((subject) => (
          <button type="button" key={subject.id} className={`admin-subject-item ${subject.id === selectedId ? 'admin-subject-item--active' : ''} ${subject.archived ? 'admin-subject-item--archived' : ''}`} onClick={() => onSelect(subject.id)}>
            <span className={`admin-subject-item__dot admin-subject-item__dot--${subject.color}`} />
            <span><strong>{subject.code}</strong><small>{subject.name}</small></span>
            {subject.archived ? <em>Archived</em> : null}
          </button>
        ))}
        {subjects.length === 0 ? <p className="admin-subject-list__empty">Create your first subject.</p> : null}
      </div>
      {selectedId ? <div className="admin-subject-rail__footer"><button type="button" className="text-button" onClick={onDuplicate}>Duplicate subject</button><button type="button" className="text-button danger-button" onClick={onArchive}>Archive subject</button></div> : null}
    </aside>
  );
}

function DashboardTab({ subjects, selectedSubject, profile, onSelectTab, onLoadDraft, hasDraft, onClearDraft, onChangePassword, onResetPassword, onCompleteSubject, onCompleteAllSubjects, onResetProgress }) {
  const totals = useMemo(() => subjects.reduce((result, subject) => ({
    chapters: result.chapters + subject.modules.length,
    notes: result.notes + subject.materials.length,
    cards: result.cards + subject.flashcards.length,
    questions: result.questions + subject.quiz.length,
  }), { chapters: 0, notes: 0, cards: 0, questions: 0 }), [subjects]);

  return (
    <div className="admin-tab admin-dashboard">
      <div className="admin-tab-intro"><span className="eyebrow">Reusable university CMS</span><h2>Build once. Publish everywhere.</h2><p>Set up each subject, organise chapters, paste complete notes, and attach practice material. Students will see the published version on any phone or laptop after Netlify finishes the deployment.</p></div>
      <div className="admin-stat-grid">
        <article><span>Subjects</span><strong>{subjects.length}</strong><small>including archived</small></article>
        <article><span>Chapters</span><strong>{totals.chapters}</strong><small>ordered study sections</small></article>
        <article><span>Notes</span><strong>{totals.notes}</strong><small>long-form materials</small></article>
        <article><span>Practice items</span><strong>{totals.cards + totals.questions}</strong><small>{totals.cards} cards · {totals.questions} questions</small></article>
      </div>
      <div className="admin-quick-grid">
        <button type="button" className="admin-quick-card" onClick={() => onSelectTab('subject')}><span>◈</span><strong>Subject setup</strong><small>Identity, description, colour, archive state</small></button>
        <button type="button" className="admin-quick-card" onClick={() => onSelectTab('notes')}><span>▤</span><strong>Paste lecture notes</strong><small>Summary, body, key points, examples, resources</small></button>
        <button type="button" className="admin-quick-card" onClick={() => onSelectTab('cards')}><span>◇</span><strong>Build active recall</strong><small>Flashcards students can review and rate</small></button>
        <button type="button" className="admin-quick-card" onClick={() => onSelectTab('quizzes')}><span>?</span><strong>Create assessments</strong><small>MCQs with explanations and answer keys</small></button>
      </div>
      <section className="admin-progress-card">
        <div className="admin-progress-card__heading"><div><span className="eyebrow">Local progress controls</span><h3>Preview completion on this device</h3><p>Use these controls only for your current browser. They never publish student progress and cannot change another student’s device. Completion is intentionally capped at 100%.</p></div></div>
        {selectedSubject ? (
          <div className="admin-progress-card__subject">
            <div><strong>{selectedSubject.code} · {selectedSubject.name}</strong><span>{getSubjectProgress(profile, selectedSubject).completed} of {getSubjectProgress(profile, selectedSubject).total} chapters complete</span></div>
            <div className="admin-progress-card__actions"><button type="button" className="secondary-button" onClick={() => onCompleteSubject(selectedSubject)}>Mark selected subject 100%</button></div>
          </div>
        ) : <p className="admin-hint">Choose a subject in the library rail to mark that subject complete.</p>}
        {selectedSubject ? <div className="admin-section-progress-list">{CHAPTER_SECTIONS.map((section) => { const sectionProgress = getSectionProgress(profile, selectedSubject, section.id); return <div className="admin-section-progress" key={section.id}><span>{section.label}</span><strong>{sectionProgress.percent}%</strong><small>{sectionProgress.completed}/{sectionProgress.total} chapters</small></div>; })}</div> : null}
        <div className="admin-progress-card__footer"><button type="button" className="primary-button primary-button--small" onClick={() => onCompleteAllSubjects(subjects)} disabled={!subjects.length}>Mark every subject 100% on this device</button><button type="button" className="text-button danger-button" onClick={onResetProgress}>Reset this device’s progress</button></div>
      </section>
      {hasDraft ? (
        <section className="admin-draft-alert"><div><strong>A local draft is available.</strong><p>It has not been published. Load it only if it is the version you want to continue editing.</p></div><div><button type="button" className="secondary-button" onClick={onLoadDraft}>Load draft</button><button type="button" className="text-button" onClick={onClearDraft}>Discard draft</button></div></section>
      ) : null}
      <section className="admin-security-card">
        <div><span className="eyebrow">Administrator access</span><h3>Password controls</h3><p>The password is not displayed in this panel. Change it for this browser or reset it to the original administrator password if needed.</p></div>
        <div className="admin-security-card__actions"><button type="button" className="secondary-button" onClick={onChangePassword}>Change password</button><button type="button" className="text-button danger-button" onClick={onResetPassword}>Reset password</button></div>
      </section>
      <section className="admin-model-card"><span className="eyebrow">Available content types</span><div className="admin-model-list"><span>Subjects</span><span>Chapters</span><span>Notes</span><span>Resources</span><span>Flashcards</span><span>MCQs</span><span>Glossary</span><span>Formulas</span><span>Archive</span><span>JSON backup</span></div></section>
      {!selectedSubject ? <p className="admin-hint">Create or choose a subject from the library rail to start editing.</p> : null}
    </div>
  );
}

function SubjectTab({ subject, updateSubject }) {
  if (!subject) return <EmptyEditor title="No subject selected" description="Create a subject from the library rail, then return here to set it up." buttonLabel="Use the + button" onAdd={() => {}} />;
  return (
    <div className="admin-tab">
      <div className="admin-tab-intro"><span className="eyebrow">Identity and appearance</span><h2>Subject setup</h2><p>These details become the subject card, sidebar label, and hero section students see.</p></div>
      <div className="admin-form-grid">
        <Field label="Subject code" value={subject.code} onChange={(value) => updateSubject({ code: value.toUpperCase() })} placeholder="MIS101" help="The code students recognise. The internal ID stays stable." />
        <Field label="Full subject name" value={subject.name} onChange={(value) => updateSubject({ name: value })} placeholder="Management Information Systems" />
        <Field label="Short sidebar name" value={subject.shortName} onChange={(value) => updateSubject({ shortName: value })} placeholder="MIS" />
        <Field label="Eyebrow label" value={subject.eyebrow} onChange={(value) => updateSubject({ eyebrow: value })} placeholder="Your MIS toolkit" />
        <label className="admin-field"><span>Theme colour</span><select value={subject.color} onChange={(event) => updateSubject({ color: event.target.value })}><option value="gold">Gold</option><option value="green">Green</option><option value="blue">Blue</option><option value="purple">Purple</option></select></label>
        <label className="admin-field"><span>Material mode</span><select value={subject.materialType} onChange={(event) => updateSubject({ materialType: event.target.value })}><option value="structured">Structured notes</option><option value="legacy">Existing legacy reader + added notes</option></select></label>
        <label className="admin-checkbox"><input type="checkbox" checked={Boolean(subject.archived)} onChange={(event) => updateSubject({ archived: event.target.checked })} /><span><strong>Archive this subject</strong><small>Archived subjects disappear from the public sidebar but remain recoverable here.</small></span></label>
        <TextField label="Subject description" value={subject.description} onChange={(value) => updateSubject({ description: value })} placeholder="Explain what students will learn and what tools are inside." rows={4} />
      </div>
      <div className="admin-info-callout"><strong>Safe content rule</strong><p>Notes are stored as plain text fields, so an accidental HTML tag cannot inject code into the public site. Use links in Resources for external material.</p></div>
    </div>
  );
}

function ChaptersTab({ subject, updateSubject }) {
  const [filter, setFilter] = useState('all');
  if (!subject) return <EmptyEditor title="Create a subject first" description="Chapters belong to a subject. Add one from the + button on the left." buttonLabel="Use the + button" onAdd={() => {}} />;
  const move = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= subject.modules.length) return;
    const modules = [...subject.modules];
    [modules[index], modules[nextIndex]] = [modules[nextIndex], modules[index]];
    updateSubject({ modules });
  };
  const addChapter = (section = 'course') => updateSubject({ modules: [...subject.modules, { ...createBlankModule(), section }] });
  const visibleModules = subject.modules
    .map((module, index) => ({ module, index }))
    .filter(({ module }) => filter === 'all' || (module.section || 'course') === filter);
  return (
    <div className="admin-tab">
      <div className="admin-tab-heading"><div><span className="eyebrow">Study structure</span><h2>Chapters and sections</h2><p>Keep one subject, then place its chapters into Course content, Midterm, or Final. Students will see the groups separately in the same subject.</p></div><div className="admin-chapter-add-actions"><button type="button" className="primary-button" onClick={() => addChapter('course')}>+ Add chapter</button><button type="button" className="secondary-button" onClick={() => addChapter('midterm')}>+ Midterm</button><button type="button" className="secondary-button" onClick={() => addChapter('final')}>+ Final</button></div></div>
      <div className="admin-filter-row" role="tablist" aria-label="Filter chapters by assessment"><span>Show:</span>{[{ id: 'all', label: 'All chapters' }, ...CHAPTER_SECTIONS].map((section) => <button type="button" role="tab" aria-selected={filter === section.id} className={filter === section.id ? 'admin-filter-button admin-filter-button--active' : 'admin-filter-button'} key={section.id} onClick={() => setFilter(section.id)}>{section.label}</button>)}</div>
      <div className="admin-list-editor">
        {visibleModules.map(({ module, index }) => (
          <article className="admin-list-card" key={module.id}>
            <div className="admin-list-card__number">{String(index + 1).padStart(2, '0')}</div>
            <div className="admin-list-card__body"><div className="admin-form-grid admin-form-grid--compact"><Field label="Chapter title" value={module.title} onChange={(value) => updateSubject({ modules: updateAt(subject.modules, module.id, { title: value }) })} placeholder="Chapter 1" /><Field label="Subtitle" value={module.subtitle} onChange={(value) => updateSubject({ modules: updateAt(subject.modules, module.id, { subtitle: value }) })} placeholder="Main ideas and concepts" /><Field label="Estimated time" value={module.duration} onChange={(value) => updateSubject({ modules: updateAt(subject.modules, module.id, { duration: value }) })} placeholder="15 min" /><label className="admin-field"><span>Assessment section</span><select value={module.section || 'course'} onChange={(event) => updateSubject({ modules: updateAt(subject.modules, module.id, { section: event.target.value }) })}>{CHAPTER_SECTIONS.map((section) => <option value={section.id} key={section.id}>{section.label}</option>)}</select><small>Midterm and Final stay under this same subject.</small></label></div></div>
            <div className="admin-list-card__actions"><button type="button" className="round-button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move chapter up">↑</button><button type="button" className="round-button" onClick={() => move(index, 1)} disabled={index === subject.modules.length - 1} aria-label="Move chapter down">↓</button><button type="button" className="delete-button" onClick={() => updateSubject({ modules: subject.modules.filter((item) => item.id !== module.id) })}>Delete</button></div>
          </article>
        ))}
      </div>
      {subject.modules.length === 0 ? <EmptyEditor title="No chapters yet" description="Add chapters first so the subject has a clear learning path." buttonLabel="Add first chapter" onAdd={() => addChapter('course')} /> : null}
      {subject.modules.length > 0 && visibleModules.length === 0 ? <p className="admin-muted">No chapters are assigned to {CHAPTER_SECTIONS.find((section) => section.id === filter)?.label || 'this section'} yet.</p> : null}
    </div>
  );
}

function NotesTab({ subject, updateSubject }) {
  const [openId, setOpenId] = useState(null);
  if (!subject) return <EmptyEditor title="Create a subject first" description="Notes and resources need a subject to belong to." buttonLabel="Use the + button" onAdd={() => {}} />;
  const addNote = () => {
    const note = createBlankMaterial();
    updateSubject({ materials: [...subject.materials, note] });
    setOpenId(note.id);
  };
  return (
    <div className="admin-tab">
      <div className="admin-tab-heading"><div><span className="eyebrow">Long-form content</span><h2>Notes and resources</h2><p>Paste complete lecture notes as plain text, then add a summary, key points, example, and supporting links.</p></div><button type="button" className="primary-button" onClick={addNote}>+ Add note</button></div>
      <div className="admin-note-editor">
        {subject.materials.map((material, index) => (
          <article className={`admin-accordion-card ${openId === material.id ? 'admin-accordion-card--open' : ''}`} key={material.id}>
            <button type="button" className="admin-accordion-card__toggle" onClick={() => setOpenId(openId === material.id ? null : material.id)}><span><b>{String(index + 1).padStart(2, '0')}</b><strong>{material.title || 'Untitled note'}</strong></span><span>{openId === material.id ? '−' : '+'}</span></button>
            {openId === material.id ? <div className="admin-accordion-card__body">
              <div className="admin-form-grid"><Field label="Note title" value={material.title} onChange={(value) => updateSubject({ materials: updateAt(subject.materials, material.id, { title: value }) })} placeholder="Chapter 1 — Introduction" /><Field label="Short summary" value={material.summary} onChange={(value) => updateSubject({ materials: updateAt(subject.materials, material.id, { summary: value }) })} placeholder="One or two sentences students should remember." /></div>
              <TextField label="Complete note body" value={material.body} onChange={(value) => updateSubject({ materials: updateAt(subject.materials, material.id, { body: value }) })} placeholder="Paste your lecture notes here. Separate paragraphs with a blank line." rows={12} help="Plain text is intentional: it keeps the public course safe and portable." />
              <TextField label="Key points" value={pointsText(material.points)} onChange={(value) => updateSubject({ materials: updateAt(subject.materials, material.id, { points: parsePoints(value) }) })} placeholder="Scarcity :: Resources are limited.\nChoice :: Limited resources require decisions." rows={6} help="One point per line, using: term :: explanation" />
              <TextField label="Short example" value={material.example} onChange={(value) => updateSubject({ materials: updateAt(subject.materials, material.id, { example: value }) })} placeholder="Give students a concrete example." rows={4} />
              <button type="button" className="delete-button" onClick={() => updateSubject({ materials: subject.materials.filter((item) => item.id !== material.id) })}>Delete this note</button>
            </div> : null}
          </article>
        ))}
      </div>
      {subject.materials.length === 0 ? <EmptyEditor title="No notes yet" description="Add a note for each lecture, chapter, or topic. You can paste long text into the editor." buttonLabel="Add first note" onAdd={addNote} /> : null}

      <section className="admin-subsection">
        <div className="admin-tab-heading"><div><span className="eyebrow">Supporting material</span><h3>Resources</h3><p>Add PDFs, slides, videos, links, or reading lists for this subject.</p></div><button type="button" className="secondary-button" onClick={() => updateSubject({ resources: [...subject.resources, createBlankResource()] })}>+ Add resource</button></div>
        <div className="admin-resource-list">{subject.resources.map((resource) => <article className="admin-resource-card" key={resource.id}><div className="admin-form-grid admin-form-grid--compact"><Field label="Resource title" value={resource.title} onChange={(value) => updateSubject({ resources: updateAt(subject.resources, resource.id, { title: value }) })} placeholder="Lecture slides" /><Field label="Type" value={resource.type} onChange={(value) => updateSubject({ resources: updateAt(subject.resources, resource.id, { type: value }) })} placeholder="PDF / Video / Link" /><Field label="URL" value={resource.url} onChange={(value) => updateSubject({ resources: updateAt(subject.resources, resource.id, { url: value }) })} placeholder="https://…" /><Field label="Description" value={resource.description} onChange={(value) => updateSubject({ resources: updateAt(subject.resources, resource.id, { description: value }) })} placeholder="What is this for?" /></div><button type="button" className="delete-button" onClick={() => updateSubject({ resources: subject.resources.filter((item) => item.id !== resource.id) })}>Delete</button></article>)}</div>
      </section>
    </div>
  );
}

function CardsTab({ subject, updateSubject }) {
  const [bulk, setBulk] = useState('');
  if (!subject) return <EmptyEditor title="Create a subject first" description="Flashcards need a subject to belong to." buttonLabel="Use the + button" onAdd={() => {}} />;
  const addBulk = () => {
    const cards = bulk.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const separator = line.indexOf('||');
      const card = createBlankFlashcard();
      return { ...card, prompt: separator === -1 ? line : line.slice(0, separator).trim(), answer: separator === -1 ? '' : line.slice(separator + 2).trim() };
    });
    if (cards.length) updateSubject({ flashcards: [...subject.flashcards, ...cards] });
    setBulk('');
  };
  return (
    <div className="admin-tab">
      <div className="admin-tab-heading"><div><span className="eyebrow">Active recall bank</span><h2>Flashcards</h2><p>Write the prompt and answer students should recall. The study view already lets them flip and review cards.</p></div><button type="button" className="primary-button" onClick={() => updateSubject({ flashcards: [...subject.flashcards, createBlankFlashcard()] })}>+ Add card</button></div>
      <section className="admin-bulk-card"><div><strong>Fast import</strong><p>One card per line: <code>question || answer</code></p></div><textarea value={bulk} onChange={(event) => setBulk(event.target.value)} placeholder="What is scarcity? || Resources are limited while wants are unlimited." rows={3} /><button type="button" className="secondary-button" onClick={addBulk} disabled={!bulk.trim()}>Add pasted cards</button></section>
      <div className="admin-card-editor">{subject.flashcards.map((card, index) => <article className="admin-list-card admin-list-card--stacked" key={card.id}><div className="admin-list-card__number">{String(index + 1).padStart(2, '0')}</div><div className="admin-list-card__body"><div className="admin-form-grid"><Field label="Label / chapter" value={card.label} onChange={(value) => updateSubject({ flashcards: updateAt(subject.flashcards, card.id, { label: value }) })} placeholder="Chapter 1" /><Field label="Prompt" value={card.prompt} onChange={(value) => updateSubject({ flashcards: updateAt(subject.flashcards, card.id, { prompt: value }) })} placeholder="What is…?" /><TextField label="Answer" value={card.answer} onChange={(value) => updateSubject({ flashcards: updateAt(subject.flashcards, card.id, { answer: value }) })} placeholder="The answer students should remember." rows={4} /></div></div><button type="button" className="delete-button" onClick={() => updateSubject({ flashcards: subject.flashcards.filter((item) => item.id !== card.id) })}>Delete</button></article>)}</div>
      {subject.flashcards.length === 0 ? <EmptyEditor title="No flashcards yet" description="Add individual cards or paste a batch using the fast import box." buttonLabel="Add first card" onAdd={() => updateSubject({ flashcards: [createBlankFlashcard()] })} /> : null}
    </div>
  );
}

function QuizzesTab({ subject, updateSubject }) {
  if (!subject) return <EmptyEditor title="Create a subject first" description="Quiz questions need a subject to belong to." buttonLabel="Use the + button" onAdd={() => {}} />;
  return (
    <div className="admin-tab">
      <div className="admin-tab-heading"><div><span className="eyebrow">Assessment bank</span><h2>Multiple-choice quizzes</h2><p>Every question includes four options, one correct answer, and an explanation shown after the student answers.</p></div><button type="button" className="primary-button" onClick={() => updateSubject({ quiz: [...subject.quiz, createBlankQuizQuestion()] })}>+ Add question</button></div>
      <div className="admin-question-editor">{subject.quiz.map((question, index) => <article className="admin-question-card" key={question.id}><div className="admin-question-card__top"><span>Question {index + 1}</span><button type="button" className="delete-button" onClick={() => updateSubject({ quiz: subject.quiz.filter((item) => item.id !== question.id) })}>Delete</button></div><TextField label="Question prompt" value={question.prompt} onChange={(value) => updateSubject({ quiz: updateAt(subject.quiz, question.id, { prompt: value }) })} placeholder="Which statement is correct?" rows={3} /><div className="admin-options-grid">{question.options.map((option, optionIndex) => <label className={`admin-option-field ${question.answer === optionIndex ? 'admin-option-field--correct' : ''}`} key={`${question.id}-${optionIndex}`}><span><input type="radio" name={`correct-${question.id}`} checked={question.answer === optionIndex} onChange={() => updateSubject({ quiz: updateAt(subject.quiz, question.id, { answer: optionIndex }) })} /> Option {String.fromCharCode(65 + optionIndex)} {question.answer === optionIndex ? '· correct' : ''}</span><input value={option} placeholder={`Answer option ${String.fromCharCode(65 + optionIndex)}`} onChange={(event) => updateSubject({ quiz: updateAt(subject.quiz, question.id, { options: question.options.map((item, itemIndex) => itemIndex === optionIndex ? event.target.value : item) }) })} /></label>)}</div><TextField label="Explanation" value={question.explanation} onChange={(value) => updateSubject({ quiz: updateAt(subject.quiz, question.id, { explanation: value }) })} placeholder="Explain why the correct option is right." rows={3} /></article>)}</div>
      {subject.quiz.length === 0 ? <EmptyEditor title="No quiz questions yet" description="Build an assessment bank that can be reused for quick quizzes and future exam mode." buttonLabel="Add first question" onAdd={() => updateSubject({ quiz: [createBlankQuizQuestion()] })} /> : null}
    </div>
  );
}

function LibraryTab({ subject, updateSubject }) {
  if (!subject) return <EmptyEditor title="Create a subject first" description="Glossary terms and formulas need a subject to belong to." buttonLabel="Use the + button" onAdd={() => {}} />;
  return (
    <div className="admin-tab">
      <div className="admin-tab-intro"><span className="eyebrow">Reference tools</span><h2>Glossary and formulas</h2><p>Give each subject its own quick-reference library. These items become reusable cards in the student view.</p></div>
      <section className="admin-subsection"><div className="admin-tab-heading"><div><h3>Glossary</h3><p>Important terms and definitions.</p></div><button type="button" className="secondary-button" onClick={() => updateSubject({ glossary: [...subject.glossary, createBlankGlossaryItem()] })}>+ Add term</button></div><div className="admin-simple-list">{subject.glossary.map((item) => <article className="admin-resource-card" key={item.id}><div className="admin-form-grid admin-form-grid--compact"><Field label="Term" value={item.term} onChange={(value) => updateSubject({ glossary: updateAt(subject.glossary, item.id, { term: value }) })} placeholder="Opportunity cost" /><Field label="Definition" value={item.definition} onChange={(value) => updateSubject({ glossary: updateAt(subject.glossary, item.id, { definition: value }) })} placeholder="The next best alternative…" /></div><button type="button" className="delete-button" onClick={() => updateSubject({ glossary: subject.glossary.filter((entry) => entry.id !== item.id) })}>Delete</button></article>)}</div>{subject.glossary.length === 0 ? <p className="admin-muted">No glossary terms yet.</p> : null}</section>
      <section className="admin-subsection"><div className="admin-tab-heading"><div><h3>Formulas</h3><p>Expressions, explanations, and worked examples for technical subjects.</p></div><button type="button" className="secondary-button" onClick={() => updateSubject({ formulas: [...subject.formulas, createBlankFormula()] })}>+ Add formula</button></div><div className="admin-simple-list">{subject.formulas.map((formula) => <article className="admin-formula-card" key={formula.id}><div className="admin-form-grid"><Field label="Formula name" value={formula.name} onChange={(value) => updateSubject({ formulas: updateAt(subject.formulas, formula.id, { name: value }) })} placeholder="Break-even quantity" /><Field label="Expression" value={formula.expression} onChange={(value) => updateSubject({ formulas: updateAt(subject.formulas, formula.id, { expression: value }) })} placeholder="Fixed cost ÷ (price − variable cost)" /><TextField label="Explanation" value={formula.explanation} onChange={(value) => updateSubject({ formulas: updateAt(subject.formulas, formula.id, { explanation: value }) })} placeholder="Explain each symbol and when to use it." rows={3} /><TextField label="Worked example" value={formula.example} onChange={(value) => updateSubject({ formulas: updateAt(subject.formulas, formula.id, { example: value }) })} placeholder="Show the steps with numbers." rows={3} /></div><button type="button" className="delete-button" onClick={() => updateSubject({ formulas: subject.formulas.filter((entry) => entry.id !== formula.id) })}>Delete</button></article>)}</div>{subject.formulas.length === 0 ? <p className="admin-muted">No formulas yet.</p> : null}</section>
    </div>
  );
}

function PasswordDialog({ onClose, onChanged }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (next !== confirm) { setError('The new passwords do not match.'); return; }
    try {
      await changeAdminPassword(current, next);
      setSuccess('Administrator password changed for this browser.');
      onChanged(next);
    } catch (changeError) {
      setError(changeError.message || 'The password could not be changed.');
    }
  };
  return <div className="admin-modal-backdrop"><form className="admin-modal" onSubmit={submit}><button type="button" className="icon-button admin-modal__close" onClick={onClose} aria-label="Close">×</button><span className="eyebrow">Security</span><h2>Change administrator password</h2><p>The new password stays in this browser until you change it again or reset it.</p><Field label="Current password" value={current} onChange={setCurrent} type="password" /><Field label="New password" value={next} onChange={setNext} type="password" help="Use at least 4 characters." /><Field label="Confirm new password" value={confirm} onChange={setConfirm} type="password" />{error ? <p className="admin-error">{error}</p> : null}{success ? <p className="admin-success">{success}</p> : null}<div className="admin-modal__actions"><button type="button" className="secondary-button" onClick={onClose}>Close</button><button type="submit" className="primary-button">Save password</button></div></form></div>;
}

export function AdministratorPanel({ subjects, profile, onUpdateProfile, onPublished, onClose }) {
  const [unlocked, setUnlocked] = useState(isAdminUnlocked);
  const [sessionPassword, setSessionPassword] = useState('');
  const [editorSubjects, setEditorSubjects] = useState(() => normalizeSubjects(subjects));
  const [selectedId, setSelectedId] = useState(() => subjects[0]?.id || null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState('');
  const [publishState, setPublishState] = useState('idle');
  const [publishError, setPublishError] = useState('');
  const [hasDraft, setHasDraft] = useState(() => Boolean(loadContentDraft()));
  const [passwordDialog, setPasswordDialog] = useState(false);

  useEffect(() => {
    if (!dirty) {
      setEditorSubjects(normalizeSubjects(subjects));
      setSelectedId((current) => subjects.some((subject) => subject.id === current) ? current : subjects[0]?.id || null);
    }
  }, [subjects, dirty]);

  const selectedSubject = editorSubjects.find((subject) => subject.id === selectedId) || null;

  const updateEditorSubjects = (updater) => {
    setEditorSubjects((current) => normalizeSubjects(typeof updater === 'function' ? updater(current) : updater));
    setDirty(true);
    setMessage('Draft updated locally.');
    setPublishError('');
  };

  const updateSelectedSubject = (patch) => {
    updateEditorSubjects((current) => current.map((subject) => {
      if (subject.id !== selectedId) return subject;
      return typeof patch === 'function' ? patch(subject) : { ...subject, ...patch };
    }));
  };

  const addSubject = () => {
    const subject = createBlankSubject();
    updateEditorSubjects((current) => [...current, subject]);
    setSelectedId(subject.id);
    setActiveTab('subject');
  };

  const duplicateSubject = () => {
    if (!selectedSubject) return;
    const duplicate = clone(selectedSubject);
    duplicate.id = `${selectedSubject.id}-copy-${Date.now()}`;
    duplicate.code = `${selectedSubject.code}-COPY`;
    duplicate.name = `${selectedSubject.name} copy`;
    duplicate.archived = false;
    updateEditorSubjects((current) => [...current, duplicate]);
    setSelectedId(duplicate.id);
    setActiveTab('subject');
  };

  const archiveSubject = () => {
    if (!selectedSubject) return;
    updateSelectedSubject({ archived: !selectedSubject.archived });
  };

  const saveDraft = () => {
    saveContentDraft(editorSubjects);
    setHasDraft(true);
    setMessage('Draft saved on this device.');
  };

  const loadDraft = () => {
    const draft = loadContentDraft();
    if (!draft) return;
    setEditorSubjects(normalizeSubjects(draft));
    setSelectedId(draft[0]?.id || null);
    setDirty(true);
    setHasDraft(true);
    setMessage('Local draft loaded. Review it before publishing.');
  };

  const discardDraft = () => {
    clearContentDraft();
    setHasDraft(false);
    setMessage('Local draft discarded.');
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(buildContentDocument(editorSubjects), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ag-study-content-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('JSON backup downloaded.');
  };

  const importJson = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = normalizeContentDocument(JSON.parse(await file.text()));
      if (!parsed.subjects.length) throw new Error('The JSON file did not contain any subjects.');
      setEditorSubjects(parsed.subjects);
      setSelectedId(parsed.subjects[0].id);
      setDirty(true);
      setMessage('JSON imported as a draft. Review it before publishing.');
    } catch (error) {
      setPublishError(error.message || 'That JSON file could not be imported.');
    }
  };

  const publish = async () => {
    if (!sessionPassword) {
      setPublishError('Lock and reopen the Administrator panel to enter the password again before publishing.');
      return;
    }
    const validationErrors = validateContentSubjects(editorSubjects);
    if (validationErrors.length) {
      setPublishState('error');
      setPublishError(`Fix these content issues before publishing:\n${validationErrors.slice(0, 8).map((error) => `• ${error}`).join('\n')}${validationErrors.length > 8 ? `\n• Plus ${validationErrors.length - 8} more issue(s).` : ''}`);
      return;
    }
    setPublishState('publishing');
    setPublishError('');
    try {
      await publishSharedContent(editorSubjects, sessionPassword);
      const publicSubjects = editorSubjects.filter((subject) => !subject.archived);
      onPublished(publicSubjects);
      setDirty(false);
      setHasDraft(false);
      setMessage('Published to GitHub. Netlify will deploy the update automatically.');
      setPublishState('success');
      window.setTimeout(() => setPublishState('idle'), 4000);
    } catch (error) {
      setPublishState('error');
      setPublishError(error.message || 'GitHub could not publish this content.');
    }
  };

  const logout = () => {
    lockAdmin();
    setUnlocked(false);
    setSessionPassword('');
  };

  const resetPassword = () => {
    if (!window.confirm('Reset the administrator password to the original password?')) return;
    resetAdminPassword();
    setUnlocked(false);
    setSessionPassword('');
  };

  const completeSubjectOnDevice = (subject) => {
    if (!onUpdateProfile || !subject) return;
    if (!window.confirm(`Mark every chapter in ${subject.code} as complete on this device?`)) return;
    onUpdateProfile((current) => markSubjectComplete(current, subject));
    setMessage(`${subject.code} is now 100% complete on this device.`);
  };

  const completeAllSubjectsOnDevice = (allSubjects) => {
    if (!onUpdateProfile || !allSubjects.length) return;
    if (!window.confirm('Mark every chapter in every subject as complete on this device?')) return;
    onUpdateProfile((current) => markAllSubjectsComplete(current, allSubjects));
    setMessage('Every subject is now 100% complete on this device.');
  };

  const resetLocalProgress = () => {
    if (!onUpdateProfile) return;
    if (!window.confirm('Reset all chapter completion on this device? Notes, bookmarks, GPA, and shared content will stay unchanged.')) return;
    onUpdateProfile(resetProgress);
    setMessage('Chapter completion was reset on this device.');
  };

  if (!unlocked) return <LoginView onUnlock={(password) => { setSessionPassword(password); setUnlocked(true); }} />;

  return (
    <main className="admin-page">
      <AdminHeader selectedSubject={selectedSubject} activeTab={activeTab} dirty={dirty} message={message} publishState={publishState} onPublish={publish} onSaveDraft={saveDraft} onExport={exportJson} onImport={importJson} onLogout={logout} onClose={onClose} />
      <div className="admin-layout">
        <SubjectPicker subjects={editorSubjects} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); if (activeTab === 'overview') setActiveTab('subject'); }} onAdd={addSubject} onDuplicate={duplicateSubject} onArchive={archiveSubject} />
        <div className="admin-main">
          <nav className="admin-tabs" aria-label="Administrator tools">{TABS.map((tab) => <button type="button" key={tab.id} className={activeTab === tab.id ? 'admin-tab-button--active' : ''} onClick={() => setActiveTab(tab.id)}><span>{tab.icon}</span>{tab.label}</button>)}</nav>
          {publishError ? <div className="admin-error admin-error--banner" role="alert">{publishError}</div> : null}
          {publishState === 'success' ? <div className="admin-success admin-success--banner">Published successfully. Wait for the Netlify deployment to finish before checking from another device.</div> : null}
          {activeTab === 'overview' ? <DashboardTab subjects={editorSubjects} selectedSubject={selectedSubject} profile={profile} onSelectTab={setActiveTab} onLoadDraft={loadDraft} hasDraft={hasDraft} onClearDraft={discardDraft} onChangePassword={() => setPasswordDialog(true)} onResetPassword={resetPassword} onCompleteSubject={completeSubjectOnDevice} onCompleteAllSubjects={completeAllSubjectsOnDevice} onResetProgress={resetLocalProgress} /> : null}
          {activeTab === 'subject' ? <SubjectTab subject={selectedSubject} updateSubject={updateSelectedSubject} /> : null}
          {activeTab === 'chapters' ? <ChaptersTab subject={selectedSubject} updateSubject={updateSelectedSubject} /> : null}
          {activeTab === 'notes' ? <NotesTab subject={selectedSubject} updateSubject={updateSelectedSubject} /> : null}
          {activeTab === 'cards' ? <CardsTab subject={selectedSubject} updateSubject={updateSelectedSubject} /> : null}
          {activeTab === 'quizzes' ? <QuizzesTab subject={selectedSubject} updateSubject={updateSelectedSubject} /> : null}
          {activeTab === 'library' ? <LibraryTab subject={selectedSubject} updateSubject={updateSelectedSubject} /> : null}
        </div>
      </div>
      {passwordDialog ? <PasswordDialog onClose={() => setPasswordDialog(false)} onChanged={(password) => { setSessionPassword(password); setPasswordDialog(false); setMessage('Administrator password changed.'); }} /> : null}
    </main>
  );
}
