import Logo from '../components/Logo.jsx';
import { HeroIllustration } from '../components/Illustrations.jsx';

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth">
      <div className="auth-panel">
        <Logo />
        <div className="auth-form">
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
        <span className="tiny muted">Knowledge is the only thing that grows when you share it.</span>
      </div>
      <div className="auth-art" aria-hidden="true">
        <HeroIllustration />
        <blockquote>“Teach what you know, learn what you love.”</blockquote>
      </div>
    </div>
  );
}
