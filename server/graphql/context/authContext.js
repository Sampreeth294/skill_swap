import { User } from '../../models/index.js';
import { verifyToken } from '../../services/tokenService.js';
import { createLoaders } from './loaders.js';

/** Resolves the current user from a raw token (HTTP header or WS params). */
export async function userFromToken(raw) {
  if (!raw) return null;
  const token = String(raw).replace(/^Bearer\s+/i, '');
  const payload = verifyToken(token);
  if (!payload?.sub) return null;
  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'ACTIVE') return null; // suspended users lose access instantly
  return user;
}

/** Context for HTTP queries & mutations. */
export async function buildHttpContext({ req }) {
  const user = await userFromToken(req.headers.authorization);
  return { user, loaders: createLoaders() };
}

/** Context for each WebSocket subscription operation. */
export async function buildWsContext(ctx) {
  const user = ctx.extra.user || (await userFromToken(ctx.connectionParams?.authToken));
  // Long-lived subscriptions use uncached loaders so data never goes stale
  return { user, loaders: createLoaders({ cache: false }) };
}
