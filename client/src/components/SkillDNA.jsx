import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { SKILL_DNA } from '../graphql/queries/index.js';
import { Avatar } from './ui.jsx';
import { Skeleton } from './Loader.jsx';
import { titleCase, cx } from '../utils/helpers.js';

/**
 * Skill DNA — a data-driven constellation of a person's skills.
 * Inner orbit: skills they teach (mastered ones glow gold).
 * Middle orbit: skills they are learning (learned ones are checked).
 * Outer orbit: free-form learning interests.
 * Angle = category cluster, node size = weight (level, sessions, experience).
 */
const KINDS = [
  { kind: 'TEACH', label: 'Teaches', ring: 0 },
  { kind: 'MASTERED', label: 'Mastered', ring: 0 },
  { kind: 'LEARN', label: 'Learning', ring: 1 },
  { kind: 'LEARNED', label: 'Learned', ring: 1 },
  { kind: 'INTEREST', label: 'Interests', ring: 2 },
];
const RADII = [118, 190, 250];
const SIZE = 600;
const C = SIZE / 2;

function layout(nodes) {
  // Order by category so related skills cluster into the same sector of every orbit
  const catOrder = [...new Set(nodes.filter((n) => n.category).map((n) => n.category.name))].sort();
  const angleOf = (n, i, total) => {
    const ci = n.category ? catOrder.indexOf(n.category.name) : catOrder.length;
    const sector = (2 * Math.PI) / Math.max(1, catOrder.length + 1);
    return { ci, raw: i / Math.max(1, total), sector };
  };
  const out = [];
  [0, 1, 2].forEach((ring) => {
    const list = nodes
      .filter((n) => KINDS.find((k) => k.kind === n.kind).ring === ring)
      .sort((a, b) => (a.category?.name || 'zz').localeCompare(b.category?.name || 'zz') || b.weight - a.weight);
    const offset = ring * 0.45;
    list.forEach((n, i) => {
      const { ci } = angleOf(n, i, list.length);
      const base = (i / Math.max(1, list.length)) * Math.PI * 2 - Math.PI / 2 + offset;
      const a = list.length <= 2 ? base + ci * 0.25 : base;
      const r = RADII[ring];
      out.push({ ...n, ring, x: C + r * Math.cos(a), y: C + r * Math.sin(a), angle: a, r: ring === 2 ? 7 : 11 + n.weight * 12 });
    });
  });
  return out;
}

