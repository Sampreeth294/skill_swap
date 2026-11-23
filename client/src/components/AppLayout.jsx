import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import NotificationBell from './Notification.jsx';
import Icon from './Icon.jsx';
import { Avatar } from './ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import RealtimeProvider from '../context/RealtimeProvider.jsx';

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);

  useEffect(() => { setNavOpen(false); setMenu(false); window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const search = (e) => {
    e.preventDefault();
    navigate(`/explore?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <RealtimeProvider>
      <div className="app-shell">
        <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
        {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
        <div className="main">
          <header className="topbar">
            <button className="icon-btn topbar-burger" aria-label="Open navigation" onClick={() => setNavOpen(true)}><Icon name="menu" /></button>
            <form className="topbar-search" onSubmit={search} role="search">
              <Icon name="search" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search skills, e.g. React, Spanish, Guitar…" aria-label="Search skills" />
            </form>
            <div className="topbar-actions">
              <Link to="/passport" className="credit-chip" title="Knowledge Credits">
                <Icon name="coin" size={16} /> {user?.credits ?? 0}
              </Link>
              {user?.streak?.current > 0 && (
                <span className="streak-chip" title="Learning streak"><Icon name="fire" size={16} /> {user.streak.current}</span>
              )}
              <NotificationBell />
              <div className="user-menu" ref={menuRef}>
                <button className="user-menu-btn" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu}>
                  <Avatar user={user} size={36} />
                  <span className="user-menu-name">{user?.name?.split(' ')[0]}</span>
                </button>
                {menu && (
                  <div className="dropdown user-dropdown" role="menu">
                    <div className="dropdown-head"><strong>{user?.name}</strong><span className="muted">{user?.email}</span></div>
                    <Link to="/profile" role="menuitem"><Icon name="user" /> Profile & skills</Link>
                    <Link to="/passport" role="menuitem"><Icon name="passport" /> Skill Passport</Link>
                    <Link to={`/users/${user?.id}`} role="menuitem"><Icon name="external" /> Public profile</Link>
                    <button role="menuitem" onClick={async () => { await signOut(); navigate('/'); }}><Icon name="logout" /> Sign out</button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="page" id="main">
            <Outlet />
          </main>
        </div>
      </div>
    </RealtimeProvider>
  );
}
