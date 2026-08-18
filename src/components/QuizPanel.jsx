import { useState } from 'react';
import { localizeField } from '../lib/contentModel';

export function QuizPanel({ subject, quizStats, onAnswer, language = 'en' }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const questions = subject.quiz || [];
  if (!questions.length) {
    return <section className="tool-card quiz-tool tool-card--empty"><span className="eyebrow">Quick practice</span><h3>Quiz check-in</h3><p>Add questions from the admin workspace to start practicing this subject.</p></section>;
  }
  const question = questions[index];
  const isCorrect = selected === question.answer;
  const score = quizStats?.attempted ? Math.round((quizStats.correct / quizStats.attempted) * 100) : null;

  const checkAnswer = () => {
    if (selected === null || submitted) return;
    setSubmitted(true);
    onAnswer({ wasCorrect: isCorrect, question, selected });
  };

  const nextQuestion = () => {
    setIndex((current) => (current + 1) % questions.length);
    setSelected(null);
    setSubmitted(false);
  };

  return (
    <section className="tool-card quiz-tool" aria-labelledby={`${subject.id}-quiz-title`}>
      <div className="tool-card__heading">
        <div><span className="eyebrow">Quick practice</span><h3 id={`${subject.id}-quiz-title`}>Quiz check-in</h3></div>
        {score !== null && <span className="quiz-score">{score}% accuracy</span>}
      </div>
      <div className="quiz-tool__question"><span>Question {index + 1} · {question.difficulty || 'medium'}</span><p>{localizeField(question.prompt, question.promptAr, language)}</p></div>
      <div className="answer-list" role="radiogroup" aria-label="Answer choices">
        {question.options.map((option, optionIndex) => {
          const status = submitted
            ? optionIndex === question.answer
              ? 'answer-option--correct'
              : optionIndex === selected
                ? 'answer-option--incorrect'
                : ''
            : optionIndex === selected
              ? 'answer-option--selected'
              : '';
          return (
            <button key={`${option}-${optionIndex}`} type="button" className={`answer-option ${status}`} onClick={() => !submitted && setSelected(optionIndex)} role="radio" aria-checked={optionIndex === selected}>
              <span>{String.fromCharCode(65 + optionIndex)}</span>{language === 'ar' && question.optionsAr?.[optionIndex] ? question.optionsAr[optionIndex] : option}
            </button>
          );
        })}
      </div>
      {submitted && <p className={`quiz-feedback ${isCorrect ? 'quiz-feedback--correct' : 'quiz-feedback--incorrect'}`}>{isCorrect ? 'Correct. ' : 'Not quite. '}{localizeField(question.explanation, question.explanationAr, language)}</p>}
      <div className="quiz-tool__actions">
        {submitted ? <button className="secondary-button" type="button" onClick={nextQuestion}>Next question →</button> : <button className="primary-button primary-button--small" type="button" onClick={checkAnswer} disabled={selected === null}>Check answer</button>}
      </div>
    </section>
  );
}
