import { useState } from 'react';

export function FlashcardDeck({ subject, reviewedCards, onReview }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const cards = subject.flashcards;
  const card = cards[index];
  const reviewed = Boolean(reviewedCards?.[card.id]);

  const move = (direction) => {
    onReview(card.id);
    setFlipped(false);
    setIndex((current) => (current + direction + cards.length) % cards.length);
  };

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
        <span className="flashcard__label">{flipped ? 'Answer' : card.label}</span>
        <strong>{flipped ? card.answer : card.prompt}</strong>
        <small>{flipped ? 'Tap to return to the question' : 'Tap to reveal the answer'}</small>
      </button>
      <div className="flashcard-tool__footer">
        <button className="round-button" type="button" onClick={() => move(-1)} aria-label="Previous flashcard">←</button>
        <span className={reviewed ? 'reviewed-state reviewed-state--done' : 'reviewed-state'}>{reviewed ? 'Reviewed' : 'New card'}</span>
        <button className="round-button" type="button" onClick={() => move(1)} aria-label="Next flashcard">→</button>
      </div>
    </section>
  );
}
