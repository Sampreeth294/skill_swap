import { GraphQLScalarType, Kind } from 'graphql';
import { Connection } from '../../models/index.js';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { requireAuth } from '../../middleware/auth.js';

export const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  serialize: (v) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString()),
  parseValue: (v) => new Date(v),
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? new Date(ast.value) : null),
});

export const sid = (v) => (v && v._id ? String(v._id) : v ? String(v) : null);
export const same = (a, b) => sid(a) === sid(b);

/** Field resolver that loads a referenced document through a DataLoader. */
export const ref = (field, loader) => (parent, _args, ctx) => {
  const v = parent[field];
  if (!v) return null;
  if (v._id && v.constructor?.modelName) return v; // already populated
  return ctx.loaders[loader].load(sid(v));
};

export const refs = (field, loader) => (parent, _args, ctx) =>
  ctx.loaders[loader].loadMany((parent[field] || []).map(sid)).then((r) => r.filter((x) => x && !(x instanceof Error)));

/** Loads a connection and verifies the current user is a member. */
export async function memberConnection(ctx, connectionId) {
  const me = requireAuth(ctx);
  const conn = await Connection.findById(connectionId);
  if (!conn) throw NotFoundError('Connection not found.');
  if (!conn.users.some((u) => same(u, me._id))) throw ForbiddenError('You are not part of this connection.');
  return conn;
}

export const partnerOf = (conn, userId) => conn.users.find((u) => !same(u, userId));
