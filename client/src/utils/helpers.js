import { CombinedGraphQLErrors } from '@apollo/client/errors';

export const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const titleCase = (s = '') => s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
export const firstName = (name = '') => name.split(' ')[0];

/** Human message from any Apollo/GraphQL error. */
export function errorMessage(err) {
  if (!err) return '';
  if (CombinedGraphQLErrors.is(err)) return err.errors.map((e) => e.message).join(' ');
  if (err.message?.includes('Failed to fetch')) return 'Cannot reach the SkillSwap server. Is it running?';
  return err.message || 'Something went wrong.';
}
export const errorCode = (err) => (CombinedGraphQLErrors.is(err) ? err.errors[0]?.extensions?.code : undefined);

export function timeAgo(date) {
  const d = new Date(date);
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 604800) return `${Math.round(s / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export const formatDateTime = (date) =>
  new Date(date).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const formatDate = (date) => new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
export const formatTime = (date) => new Date(date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/** datetime-local input value for a Date in local time */
export function toLocalInput(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const scoreTone = (score) => (score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'low');
export const cx = (...args) => args.filter(Boolean).join(' ');
