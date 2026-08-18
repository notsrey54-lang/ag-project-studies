import { useState } from 'react';

const formulaQuestions = [
  { prompt: 'If Qd = 100 − 2P and Qs = 20 + 2P, what is equilibrium price P?', answer: 20, explanation: 'Set Qd equal to Qs: 100 − 2P = 20 + 2P, so 80 = 4P and P = 20.' },
  { prompt: 'Revenue is 150,000 KD and explicit costs are 80,000 KD. What is accounting profit?', answer: 70000, explanation: 'Accounting profit = revenue − explicit costs = 70,000 KD.' },
  { prompt: 'Accounting profit is 70,000 KD and implicit costs are 20,000 KD. What is economic profit?', answer: 50000, explanation: 'Economic profit = accounting profit − implicit costs = 50,000 KD.' },
];

const shiftLabel = (value) => value === 'right' ? 'right' : value === 'left' ? 'left' : 'no shift';

export function EconomicsLab({ language = 'en' }) {
  const [demandShift, setDemandShift] = useState('same');
  const [supplyShift, setSupplyShift] = useState('same');
  const [formulaIndex, setFormulaIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const question = formulaQuestions[formulaIndex];
  const demandX = demandShift === 'right' ? 25 : demandShift === 'left' ? -25 : 0;
  const supplyX = supplyShift === 'right' ? 25 : supplyShift === 'left' ? -25 : 0;
  const outcome = demandShift === 'right' && supplyShift === 'same' ? 'Demand increases: equilibrium price and quantity usually rise.' : demandShift === 'left' && supplyShift === 'same' ? 'Demand decreases: equilibrium price and quantity usually fall.' : supplyShift === 'right' && demandShift === 'same' ? 'Supply increases: equilibrium price usually falls while quantity rises.' : supplyShift === 'left' && demandShift === 'same' ? 'Supply decreases: equilibrium price usually rises while quantity falls.' : 'Move one curve at a time to observe the basic market effect.';

  const checkFormula = () => {
    const numeric = Number(String(answer).replace(/,/g, '').trim());
    setFeedback(numeric === question.answer ? 'correct' : 'incorrect');
  };

  const nextFormula = () => {
    setFormulaIndex((index) => (index + 1) % formulaQuestions.length);
    setAnswer('');
    setFeedback(null);
  };

  return (
    <section className="economics-lab" aria-labelledby="economics-lab-title">
      <div className="tool-card__heading"><div><span className="eyebrow">Subject laboratory</span><h2 id="economics-lab-title">Economics graph & formula lab</h2></div><span>{language === 'ar' ? 'تدريب عملي' : 'Interactive practice'}</span></div>
      <div className="economics-lab__grid">
        <div className="economics-graph-card">
          <div className="economics-graph-card__top"><div><h3>Market shifts</h3><p>Change one non-price factor and read the expected result.</p></div><span className="graph-equilibrium-dot" aria-hidden="true" /></div>
          <svg className="economics-graph" viewBox="0 0 360 250" role="img" aria-label="Supply and demand graph">
            <line x1="38" y1="218" x2="330" y2="218" className="graph-axis" /><line x1="38" y1="218" x2="38" y2="24" className="graph-axis" />
            <path d={`M ${50 + demandX} 38 L ${300 + demandX} 205`} className="graph-curve graph-curve--demand" /><path d={`M ${50 + supplyX} 205 L ${300 + supplyX} 38`} className="graph-curve graph-curve--supply" />
            <text x="306" y="213" className="graph-label">Q</text><text x="24" y="32" className="graph-label">P</text><text x={demandX + 78} y="64" className="graph-label graph-label--demand">D</text><text x={supplyX + 76} y="75" className="graph-label graph-label--supply">S</text>
          </svg>
          <div className="shift-controls"><div><span>Demand</span><button type="button" className={demandShift === 'left' ? 'shift-button shift-button--active' : 'shift-button'} onClick={() => setDemandShift('left')}>← Left</button><button type="button" className={demandShift === 'same' ? 'shift-button shift-button--active' : 'shift-button'} onClick={() => setDemandShift('same')}>Same</button><button type="button" className={demandShift === 'right' ? 'shift-button shift-button--active' : 'shift-button'} onClick={() => setDemandShift('right')}>Right →</button></div><div><span>Supply</span><button type="button" className={supplyShift === 'left' ? 'shift-button shift-button--active' : 'shift-button'} onClick={() => setSupplyShift('left')}>← Left</button><button type="button" className={supplyShift === 'same' ? 'shift-button shift-button--active' : 'shift-button'} onClick={() => setSupplyShift('same')}>Same</button><button type="button" className={supplyShift === 'right' ? 'shift-button shift-button--active' : 'shift-button'} onClick={() => setSupplyShift('right')}>Right →</button></div></div>
          <p className="graph-outcome"><b>Current:</b> demand {shiftLabel(demandShift)}, supply {shiftLabel(supplyShift)}. {outcome}</p>
        </div>
        <div className="formula-card">
          <span className="eyebrow">Formula rehearsal</span><h3>Calculate, then check</h3><p className="formula-prompt">{question.prompt}</p><label className="field-label" htmlFor="formula-answer">Your answer</label><input id="formula-answer" className="admin-input" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Enter a number" inputMode="decimal" /><div className="formula-actions"><button type="button" className="primary-button primary-button--small" onClick={checkFormula}>Check</button><button type="button" className="text-button" onClick={nextFormula}>Next</button></div>{feedback && <p className={`formula-feedback formula-feedback--${feedback}`}>{feedback === 'correct' ? 'Correct.' : `Not yet. ${question.explanation}`}</p>}</div>
      </div>
    </section>
  );
}
