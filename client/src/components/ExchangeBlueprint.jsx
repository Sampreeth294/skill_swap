import { Avatar, LevelBadge } from './ui.jsx';
import ScoreRing from './ScoreRing.jsx';
import { titleCase } from '../utils/helpers.js';

const WEEK = [1, 2, 3, 4, 5, 6, 0];
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

function FlowDiagram({ me, partner, youTeach, youLearn }) {
  // Each skill gets its own lane: what you teach flows right, what you learn flows left.
  const lanes = [...youTeach.map((p) => ({ ...p, dir: 'teach' })), ...youLearn.map((p) => ({ ...p, dir: 'learn' }))];
  const W = 640;
  const LANE = 62;
  const top = 72;
  const H = top + Math.max(lanes.length, 1) * LANE + 40;
  const midY = top + (lanes.length * LANE) / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="bp-flow" role="img" aria-label="Two-way exchange diagram">
      <defs>
        <marker id="arrowL" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#7357E8" /></marker>
        <marker id="arrowM" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#2E9E8F" /></marker>
      </defs>
      <rect x="20" y="44" width="130" height={H - 60} rx="24" fill="#F3F0FF" />
      <rect x={W - 150} y="44" width="130" height={H - 60} rx="24" fill="#EAF7F4" />
      <text x="85" y="28" textAnchor="middle" className="bp-col-title">You · {me.name.split(' ')[0]}</text>
      <text x={W - 85} y="28" textAnchor="middle" className="bp-col-title">{partner.name.split(' ')[0]}</text>
      {lanes.map((p, i) => {
        const chipY = top + i * LANE + LANE / 2;
        const y = midY + (chipY - midY) / 0.75; // bezier apex sits at 75% of the control offset
        const teach = p.dir === 'teach';
        const [x1, x2] = teach ? [150, W - 156] : [W - 150, 156];
        return (
          <g key={p.dir + p.skillName}>
            <path d={`M${x1},${midY} C${W / 2 + (teach ? -80 : 80)},${y} ${W / 2 + (teach ? 80 : -80)},${y} ${x2},${midY}`} fill="none" stroke={teach ? '#7357E8' : '#2E9E8F'} strokeWidth="2.5" markerEnd={`url(#${teach ? 'arrowL' : 'arrowM'})`} className={`bp-path ${teach ? '' : 'delay'}`} />
            <rect x={W / 2 - 74} y={chipY - 15} width="148" height="28" rx="14" fill="#fff" stroke={teach ? '#E0D8FF' : '#C7EBE3'} />
            <text x={W / 2} y={chipY + 4} textAnchor="middle" className="bp-skill">{teach ? `${p.skillName} →` : `← ${p.skillName}`}</text>
          </g>
        );
      })}
      <circle cx="85" cy={midY} r="26" fill="#7357E8" />
      <text x="85" y={midY + 5} textAnchor="middle" className="bp-node-text">You</text>
      <circle cx={W - 85} cy={midY} r="26" fill="#2E9E8F" />
      <text x={W - 85} y={midY + 5} textAnchor="middle" className="bp-node-text">{partner.name.split(' ')[0].slice(0, 7)}</text>
    </svg>
  );
}

function WeekOverlap({ mine, theirs, overlap }) {
  const bar = (slots, day, cls) =>
    slots.filter((s) => s.day === day).map((s, i) => (
      <span key={`${cls}${i}`} className={`wk-slot ${cls}`} style={{ left: `${(toMin(s.start) / 1440) * 100}%`, width: `${((toMin(s.end) - toMin(s.start)) / 1440) * 100}%` }} title={`${DAY[day]} ${s.start}–${s.end}`} />
    ));
  return (
    <div className="week">
      <div className="week-hours" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
      {WEEK.map((d) => (
        <div className="week-row" key={d}>
          <span className="week-day">{DAY[d]}</span>
          <div className="week-track">
            {bar(mine, d, 'mine')}
            {bar(theirs, d, 'theirs')}
            {bar(overlap, d, 'both')}
          </div>
        </div>
      ))}
      <div className="row gap-16 tiny muted wrap week-legend">
        <span><i className="wk-key mine" /> Your free time</span>
        <span><i className="wk-key theirs" /> Partner's free time</span>
        <span><i className="wk-key both" /> Overlap</span>
      </div>
    </div>
  );
}

