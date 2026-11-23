import { AuthError, ForbiddenError } from '../utils/errors.js';

/** Resolver guards — every private resolver calls one of these first. */
export function requireAuth(ctx) {
  if (!ctx.user) throw AuthError('Please sign in to continue.');
  return ctx.user;
}

export function requireAdmin(ctx) {
  const user = requireAuth(ctx);
  if (user.role !== 'ADMIN') throw ForbiddenError('Administrator access required.');
  return user;
}

export const isSelfOrAdmin = (ctx, userId) =>
  Boolean(ctx.user && (String(ctx.user._id) === String(userId) || ctx.user.role === 'ADMIN'));
