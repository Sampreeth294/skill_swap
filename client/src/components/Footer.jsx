import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>Share what you know. Discover what you don't. A peer-to-peer community where knowledge is the currency.</p>
        </div>
        <div>
          <h4>Platform</h4>
          <Link to="/explore">Explore skills</Link>
          <Link to="/matches">Smart matches</Link>
          <Link to="/rooms">Knowledge rooms</Link>
          <Link to="/passport">Skill Passport</Link>
        </div>
        <div>
          <h4>Community</h4>
          <a href="/#how">How it works</a>
          <a href="/#testimonials">Stories</a>
          <a href="/#why">Why SkillSwap</a>
        </div>
        <div>
          <h4>Get started</h4>
          <Link to="/register">Create account</Link>
          <Link to="/login">Sign in</Link>
        </div>
      </div>
      <div className="container footer-base">
        <span>© {new Date().getFullYear()} SkillSwap. Built with MongoDB · Express · React · Node · GraphQL.</span>
        <span>Knowledge Credits are a non-monetary community currency.</span>
      </div>
    </footer>
  );
}
