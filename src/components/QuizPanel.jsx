import { useState } from 'react';

const normalizeAnswer = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const questionLabel = (question) => ({
  mcq: 'Multiple choice',
  true_false: 'True / false',
  short_answer: 'Short answer',
  paragraph: 'Paragraph response',
  bullet_point: 'Bullet-point response',
  matching: 'Matching',
  ordering: 'Ordering',
  formula: 'Formula response',
}[question.questionType] || 'Question');

const answerOptions = (question) => question.questionType === 'true_false' ? ['True', 'False'] : question.options || [];

export function QuizPanel({ subject, quizStats, onAnswer }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const questions = subject.quiz || [];
  if (questions.length === 0) {
    return <section className="tool-card quiz-tool" aria-labelledby={`${subject.id}-quiz-title`}><div className="tool-card__heading"><div><span className="eyebrow">Quick practice</span><h3 id={`${subject.id}-quiz-title`}>Quiz check-in</h3></div><span className="quiz-score">0 questions</span></div><div className="tool-empty"><strong>No quiz questions yet</strong><p>The administrator can build an assessment bank from the subject content panel.</p></div></section>;
  }
  const question = questions[index];
  const options = answerOptions(question);
  const autoGraded = question.questionType === 'mcq' || question.questionType === 'true_false' || Boolean(question.correctAnswer?.trim());
  const selectedText = typeof selected === 'number' ? options[selected] : textAnswer;
  const expectedText = question.questionType === 'mcq' ? options[question.answer] : question.questionType === 'true_false' ? (question.correctAnswer || options[question.answer] || '') : question.correctAnswer;
  const isCorrect = autoGraded && (question.questionType === 'mcq' ? selected === question.answer : normalizeAnswer(selectedText) === normalizeAnswer(expectedText));
  const score = quizStats?.attempted ? Math.round((quizStats.correct / quizStats.attempted) * 100) : null;

  const checkAnswer = () => {
    if ((selected === null && !textAnswer.trim()) || submitted) return;
    setSubmitted(true);
    if (autoGraded) onAnswer(isCorrect);
  };
  const nextQuestion = () => {
    setIndex((current) => (current + 1) % questions.length);
    setSelected(null);
    setTextAnswer('');
    setSubmitted(false);
  };
  const resetQuestion = () => { setSelected(null); setTextAnswer(''); setSubmitted(false); };

  return <section className="tool-card quiz-tool" aria-labelledby={`${subject.id}-quiz-title`}>
    <div className="tool-card__heading"><div><span className="eyebrow">Quick practice</span><h3 id={`${subject.id}-quiz-title`}>Quiz check-in</h3></div>{score !== null && <span className="quiz-score">{score}% accuracy</span>}</div>
    <div className="quiz-tool__question"><span>Question {index + 1} of {questions.length} · {questionLabel(question)}{question.points ? ` · ${question.points} pt` : ''}</span><p>{question.prompt}</p>{question.promptAr ? <p dir="rtl" className="content-arabic">{question.promptAr}</p> : null}</div>
    {question.hint && !submitted ? <details className="quiz-hint"><summary>Show hint</summary><p>{question.hint}</p>{question.hintAr ? <p dir="rtl" className="content-arabic">{question.hintAr}</p> : null}</details> : null}
    {options.length ? <div className="answer-list" role="radiogroup" aria-label="Answer choices">{options.map((option, optionIndex) => { const status = submitted ? optionIndex === (question.questionType === 'mcq' ? question.answer : (normalizeAnswer(expectedText) === normalizeAnswer(option) ? optionIndex : -1)) ? 'answer-option--correct' : optionIndex === selected ? 'answer-option--incorrect' : '' : optionIndex === selected ? 'answer-option--selected' : ''; return <button key={`${question.id}-${optionIndex}`} type="button" className={`answer-option ${status}`} onClick={() => !submitted && setSelected(optionIndex)} role="radio" aria-checked={optionIndex === selected}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}</button>; })}</div> : <textarea className="quiz-text-answer" value={textAnswer} onChange={(event) => setTextAnswer(event.target.value)} disabled={submitted} placeholder={question.responseFormat === 'bullet' || question.questionType === 'bullet_point' ? 'Write one bullet point per line…' : 'Write your answer…'} rows={question.questionType === 'short_answer' ? 3 : 6} />}
    {submitted ? <p className={`quiz-feedback ${autoGraded && isCorrect ? 'quiz-feedback--correct' : autoGraded ? 'quiz-feedback--incorrect' : ''}`}>{autoGraded ? (isCorrect ? 'Correct. ' : 'Not quite. ') : 'Answer submitted for review. '}{question.explanation}{question.explanationAr ? <><br /><span dir="rtl" className="content-arabic">{question.explanationAr}</span></> : null}{!isCorrect && question.modelAnswer ? <><br /><strong>Model answer:</strong> {question.modelAnswer}</> : null}{!isCorrect && question.modelAnswerAr ? <><br /><span dir="rtl" className="content-arabic">{question.modelAnswerAr}</span></> : null}</p> : null}
    <div className="quiz-tool__actions">{submitted ? <><button className="secondary-button" type="button" onClick={nextQuestion}>Next question →</button><button className="text-button" type="button" onClick={resetQuestion}>Try again</button></> : <button className="primary-button primary-button--small" type="button" onClick={checkAnswer} disabled={selected === null && !textAnswer.trim()}>Check answer</button>}</div>
  </section>;
}
