import { Link } from 'react-router-dom';
import { cx, initials, titleCase } from '../utils/helpers.js';

const AVATAR_TINTS = ['#E8E1FF', '#DCEAFF', '#DDF4F0', '#FDE7D8', '#FCE1EE'];

export function Avatar({ user, size = 40, showStatus = false }) {
  const name = user?.name || '?';
  const tint = AVATAR_TINTS[(name.charCodeAt(0) + name.length) % AVATAR_TINTS.length];
  return (
    <span className="avatar" style={{ width: size, height: size, background: tint, fontSize: size * 0.38 }}>
      {user?.avatarUrl ? <img src={user.avatarUrl} alt="" loading="lazy" /> : initials(name)}
      {showStatus && <span className={cx('presence', user?.isOnline && 'on')} title={user?.isOnline ? 'Online' : 'Offline'} />}
    </span>
  );
}

export function Stars({ value = 0, count, size = 14 }) {
  return (
    <span className="stars" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 1.8l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L10 14.5l-5.1 2.7 1.1-5.6L1.8 7.7l5.7-.7z" fill={i <= Math.round(value) ? '#F5B83D' : '#EAE7F2'} />
        </svg>
      ))}
      {count !== undefined && <span className="stars-meta">{value ? value.toFixed(1) : 'New'}{count ? ` · ${count}` : ''}</span>}
    </span>
  );
}

const LEVEL_DOTS = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 };
export function LevelBadge({ level }) {
  if (!level) return null;
  return (
    <span className={cx('level', `level-${level.toLowerCase()}`)} title={titleCase(level)}>
      <span className="level-dots" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => <i key={i} className={i <= LEVEL_DOTS[level] ? 'on' : ''} />)}
      </span>
      {titleCase(level)}
    </span>
  );
}

export function CategoryChip({ category }) {
  if (!category) return null;
  return (
    <span className="chip chip-cat" style={{ '--cat': category.color }}>
      <span aria-hidden="true">{category.icon}</span> {category.name}
    </span>
  );
}

export function EmptyState({ title, text, action, art = 'default' }) {
  return (
    <div className="empty">
      <EmptyArt kind={art} />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

function EmptyArt({ kind }) {
  const accent = { default: '#E8E1FF', chat: '#DCEAFF', calendar: '#DDF4F0', search: '#E8E1FF' }[kind] || '#E8E1FF';
  return (
    <svg width="148" height="108" viewBox="0 0 148 108" aria-hidden="true" className="empty-art">
      <ellipse cx="74" cy="96" rx="52" ry="7" fill="#EFECF8" />
      <rect x="28" y="18" width="92" height="66" rx="16" fill="#fff" stroke="#EAE7F2" strokeWidth="2" />
      <rect x="40" y="32" width="40" height="8" rx="4" fill={accent} />
      <rect x="40" y="48" width="66" height="6" rx="3" fill="#F1EFF8" />
      <rect x="40" y="60" width="52" height="6" rx="3" fill="#F1EFF8" />
      {kind === 'chat' && <path d="M98 14h28a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8h-14l-8 7v-7h-6a8 8 0 0 1-8-8V22a8 8 0 0 1 8-8z" fill="#7357E8" />}
      {kind === 'calendar' && <g><rect x="100" y="8" width="34" height="32" rx="8" fill="#7357E8" /><rect x="106" y="20" width="22" height="3" rx="1.5" fill="#fff" /><rect x="106" y="27" width="14" height="3" rx="1.5" fill="#DDF4F0" /></g>}
      {kind === 'search' && <g><circle cx="116" cy="26" r="13" fill="none" stroke="#7357E8" strokeWidth="5" /><path d="M125 35l9 9" stroke="#7357E8" strokeWidth="5" strokeLinecap="round" /></g>}
      {kind === 'default' && <g><circle cx="118" cy="24" r="14" fill="#7357E8" /><path d="M112 24l4 4 8-8" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>}
    </svg>
  );
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="alert alert-error" role="alert">
      <span>{typeof error === 'string' ? error : error.message}</span>
      {onRetry && <button className="btn btn-sm btn-soft" onClick={() => onRetry()}>Retry</button>}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action, to, linkText = 'View all' }) {
  return (
    <div className="section-header">
      <div>
        <h3>{title}</h3>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {action || (to && <Link to={to} className="link-arrow">{linkText} →</Link>)}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} className={cx('tab', value === t.value && 'active')} onClick={() => onChange(t.value)}>
          {t.label}
          {t.count ? <span className="tab-count">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Pagination({ pageInfo, onPage }) {
  if (!pageInfo || pageInfo.pages <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn btn-soft btn-sm" disabled={pageInfo.page <= 1} onClick={() => onPage(pageInfo.page - 1)}>← Prev</button>
      <span className="muted">Page {pageInfo.page} of {pageInfo.pages}</span>
      <button className="btn btn-soft btn-sm" disabled={!pageInfo.hasNextPage} onClick={() => onPage(pageInfo.page + 1)}>Next →</button>
    </div>
  );
}

export function ProgressBar({ value, tone = 'lavender', label }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`progress-fill tone-${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Field({ label, error, hint, children, htmlFor }) {
  return (
    <div className={cx('field', error && 'has-error')}>
      {label && <label className="label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <span className="error-text">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}
