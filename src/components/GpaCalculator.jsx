import { useEffect, useMemo, useState } from 'react';
import {
  calculateGpa,
  calculateTermStats,
  createEmptyCourse,
  createEmptyTerm,
  GRADE_POINTS,
  GRADE_OPTIONS,
  normalizeGpaPlan,
  projectGpa,
} from '../lib/gpa';

const GPA_STORAGE_KEY = 'ag-study-gpa-plan-v1';

const loadPlan = () => {
  try {
    const saved = normalizeGpaPlan(JSON.parse(window.localStorage.getItem(GPA_STORAGE_KEY)));
    return saved.terms.length ? saved : { version: 1, terms: [createEmptyTerm()] };
  } catch {
    return { version: 1, terms: [createEmptyTerm()] };
  }
};

const formatCredits = (value) => Number(value || 0).toFixed(value % 1 ? 1 : 0);

function SummaryCard({ label, value, detail, tone = '' }) {
  return (
    <article className={`gpa-summary-card ${tone ? `gpa-summary-card--${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function GpaCalculator({ onOpenMenu }) {
  const [plan, setPlan] = useState(loadPlan);
  const [targetGrade, setTargetGrade] = useState('A');

  const summary = useMemo(() => calculateGpa(plan.terms), [plan.terms]);
  const projected = useMemo(() => projectGpa(plan.terms, targetGrade), [plan.terms, targetGrade]);

  useEffect(() => {
    window.localStorage.setItem(GPA_STORAGE_KEY, JSON.stringify(plan));
  }, [plan]);

  const updateTerm = (termId, updater) => {
    setPlan((current) => ({
      ...current,
      terms: current.terms.map((term) => term.id === termId ? updater(term) : term),
    }));
  };

  const updateCourse = (termId, courseId, patch) => {
    updateTerm(termId, (term) => ({
      ...term,
      courses: term.courses.map((course) => course.id === courseId ? { ...course, ...patch } : course),
    }));
  };

  const addTerm = () => {
    setPlan((current) => ({
      ...current,
      terms: [...current.terms, createEmptyTerm(`Term ${current.terms.length + 1}`)],
    }));
  };

  const removeTerm = (termId) => {
    setPlan((current) => {
      if (current.terms.length === 1) return { ...current, terms: [{ ...current.terms[0], courses: [] }] };
      return { ...current, terms: current.terms.filter((term) => term.id !== termId) };
    });
  };

  const resetPlan = () => {
    if (!window.confirm('Clear all GPA terms and courses?')) return;
    setPlan({ version: 1, terms: [createEmptyTerm()] });
  };

  return (
    <main className="gpa-page">
      <header className="mobile-header">
        <button type="button" className="icon-button" onClick={onOpenMenu} aria-label="Open subject menu">☰</button>
        <span className="mobile-header__brand">GPA Calculator</span>
      </header>

      <section className="gpa-hero">
        <div>
          <span className="eyebrow">Academic toolkit</span>
          <h1>GPA Calculator <span>Plan every term with confidence.</span></h1>
          <p>Add completed, failed, or planned courses to see your term GPA, cumulative GPA, credits, and what-if projection update instantly.</p>
        </div>
        <div className="gpa-hero__badge" aria-hidden="true"><strong>4.00</strong><span>maximum scale</span></div>
      </section>

      <section className="gpa-summary-grid" aria-label="GPA summary">
        <SummaryCard label="Cumulative GPA" value={summary.gpa.toFixed(2)} detail={`${summary.gpaCredits.toFixed(1)} graded credits`} tone="primary" />
        <SummaryCard label="Attempted credits" value={formatCredits(summary.attemptedCredits)} detail={`${formatCredits(summary.earnedCredits)} earned`} />
        <SummaryCard label="Planned credits" value={formatCredits(summary.plannedCredits)} detail="Not included yet" />
        <SummaryCard label="Projected GPA" value={projected.toFixed(2)} detail={summary.plannedCredits ? `If planned courses earn ${targetGrade}` : 'Add a TBD course to project'} tone="projected" />
      </section>

      <section className="gpa-control-card" aria-label="GPA controls">
        <div>
          <span className="eyebrow">What-if planner</span>
          <h2>Choose a target grade for planned courses</h2>
          <p>Every course marked TBD uses this grade in the projection. Your actual GPA is never changed by the estimate.</p>
        </div>
        <label className="field gpa-target-field">
          <span>Target grade</span>
          <select value={targetGrade} onChange={(event) => setTargetGrade(event.target.value)}>
            {GRADE_OPTIONS.filter((grade) => !['P', 'NP', 'W', 'TBD'].includes(grade)).map((grade) => <option key={grade}>{grade}</option>)}
          </select>
        </label>
      </section>

      <section className="gpa-terms" aria-labelledby="gpa-terms-title">
        <div className="section-heading">
          <div><span className="eyebrow">Your academic record</span><h2 id="gpa-terms-title">Terms and courses</h2></div>
          <div className="gpa-actions"><button type="button" className="secondary-button" onClick={resetPlan}>Reset calculator</button><button type="button" className="primary-button" onClick={addTerm}>+ Add term</button></div>
        </div>

        <div className="gpa-term-list">
          {plan.terms.map((term) => {
            const termStats = calculateTermStats(term);
            return (
              <article className="gpa-term-card" key={term.id}>
                <div className="gpa-term-card__header">
                  <label className="field field--inline">
                    <span className="sr-only">Term name</span>
                    <input value={term.name} onChange={(event) => updateTerm(term.id, (current) => ({ ...current, name: event.target.value }))} aria-label="Term name" />
                  </label>
                  <div className="gpa-term-card__stats"><span>Term GPA <strong>{termStats.gpaCredits ? (termStats.qualityPoints / termStats.gpaCredits).toFixed(2) : '—'}</strong></span><span>{formatCredits(termStats.attemptedCredits)} attempted</span><button type="button" className="text-button danger-button" onClick={() => removeTerm(term.id)}>Remove term</button></div>
                </div>

                <div className="gpa-table-wrap">
                  <table className="gpa-table">
                    <thead><tr><th>Course</th><th>Credits</th><th>Grade</th><th>Result</th><th>Action</th></tr></thead>
                    <tbody>
                      {term.courses.length === 0 ? (
                        <tr><td colSpan="5" className="gpa-empty-row">No courses yet. Add your first course to calculate this term.</td></tr>
                      ) : term.courses.map((course) => {
                        const isPlanned = course.grade === 'TBD';
                        const isFail = course.grade === 'F';
                        return (
                          <tr className={isPlanned ? 'tbd-row' : isFail ? 'fail-row' : ''} key={course.id}>
                            <td><input className="gpa-course-name" value={course.name} placeholder="Course name / code" onChange={(event) => updateCourse(term.id, course.id, { name: event.target.value })} /></td>
                            <td><input className="gpa-credit-input" type="number" min="0.5" max="30" step="0.5" value={course.credits} onChange={(event) => updateCourse(term.id, course.id, { credits: Number(event.target.value) || 0 })} aria-label={`Credits for ${course.name || 'course'}`} /></td>
                            <td><select className="gpa-grade-select" value={course.grade} onChange={(event) => updateCourse(term.id, course.id, { grade: event.target.value })} aria-label={`Grade for ${course.name || 'course'}`}>{GRADE_OPTIONS.map((grade) => <option key={grade}>{grade}</option>)}</select></td>
                            <td>{isPlanned ? <span className="gpa-result-message">{summary.attemptedCredits === 0 ? <>Aim for an <strong>{targetGrade}</strong> to establish a Total GPA of <strong>{projected.toFixed(2)}</strong>.</> : <>To increase your GPA, achieve at least a <strong>{targetGrade}</strong>. Total GPA will become <strong>{projected.toFixed(2)}</strong>.</>}</span> : course.grade === 'W' ? <span className="muted-result">Withdrawn</span> : course.grade === 'P' || course.grade === 'NP' ? <span className="muted-result">Pass/fail</span> : <span className="gpa-points">{(Number(course.credits || 0) * (GRADE_POINTS[course.grade] ?? 0)).toFixed(1)} pts</span>}</td>
                            <td><button type="button" className="delete-button" onClick={() => updateTerm(term.id, (current) => ({ ...current, courses: current.courses.filter((item) => item.id !== course.id) }))}>Delete</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="add-row-button" onClick={() => updateTerm(term.id, (current) => ({ ...current, courses: [...current.courses, createEmptyCourse()] }))}>+ Add course</button>
              </article>
            );
          })}
        </div>
      </section>

      <p className="gpa-footnote">GPA points use a 4.00 scale. P/NP and W courses do not change GPA; F courses count as attempted credits with zero quality points. Your calculator is saved on this device.</p>
    </main>
  );
}
