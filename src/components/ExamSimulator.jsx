import { useMemo, useState } from 'react';
import { localizeField } from '../lib/contentModel';

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);

export function ExamSimulator({ subject, onComplete, language = 'en' }) {
  const questions = subject.quiz || [];
  const [run, setRun] = useState(null);
  const [count, setCount] = useState(Math.min(10, questions.length || 1));

  const start = () => {
    setRun({ questions: shuffle(questions).slice(0, count), index: 0, answers: [], selected: null, submitted: false, score: null });
  };

  const current = run?.questions?.[run.index];
  const currentCorrect = current && run?.selected === current.answer;

  const submit = () => {
    if (!run || run.selected === null || run.submitted) return;
    setRun((state) => ({ ...state, submitted: true }));
  };

  const next = () => {
    if (!run || !run.submitted) return;
    const answers = [...run.answers, { questionId: current.id, selected: run.selected, correct: currentCorrect }];
    if (run.index === run.questions.length - 1) {
      const score = answers.filter((answer) => answer.correct).length;
      onComplete({ score, total: answers.length, answers });
      setRun({ ...run, answers, score, submitted: true, selected: null });
      return;
    }
    setRun((state) => ({ ...state, answers, index: state.index + 1, selected: null, submitted: false }));
  };

  const reset = () => setRun(null);
  const percentage = useMemo(() => run?.score === null || run?.score === undefined ? 0 : Math.round((run.score / run.questions.length) * 100), [run]);

  if (!questions.length) {
    return <section className="tool-card exam-tool tool-card--empty"><span className="eyebrow">Exam rehearsal</span><h3>Exam simulator</h3><p>Add quiz questions in the admin workspace before starting a mock exam.</p></section>;
  }

  if (!run) {
    return (
      <section className="tool-card exam-tool" aria-labelledby={`${subject.id}-exam-title`}>
        <div className="tool-card__heading"><div><span className="eyebrow">Exam rehearsal</span><h3 id={`${subject.id}-exam-title`}>Exam simulator</h3></div><span>Timed-style practice</span></div>
        <p className="tool-card__description">A shuffled mock exam with no immediate answer hints. Review the result when you finish.</p>
        <label className="field-label" htmlFor={`${subject.id}-exam-count`}>Questions</label>
        <select id={`${subject.id}-exam-count`} className="admin-input" value={count} onChange={(event) => setCount(Number(event.target.value))}>
          {[5, 10, 20].filter((size) => size <= questions.length).map((size) => <option key={size} value={size}>{size} questions</option>)}
          {!([5, 10, 20].some((size) => size <= questions.length)) && <option value={questions.length}>{questions.length} questions</option>}
        </select>
        <button type="button" className="primary-button primary-button--small" onClick={start}>Start exam →</button>
      </section>
    );
  }

  if (run.score !== null) {
    return (
      <section className="tool-card exam-tool exam-tool--result" aria-labelledby={`${subject.id}-exam-result-title`}>
        <span className="eyebrow">Exam complete</span>
        <h3 id={`${subject.id}-exam-result-title`}>{run.score} / {run.questions.length}</h3>
        <p className="exam-result__percent">{percentage}%</p>
        <p className="tool-card__description">Your attempt was saved to your local progress history.</p>
        <button type="button" className="secondary-button" onClick={reset}>Try another exam</button>
      </section>
    );
  }

  return (
    <section className="tool-card exam-tool" aria-labelledby={`${subject.id}-exam-question`}>
      <div className="tool-card__heading"><div><span className="eyebrow">Question {run.index + 1} of {run.questions.length}</span><h3 id={`${subject.id}-exam-question`}>Exam simulator</h3></div><span>{run.answers.filter((answer) => answer.correct).length} correct</span></div>
      <p className="exam-question">{localizeField(current.prompt, current.promptAr, language)}</p>
      <div className="answer-list" role="radiogroup" aria-label="Exam answer choices">
        {current.options.map((option, optionIndex) => (
          <button key={`${option}-${optionIndex}`} type="button" className={`answer-option ${run.selected === optionIndex ? 'answer-option--selected' : ''} ${run.submitted && optionIndex === current.answer ? 'answer-option--correct' : ''} ${run.submitted && optionIndex === run.selected && !currentCorrect ? 'answer-option--incorrect' : ''}`} onClick={() => !run.submitted && setRun((state) => ({ ...state, selected: optionIndex }))} role="radio" aria-checked={run.selected === optionIndex}>
            <span>{String.fromCharCode(65 + optionIndex)}</span>{language === 'ar' && current.optionsAr?.[optionIndex] ? current.optionsAr[optionIndex] : option}
          </button>
        ))}
      </div>
      {run.submitted && <p className={`quiz-feedback ${currentCorrect ? 'quiz-feedback--correct' : 'quiz-feedback--incorrect'}`}>{currentCorrect ? 'Correct.' : 'Review this one before moving on.'}</p>}
      <div className="quiz-tool__actions">{run.submitted ? <button type="button" className="primary-button primary-button--small" onClick={next}>{run.index === run.questions.length - 1 ? 'Finish exam' : 'Next question →'}</button> : <button type="button" className="primary-button primary-button--small" onClick={submit} disabled={run.selected === null}>Submit answer</button>}</div>
    </section>
  );
}