export default function SkillDNA({ userId, compact = false }) {
  const { data, loading } = useQuery(SKILL_DNA, { variables: { userId } });
  const [hidden, setHidden] = useState(new Set());
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);
  const [focusCat, setFocusCat] = useState(null);
  const dna = data?.skillDNA;
  const placed = useMemo(() => (dna ? layout(dna.nodes) : []), [dna]);

  if (loading && !dna) return <div className="card card-pad"><Skeleton h={compact ? 260 : 420} r={24} /></div>;
  if (!dna) return null;

  const visible = placed.filter((n) => !hidden.has(n.kind));
  const active = selected || hover;
  const dim = (n) => (focusCat && n.category?.id !== focusCat) || (active && active.id !== n.id && active.category?.id !== n.category?.id);
  const toggle = (k) => setHidden((h) => { const x = new Set(h); x.has(k) ? x.delete(k) : x.add(k); return x; });

  const sameCatLinks = [];
  for (const a of visible.filter((n) => n.ring === 0)) {
    for (const b of visible.filter((n) => n.ring === 1 && n.category && n.category.id === a.category?.id)) sameCatLinks.push([a, b]);
  }

  return (
    <div className={cx('dna', compact && 'dna-compact')}>
      <div className="dna-canvas card">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`Skill DNA constellation for ${dna.user.name}`}>
          <defs>
            <radialGradient id="dnaGlow"><stop offset="0%" stopColor="#E8E1FF" /><stop offset="100%" stopColor="#F8F7FF" stopOpacity="0" /></radialGradient>
            <filter id="dnaShadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#7357E8" floodOpacity="0.18" /></filter>
          </defs>
          <circle cx={C} cy={C} r={270} fill="url(#dnaGlow)" />
          {RADII.map((r, i) => (
            <circle key={r} cx={C} cy={C} r={r} fill="none" stroke="#E5E0F5" strokeWidth={i === 2 ? 1 : 1.5} strokeDasharray={i === 2 ? '3 7' : '2 5'} className="dna-orbit" />
          ))}
          {visible.filter((n) => n.ring === 0).map((n) => (
            <line key={`c${n.id}`} x1={C} y1={C} x2={n.x} y2={n.y} stroke={n.category?.color || '#7357E8'} strokeOpacity={dim(n) ? 0.06 : 0.25} strokeWidth="1.5" />
          ))}
          {sameCatLinks.map(([a, b]) => (
            <path key={`l${a.id}${b.id}`} d={`M${a.x},${a.y} Q${C + (a.x + b.x - 2 * C) * 0.9},${C + (a.y + b.y - 2 * C) * 0.9} ${b.x},${b.y}`}
              fill="none" stroke={a.category.color} strokeOpacity={dim(a) && dim(b) ? 0.05 : 0.3} strokeWidth="1.5" strokeDasharray="4 4" />
          ))}

          <g filter="url(#dnaShadow)">
            <circle cx={C} cy={C} r={44} fill="#7357E8" />
            <circle cx={C} cy={C} r={52} fill="none" stroke="#7357E8" strokeOpacity="0.2" strokeWidth="6" />
          </g>
          <text x={C} y={C - 4} textAnchor="middle" className="dna-center-name">{dna.user.name.split(' ')[0]}</text>
          <text x={C} y={C + 14} textAnchor="middle" className="dna-center-sub">{dna.totals.teach} ⇄ {dna.totals.learn}</text>

          {visible.map((n) => {
            const color = n.category?.color || '#9C99B0';
            const filled = n.kind === 'TEACH' || n.kind === 'MASTERED';
            const labelRight = Math.cos(n.angle) >= 0;
            return (
              <g key={n.id} className={cx('dna-node', dim(n) && 'dim', active?.id === n.id && 'active')} transform={`translate(${n.x},${n.y})`}
                onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)} onClick={() => setSelected(selected?.id === n.id ? null : n)}
                tabIndex={0} role="button" aria-label={`${n.label}, ${titleCase(n.kind)}`} onKeyDown={(e) => e.key === 'Enter' && setSelected(n)}>
                <circle r={n.r + 10} fill="transparent" />
                {n.kind === 'MASTERED' && <circle r={n.r + 5} fill="none" stroke="#F5B83D" strokeWidth="2.5" />}
                <circle r={n.r} fill={filled ? color : '#fff'} stroke={color} strokeWidth={filled ? 0 : 2.5} strokeDasharray={n.kind === 'INTEREST' ? '3 3' : undefined} />
                {n.kind === 'LEARNED' && <path d="M-5 0l3.5 3.5L5.5-4" stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
                {!compact && (
                  <text x={labelRight ? n.r + 8 : -n.r - 8} y="4" textAnchor={labelRight ? 'start' : 'end'} className="dna-label">{n.label}</text>
                )}
              </g>
            );
          })}
        </svg>

        {active && (
          <div className="dna-tooltip">
            <span className="chip chip-cat" style={{ '--cat': active.category?.color || '#9C99B0' }}>{active.category?.icon} {active.category?.name || 'Interest'}</span>
            <strong>{active.label}</strong>
            <span className="muted tiny">
              {titleCase(active.kind)}{active.level ? ` · ${titleCase(active.level)}` : ''}{active.sessions ? ` · ${active.sessions} session${active.sessions > 1 ? 's' : ''}` : ''}
            </span>
            {active.kind !== 'INTEREST' && <div className="dna-weight"><span style={{ width: `${active.weight * 100}%` }} /></div>}
          </div>
        )}
      </div>

      <div className="dna-side">
        {!compact && (
          <div className="row gap-10 dna-owner">
            <Avatar user={dna.user} size={40} />
            <div className="stack gap-2"><strong>{dna.user.name}</strong><span className="tiny muted">Strongest in {dna.strongestCategory ? `${dna.strongestCategory.icon} ${dna.strongestCategory.name}` : '—'}</span></div>
          </div>
        )}
        <div className="dna-legend" role="group" aria-label="Filter skill types">
          {KINDS.map((k) => (
            <button key={k.kind} className={cx('dna-legend-item', `k-${k.kind.toLowerCase()}`, hidden.has(k.kind) && 'off')} onClick={() => toggle(k.kind)} aria-pressed={!hidden.has(k.kind)}>
              <i aria-hidden="true" />{k.label}<span>{placed.filter((n) => n.kind === k.kind).length}</span>
            </button>
          ))}
        </div>
        {!compact && (
          <div className="dna-cats">
            <span className="label">Strongest categories</span>
            {dna.categories.slice(0, 6).map((c) => (
              <button key={c.category.id} className={cx('dna-cat', focusCat === c.category.id && 'on')} onMouseEnter={() => setFocusCat(c.category.id)} onMouseLeave={() => setFocusCat(null)} onFocus={() => setFocusCat(c.category.id)} onBlur={() => setFocusCat(null)}>
                <span className="row between"><span>{c.category.icon} {c.category.name}</span><span className="tiny muted">{c.teach} teach · {c.learn} learn</span></span>
                <span className="dna-cat-bar"><span style={{ width: `${c.score * 100}%`, background: c.category.color }} /></span>
              </button>
            ))}
            {!dna.categories.length && <p className="muted tiny">Add skills to grow your DNA.</p>}
          </div>
        )}
        {compact && <Link to="/passport" className="link-arrow">Explore your full Skill DNA →</Link>}
      </div>
    </div>
  );
}
