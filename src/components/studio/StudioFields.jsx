import { useEffect, useRef, useState } from 'react';

export const lineList = (value) => String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
export const linesText = (value) => Array.isArray(value) ? value.join('\n') : '';

export function StudioField({ label, value, onChange, placeholder = '', type = 'text', min, max, step, help, dir }) {
  return <label className="studio-field"><span>{label}</span><input type={type} value={value ?? ''} min={min} max={max} step={step} dir={dir} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{help ? <small>{help}</small> : null}</label>;
}

export function StudioText({ label, value, onChange, placeholder = '', rows = 5, dir, help }) {
  return <label className="studio-field studio-field--wide"><span>{label}</span><textarea value={value ?? ''} rows={rows} dir={dir} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{help ? <small>{help}</small> : null}</label>;
}

export function LanguageFields({ value, onChange, label = 'Text', rows = 5 }) {
  const content = value || {};
  return <div className="studio-language-grid"><StudioText label={`${label} · English`} value={content.text} onChange={(text) => onChange({ ...content, text })} rows={rows} /><StudioText label={`${label} · Arabic`} value={content.textAr} onChange={(textAr) => onChange({ ...content, textAr })} dir="rtl" rows={rows} /></div>;
}

export function JsonField({ label, value, onChange, help }) {
  const [draft, setDraft] = useState(() => JSON.stringify(value || {}, null, 2));
  const [valid, setValid] = useState(true);
  useEffect(() => {
    setDraft(JSON.stringify(value || {}, null, 2));
    setValid(true);
  }, [value]);
  const change = (next) => {
    setDraft(next);
    try {
      onChange(JSON.parse(next));
      setValid(true);
    } catch {
      setValid(false);
    }
  };
  return <label className="studio-field studio-field--wide"><span>{label}</span><textarea className={!valid ? 'studio-json--invalid' : ''} value={draft} rows={8} spellCheck="false" onChange={(event) => change(event.target.value)} />{!valid ? <small className="studio-field__error">JSON is incomplete or invalid.</small> : help ? <small>{help}</small> : null}</label>;
}

export function DrawingPad({ value, onChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#5b4a12');
  const [width, setWidth] = useState(4);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 960;
    canvas.height = 440;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fffdf5';
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (value) {
      const image = new Image();
      image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.src = value;
    }
  }, [value]);

  const point = (event) => {
    const canvas = canvasRef.current;
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * (canvas.width / bounds.width), y: (event.clientY - bounds.top) * (canvas.height / bounds.height) };
  };
  const start = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = canvasRef.current.getContext('2d');
    const { x, y } = point(event);
    context.beginPath();
    context.moveTo(x, y);
    drawingRef.current = true;
  };
  const move = (event) => {
    if (!drawingRef.current) return;
    const context = canvasRef.current.getContext('2d');
    const { x, y } = point(event);
    context.lineTo(x, y);
    context.strokeStyle = tool === 'eraser' ? '#fffdf5' : color;
    context.lineWidth = tool === 'eraser' ? Math.max(width * 3, 12) : width;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.stroke();
  };
  const end = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onChange(canvasRef.current.toDataURL('image/png'));
  };
  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fffdf5';
    context.fillRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return <div className="studio-drawing"><div className="studio-drawing__toolbar"><button type="button" className={tool === 'pen' ? 'studio-tool-button studio-tool-button--active' : 'studio-tool-button'} onClick={() => setTool('pen')}>Pen</button><button type="button" className={tool === 'eraser' ? 'studio-tool-button studio-tool-button--active' : 'studio-tool-button'} onClick={() => setTool('eraser')}>Eraser</button><label>Colour <input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label><label>Width <input type="range" min="1" max="18" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label><button type="button" className="studio-tool-button" onClick={clear}>Clear</button></div><canvas ref={canvasRef} className="studio-canvas" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onPointerLeave={end} aria-label="Drawing editor" /></div>;
}
