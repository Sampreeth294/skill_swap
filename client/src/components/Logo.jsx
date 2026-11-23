import { Link } from 'react-router-dom';

/** Two arrows orbiting two "knowledge nodes" — a loop of giving and receiving. */
export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="logo-mark">
      <rect width="48" height="48" rx="14" fill="#7357E8" />
      <path d="M14 20a10 10 0 0 1 17.5-6.6" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="M31.8 8.6v5.6h-5.6" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 28a10 10 0 0 1-17.5 6.6" fill="none" stroke="#DDF4F0" strokeWidth="4" strokeLinecap="round" />
      <path d="M16.2 39.4v-5.6h5.6" fill="none" stroke="#DDF4F0" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17" cy="24" r="3" fill="#DCEAFF" />
      <circle cx="31" cy="24" r="3" fill="#fff" />
    </svg>
  );
}

export default function Logo({ to = '/', size = 36 }) {
  return (
    <Link to={to} className="logo" aria-label="SkillSwap home">
      <LogoMark size={size} />
      <span className="logo-word">Skill<span>Swap</span></span>
    </Link>
  );
}
