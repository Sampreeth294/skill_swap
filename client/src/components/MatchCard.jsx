import { Link } from 'react-router-dom';
import { Avatar, Stars } from './ui.jsx';
import ScoreRing from './ScoreRing.jsx';
import Icon from './Icon.jsx';

const TYPE_LABEL = {
  MUTUAL: { text: 'Mutual swap', cls: 'chip-lavender' },
  THEY_TEACH_YOU: { text: 'Learn with credits', cls: 'chip-blue' },
  YOU_TEACH_THEM: { text: 'Teach & earn', cls: 'chip-mint' },
};
const RELATION_LABEL = { CONNECTED: 'Connected', PENDING_SENT: 'Request sent', PENDING_RECEIVED: 'Wants to swap with you' };

export default function MatchCard({ match, onRequest, compact = false }) {
  const { user } = match;
  const t = TYPE_LABEL[match.matchType];
  const learn = match.youLearn.map((p) => p.skillName);
  const teach = match.youTeach.map((p) => p.skillName);
  return (
    <article className={`card match-card hover-lift ${compact ? 'compact' : ''}`}>
      <div className="match-card-head">
        <Link to={`/users/${user.id}`} className="row gap-12 grow owner-link">
          <Avatar user={user} size={compact ? 42 : 52} showStatus />
          <div className="stack gap-2">
            <strong>{user.name}</strong>
            <span className="muted tiny">{user.headline || user.location}</span>
            <Stars value={user.ratingAvg} count={user.ratingCount} size={12} />
          </div>
        </Link>
        <ScoreRing score={match.score} size={compact ? 54 : 72} stroke={compact ? 5 : 6} />
      </div>

      <div className="swap-line">
        <div className="swap-side">
          <span className="tiny muted">You learn</span>
          <div className="row wrap gap-6">{learn.length ? learn.map((s) => <span key={s} className="chip chip-blue">{s}</span>) : <span className="tiny muted">—</span>}</div>
        </div>
        <span className="swap-arrows" aria-hidden="true"><Icon name="swap" size={20} /></span>
        <div className="swap-side right">
          <span className="tiny muted">You teach</span>
          <div className="row wrap gap-6 end">{teach.length ? teach.map((s) => <span key={s} className="chip chip-mint">{s}</span>) : <span className="tiny muted">credits</span>}</div>
        </div>
      </div>

      {!compact && <p className="match-reason">{match.reasons[0]}</p>}

      <div className="row between gap-8 wrap">
        <span className={`chip ${t.cls}`}>{t.text}</span>
        {RELATION_LABEL[match.relation] && <span className="chip chip-soft">{RELATION_LABEL[match.relation]}</span>}
      </div>
      <div className="row gap-8">
        <Link to={`/blueprint/${user.id}`} className="btn btn-soft btn-sm grow">Exchange Blueprint</Link>
        {onRequest && match.relation === 'NONE' && match.youLearn.length > 0 && (
          <button className="btn btn-primary btn-sm grow" onClick={() => onRequest(match)}>Request swap</button>
        )}
        {match.relation === 'CONNECTED' && <Link to="/chat" className="btn btn-primary btn-sm grow">Message</Link>}
        {match.relation === 'PENDING_RECEIVED' && <Link to="/requests" className="btn btn-primary btn-sm grow">Respond</Link>}
      </div>
    </article>
  );
}
