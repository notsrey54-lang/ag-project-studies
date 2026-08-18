export function NotesPanel({ subject, note, onChange }) {
  return (
    <section className="tool-card notes-tool" aria-labelledby={`${subject.id}-notes-title`}>
      <div className="tool-card__heading">
        <div><span className="eyebrow">Your space</span><h3 id={`${subject.id}-notes-title`}>Study notes</h3></div>
        <span className="notes-tool__saved">Saved</span>
      </div>
      <p className="tool-card__description">Capture the rule, example, or question you want to revisit later.</p>
      <label className="sr-only" htmlFor={`${subject.id}-notes`}>Notes for {subject.code}</label>
      <textarea id={`${subject.id}-notes`} value={note || ''} onChange={(event) => onChange(event.target.value)} placeholder={`Write a helpful ${subject.code} note…`} maxLength="4000" />
      <div className="notes-tool__footer"><span>{(note || '').length} / 4000</span><span>Saved automatically on this device</span></div>
    </section>
  );
}
