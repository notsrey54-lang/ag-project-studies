import { useState } from 'react';
import { getFlashcardReview } from '../lib/studyProfile';
import { localizeField } from '../lib/contentModel';

export function FlashcardDeck({ subject, reviewedCards, onReview, language = 'en' }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const cards = subject.flashcards || [];
  if (!cards.length) {
    return <section className="tool-card flashcard-tool tool-card--empty"><span className="eyebrow">Memory check</span><h3>Flashcards</h3><p>Add flashcards from the admin workspace to start reviewing this subject.</p></section>;
  }
  const card = cards[index];
  const review = getFlashcardReview({ flashcardReviews: { [subject.id]: reviewedCards || {} } }, subject.id, card.id);

  const move = (direction) => {
    setFlipped(false);
    setIndex((current) => (current + direction + cards.length) % cards.length);
  };

  const rate = (rating) => {
    onReview(card.id, rating);
    setFlipped(false);
    setIndex((current) => (current + 1) % cards.length);
  };

  const prompt = localizeField(card.prompt, card.promptAr, language);
  const answer = localizeField(card.answer, card.answerAr, language);
  const label = localizeField(card.label, card.labelAr, language);

  return (
    <section className="tool-card flashcard-tool" aria-labelledby={`${subject.id}-flashcards-title`}>
      <div className="tool-card__heading">
        <div><span className="eyebrow">Memory check</span><h3 id={`${subject.id}-flashcards-title`}>Flashcards</h3></div>
        <span className="tool-card__counter">{index + 1} / {cards.length}</span>
      </div>
      <button
        type="button"
        className={`flashcard ${flipped ? 'flashcard--flipped' : ''}`}
        onClick={() => {
          setFlipped((current) => !current);
          onReview(card.id);
        }}
        aria-label={flipped ? 'Show question side of flashcard' : 'Show answer side of flashcard'}
      >
        <span className="flashcard__label">{flipped ? (language === 'ar' ? 'الإجابة' : 'Answer') : label}</span>
        <strong>{flipped ? answer : prompt}</strong>
        <small>{flipped ? (language === 'ar' ? 'اضغط للعودة إلى السؤال' : 'Tap to return to the question') : (language === 'ar' ? 'اضغط لإظهار الإجابة' : 'Tap to reveal the answer')}</small>
      </button>
      <div className="flashcard-tool__footer">
        <button className="round-button" type="button" onClick={() => move(-1)} aria-label="Previous flashcard">←</button>
        {flipped ? (
          <div className="flashcard-ratings" aria-label="Rate this flashcard">
            <button type="button" onClick={() => rate('again')}>Again</button>
            <button type="button" onClick={() => rate('hard')}>Hard</button>
            <button type="button" className="flashcard-ratings__good" onClick={() => rate('good')}>Good</button>
            <button type="button" onClick={() => rate('easy')}>Easy</button>
          </div>
        ) : (
          <span className={review ? 'reviewed-state reviewed-state--done' : 'reviewed-state'}>{review ? `${review.rating || 'good'} review` : 'New card'}</span>
        )}
        <button className="round-button" type="button" onClick={() => move(1)} aria-label="Next flashcard">→</button>
      </div>
    </section>
  );
}