/** The Smart Exchange Blueprint — the "why" behind a match, visualised. */
export default function ExchangeBlueprint({ blueprint }) {
  const { me, partner, match, weights } = blueprint;
  if (!match) {
    return (
      <div className="card card-pad bp-nomatch">
        <h3>No skill overlap yet</h3>
        <p className="muted">Neither of you currently wants a skill the other teaches. Add more learning goals to your profile — or browse {partner.name.split(' ')[0]}'s skills below.</p>
      </div>
    );
  }
  const pairs = [...match.youTeach.map((p) => ({ ...p, dir: 'teach' })), ...match.youLearn.map((p) => ({ ...p, dir: 'learn' }))];
  const parts = ['reciprocity', 'coverage', 'proficiency', 'availability', 'reputation'];

  return (
    <div className="blueprint">
      <section className="card bp-hero">
        <div className="bp-people">
          <div className="bp-person"><Avatar user={me} size={64} /><strong>You</strong></div>
          <div className="bp-score">
            <ScoreRing score={match.score} size={112} stroke={9} label="compatible" />
            <span className="chip chip-lavender">{titleCase(match.matchType.replace('THEY_TEACH_YOU', 'learn with credits').replace('YOU_TEACH_THEM', 'teach & earn'))}</span>
          </div>
          <div className="bp-person"><Avatar user={partner} size={64} showStatus /><strong>{partner.name}</strong></div>
        </div>
        <FlowDiagram me={me} partner={partner} youTeach={match.youTeach} youLearn={match.youLearn} />
      </section>

      <div className="grid grid-2">
        <section className="card card-pad">
          <h3 className="card-title">Score breakdown</h3>
          <p className="muted tiny">Transparent, rule-based — every point is explained.</p>
          <div className="bp-breakdown">
            {parts.map((k) => (
              <div key={k} className="bp-bar">
                <div className="row between"><span>{titleCase(k)}</span><span className="tiny"><strong>{match.breakdown[k]}</strong> / {weights[k]}</span></div>
                <div className="bp-track"><span style={{ width: `${(match.breakdown[k] / weights[k]) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section className="card card-pad">
          <h3 className="card-title">Why you match</h3>
          <ul className="bp-reasons">
            {match.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </section>
      </div>

      <section className="card card-pad">
        <h3 className="card-title">Proficiency compatibility</h3>
        <div className="bp-pairs">
          {pairs.map((p) => (
            <div key={p.dir + p.skillName} className={`bp-pair ${p.dir}`}>
              <div className="stack gap-4">
                <strong>{p.skillName}</strong>
                <span className="tiny muted">{p.dir === 'teach' ? `You teach ${partner.name.split(' ')[0]}` : `${partner.name.split(' ')[0]} teaches you`}</span>
              </div>
              <div className="row gap-8 wrap bp-levels">
                <span className="tiny muted">Teacher</span><LevelBadge level={p.teacherLevel} />
                <span className="bp-gap" aria-hidden="true">→</span>
                <span className="tiny muted">Learner</span><LevelBadge level={p.learnerLevel} />
              </div>
              <div className="bp-fit"><span style={{ width: `${p.fitPercent}%` }} /><em>{p.fitPercent}% fit</em></div>
            </div>
          ))}
        </div>
      </section>

      <section className="card card-pad">
        <div className="row between wrap gap-8">
          <h3 className="card-title">Availability overlap</h3>
          <span className="chip chip-mint">{Math.round(match.overlapMinutes / 60)} h / week shared</span>
        </div>
        <WeekOverlap mine={me.availability} theirs={partner.availability} overlap={match.overlap} />
      </section>

      <div className="grid grid-2">
        <SkillLists title="What you bring" offers={blueprint.myOffers} wants={blueprint.myWants} />
        <SkillLists title={`What ${partner.name.split(' ')[0]} brings`} offers={blueprint.theirOffers} wants={blueprint.theirWants} />
      </div>
    </div>
  );
}

function SkillLists({ title, offers, wants }) {
  return (
    <section className="card card-pad">
      <h3 className="card-title">{title}</h3>
      <span className="label">Can teach</span>
      <div className="row wrap gap-6">{offers.length ? offers.map((s) => <span key={s.id} className="chip chip-lavender">{s.name} · {titleCase(s.level)}</span>) : <span className="muted tiny">Nothing listed</span>}</div>
      <span className="label mt-12">Wants to learn</span>
      <div className="row wrap gap-6">{wants.length ? wants.map((s) => <span key={s.id} className="chip chip-mint">{s.name}{s.status === 'COMPLETED' ? ' ✓' : ''}</span>) : <span className="muted tiny">Nothing listed</span>}</div>
    </section>
  );
}
