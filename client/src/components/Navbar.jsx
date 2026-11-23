import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Logo from './Logo.jsx';
import Icon from './Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Logo />
        <nav className={`nav-links ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
          <a href="/#how">How it works</a>
          <a href="/#categories">Categories</a>
          <NavLink to="/explore">Explore skills</NavLink>
          <a href="/#why">Why SkillSwap</a>
          <div className="nav-cta-mobile">
            {isAuthenticated ? <Link className="btn btn-primary" to="/dashboard">Open dashboard</Link> : <Link className="btn btn-primary" to="/register">Join free</Link>}
          </div>
        </nav>
        <div className="nav-actions">
          {isAuthenticated ? (
            <Link className="btn btn-primary" to="/dashboard">Dashboard →</Link>
          ) : (
            <>
              <Link className="btn btn-ghost" to="/login">Sign in</Link>
              <Link className="btn btn-primary" to="/register">Join free</Link>
            </>
          )}
          <button className="icon-btn nav-burger" aria-label="Menu" onClick={() => setOpen((o) => !o)}><Icon name={open ? 'close' : 'menu'} /></button>
        </div>
      </div>
    </header>
  );
}
