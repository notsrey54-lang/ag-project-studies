export function ProgressRing({ percent, label = 'complete', compact = false }) {
  const size = compact ? 52 : 72;
  const stroke = compact ? 5 : 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;

  return (
    <div className={`progress-ring ${compact ? 'progress-ring--compact' : ''}`} aria-label={`${percent}% ${label}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-hidden="true">
        <circle className="progress-ring__track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle
          className="progress-ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span>{percent}%</span>
    </div>
  );
}
