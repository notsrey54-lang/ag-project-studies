import { useMemo, useState } from 'react';
import { ContentBlockReader } from '../ContentBlockReader.jsx';

export function LivePreview({ subject, selectedBlockId }) {
  const [device, setDevice] = useState('desktop');
  const [scope, setScope] = useState('selected');
  const blocks = useMemo(() => {
    const all = subject.contentBlocks || [];
    if (scope === 'selected' && selectedBlockId) return all.filter((block) => block.id === selectedBlockId);
    return all;
  }, [scope, selectedBlockId, subject.contentBlocks]);

  return <aside className="studio-preview" aria-label="Live student preview">
    <div className="studio-preview__header"><div><span className="studio-live-dot" /> <strong>Live student view</strong><small>Updates as you edit</small></div><div className="studio-preview__scope"><button type="button" className={scope === 'selected' ? 'is-active' : ''} onClick={() => setScope('selected')}>Selected</button><button type="button" className={scope === 'all' ? 'is-active' : ''} onClick={() => setScope('all')}>Full page</button></div></div>
    <div className="studio-preview__devices" role="group" aria-label="Preview width">{[['desktop', 'Desktop'], ['tablet', 'Tablet'], ['mobile', 'Phone']].map(([id, label]) => <button type="button" key={id} className={device === id ? 'is-active' : ''} onClick={() => setDevice(id)}>{label}</button>)}</div>
    <div className="studio-preview__viewport"><div className={`studio-preview__device studio-preview__device--${device}`}>
      <div className="preview-browser-bar"><span /><span /><span /><strong>{subject.code.toLowerCase()}-study</strong></div>
      <div className={`preview-course preview-course--${subject.color}`}>
        <header className="preview-course__hero"><span>{subject.eyebrow || 'Study material'}</span><h2>{subject.code}</h2><p>{subject.name}</p></header>
        {blocks.length ? <ContentBlockReader subject={subject} blocks={blocks} compact /> : <div className="preview-course__empty"><strong>Nothing to preview yet.</strong><span>Add a document block or slide deck.</span></div>}
        {scope === 'all' && subject.resources?.length ? <section className="preview-resources"><span>Resources</span>{subject.resources.map((resource) => <div key={resource.id}><b>{resource.type}</b><strong>{resource.title}</strong></div>)}</section> : null}
      </div>
    </div></div>
  </aside>;
}
