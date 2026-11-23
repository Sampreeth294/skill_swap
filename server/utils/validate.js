import mongoose from 'mongoose';
import { InputError } from './errors.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URL_RE = /^https?:\/\/[^\s]+$/i;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function required(value, field) {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
    throw InputError(`${field} is required.`, { field });
  }
  return typeof value === 'string' ? value.trim() : value;
}

export function str(value, field, { min = 0, max = 500, optional = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (optional) return value === '' ? '' : undefined;
    throw InputError(`${field} is required.`, { field });
  }
  if (typeof value !== 'string') throw InputError(`${field} must be text.`, { field });
  const v = value.trim();
  if (v.length < min) throw InputError(`${field} must be at least ${min} characters.`, { field });
  if (v.length > max) throw InputError(`${field} must be at most ${max} characters.`, { field });
  return v;
}

export function email(value) {
  const v = str(value, 'Email', { max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(v)) throw InputError('Please enter a valid email address.', { field: 'email' });
  return v;
}

export function password(value) {
  if (typeof value !== 'string' || value.length < 8) throw InputError('Password must be at least 8 characters.', { field: 'password' });
  if (value.length > 128) throw InputError('Password is too long.', { field: 'password' });
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) throw InputError('Password must contain letters and numbers.', { field: 'password' });
  return value;
}

export function url(value, field = 'URL') {
  if (!value) return '';
  const v = String(value).trim();
  if (!URL_RE.test(v)) throw InputError(`${field} must start with http:// or https://`, { field });
  return v.slice(0, 1000);
}

export function int(value, field, { min = -Infinity, max = Infinity, fallback } = {}) {
  if (value === undefined || value === null) {
    if (fallback !== undefined) return fallback;
    throw InputError(`${field} is required.`, { field });
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw InputError(`${field} must be a whole number between ${min} and ${max}.`, { field });
  return n;
}

export function id(value, field = 'id') {
  if (!value || !mongoose.isValidObjectId(value)) throw InputError(`Invalid ${field}.`, { field });
  return String(value);
}

export function time(value, field) {
  if (!TIME_RE.test(value || '')) throw InputError(`${field} must be HH:MM (24h).`, { field });
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

export function date(value, field) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw InputError(`${field} must be a valid date.`, { field });
  return d;
}

export function pagination({ page = 1, limit = 12 } = {}, maxLimit = 50) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(maxLimit, Math.max(1, Number(limit) || 12));
  return { page: p, limit: l, skip: (p - 1) * l };
}

export function pageResult(items, total, { page, limit }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  return { items, pageInfo: { total, page, limit, pages, hasNextPage: page < pages } };
}

export const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
