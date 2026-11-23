import { Link } from 'react-router-dom';
import { Avatar, CategoryChip, LevelBadge, Stars } from './ui.jsx';
import ScoreRing from './ScoreRing.jsx';
import Icon from './Icon.jsx';

/** Marketplace card: a teachable skill + the person who teaches it. */
export default function SkillCard({ skill, onRequest }) {
  const owner = skill.owner;
  const years = skill.experienceMonths >= 12 ? `${Math.round(skill.experienceMonths / 12)}y exp` : skill.experienceMonths ? `${skill.experienceMonths}mo exp` : null;
  return (
    <article className="card skill-card hover-lift">
      <div className="skill-card-top" style={{ '--cat': skill.category?.color || '#7357E8' }}>
        <CategoryChip category={skill.category} />
        {skill.matchScore != null && <ScoreRing score={skill.matchScore} size={46} stroke={4} />}
      </div>
      <h3 className="skill-card-name">{skill.name}</h3>
      <div className="row gap-8 wrap">
        <LevelBadge level={skill.level} />
        {years && <span className="chip chip-soft"><Icon name="clock" size={13} /> {years}</span>}
      </div>
      {skill.description && <p className="skill-card-desc">{skill.description}</p>}
      <div className="skill-card-owner">
        <Link to={`/users/${owner.id}`} className="row gap-10 owner-link">
          <Avatar user={owner} size={38} showStatus />
          <div className="stack gap-2">
            <strong>{owner.name}</strong>
            <Stars value={owner.ratingAvg} count={owner.ratingCount} size={12} />
          </div>
        </Link>
      </div>
      {owner.availability?.length > 0 && (
        <p className="tiny muted"><Icon name="calendar" size={13} /> {owner.availability.slice(0, 2).map((a) => `${a.dayLabel} ${a.start}–${a.end}`).join(' · ')}{owner.availability.length > 2 ? ' …' : ''}</p>
      )}
      <div className="row gap-8 skill-card-actions">
        <Link to={`/users/${owner.id}`} className="btn btn-soft btn-sm grow">View profile</Link>
        {onRequest && <button className="btn btn-primary btn-sm grow" onClick={() => onRequest(skill)}>Request swap</button>}
      </div>
    </article>
  );
}
