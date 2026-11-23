import { NavLink } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { UNREAD_COUNTS } from '../graphql/queries/index.js';

const GROUPS = [
  { title: 'Discover', items: [
    { to: '/dashboard', label: 'Dashboard', icon: 'home' },
    { to: '/explore', label: 'Explore skills', icon: 'compass' },
    { to: '/matches', label: 'Smart matches', icon: 'spark' },
  ] },
  { title: 'Exchange', items: [
    { to: '/requests', label: 'Swap requests', icon: 'swap' },
    { to: '/chat', label: 'Messages', icon: 'chat', badge: 'messages' },
    { to: '/sessions', label: 'Sessions', icon: 'calendar' },
    { to: '/rooms', label: 'Knowledge rooms', icon: 'room' },
  ] },
  { title: 'Grow', items: [
    { to: '/quests', label: 'Learning quests', icon: 'flag' },
    { to: '/passport', label: 'Skill Passport', icon: 'passport' },
    { to: '/profile', label: 'Profile & skills', icon: 'user' },
  ] },
];

export default function Sidebar({ open, onNavigate }) {
  const { isAdmin, user } = useAuth();
  const { data } = useQuery(UNREAD_COUNTS, { pollInterval: 60000 });
  const badges = { messages: data?.unreadMessageCount };

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-top"><Logo to="/dashboard" size={34} /></div>
      <nav className="sidebar-nav" onClick={onNavigate}>
        {GROUPS.map((g) => (
          <div key={g.title} className="sidebar-group">
            <span className="sidebar-title">{g.title}</span>
            {g.items.map((it) => (
              <NavLink key={it.to} to={it.to} className="sidebar-link">
                <Icon name={it.icon} />
                <span>{it.label}</span>
                {it.badge && badges[it.badge] ? <span className="nav-badge">{badges[it.badge]}</span> : null}
              </NavLink>
            ))}
          </div>
        ))}
        {isAdmin && (
          <div className="sidebar-group">
            <span className="sidebar-title">Admin</span>
            <NavLink to="/admin" className="sidebar-link"><Icon name="shield" /><span>Admin console</span></NavLink>
          </div>
        )}
      </nav>
      <div className="sidebar-card">
        <div className="sidebar-card-art" aria-hidden="true">✦</div>
        <strong>{user?.credits ?? 0} Knowledge Credits</strong>
        <p>Teach a session to earn up to 30 more.</p>
        <NavLink to="/passport" className="btn btn-sm btn-white">View wallet</NavLink>
      </div>
    </aside>
  );
}
