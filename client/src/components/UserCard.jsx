import { Link } from 'react-router-dom';
import { Avatar, Stars } from './ui.jsx';
import Icon from './Icon.jsx';

export default function UserCard({ user, footer }) {
  return (
    <article className="card user-card hover-lift">
      <div className="user-card-banner" aria-hidden="true" />
      <Link to={`/users/${user.id}`} className="user-card-avatar"><Avatar user={user} size={72} showStatus /></Link>
      <h3><Link to={`/users/${user.id}`}>{user.name}</Link></h3>
      {user.headline && <p className="muted user-card-headline">{user.headline}</p>}
      <div className="row gap-12 center wrap tiny muted">
        {user.location && <span><Icon name="pin" size={13} /> {user.location}</span>}
        <span><Icon name="swap" size={13} /> {user.completedExchanges} exchanges</span>
      </div>
      <Stars value={user.ratingAvg} count={user.ratingCount} />
      {user.teachSkills?.length > 0 && (
        <div className="row wrap gap-6 center">
          <span className="tiny muted">Teaches</span>
          {user.teachSkills.slice(0, 3).map((s) => <span key={s.id} className="chip chip-lavender">{s.name}</span>)}
        </div>
      )}
      {user.learnSkills?.length > 0 && (
        <div className="row wrap gap-6 center">
          <span className="tiny muted">Learning</span>
          {user.learnSkills.slice(0, 2).map((s) => <span key={s.id} className="chip chip-mint">{s.name}</span>)}
        </div>
      )}
      {footer}
    </article>
  );
}
