import { scoreTone } from '../utils/helpers.js';

export default function ScoreRing({ score = 0, size = 64, stroke = 6, label = 'match' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={`score-ring tone-${scoreTone(score)}`} style={{ width: size, height: size }} title={`${score}% compatibility`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-value" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="score-ring-text">
        <strong style={{ fontSize: size * 0.27 }}>{score}<small>%</small></strong>
        {size >= 72 && <span>{label}</span>}
      </div>
    </div>
  );
}
