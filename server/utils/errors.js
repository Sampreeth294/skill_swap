import { GraphQLError } from 'graphql';

const make = (code) => (message, extra = {}) =>
  new GraphQLError(message, { extensions: { code, ...extra } });

export const AuthError = make('UNAUTHENTICATED');
export const ForbiddenError = make('FORBIDDEN');
export const InputError = make('BAD_USER_INPUT');
export const NotFoundError = make('NOT_FOUND');
export const ConflictError = make('CONFLICT');

/** Apollo formatError: keep known codes, mask unexpected internals in production. */
export function formatError(formatted, error) {
  const code = formatted.extensions?.code;
  const known = ['UNAUTHENTICATED', 'FORBIDDEN', 'BAD_USER_INPUT', 'NOT_FOUND', 'CONFLICT', 'GRAPHQL_VALIDATION_FAILED', 'GRAPHQL_PARSE_FAILED', 'BAD_REQUEST', 'PERSISTED_QUERY_NOT_FOUND'];
  const original = error?.originalError;

  // Mongoose validation → user input error
  if (original?.name === 'ValidationError') {
    const message = Object.values(original.errors).map((e) => e.message).join(', ');
    return { message, extensions: { code: 'BAD_USER_INPUT' } };
  }
  // Duplicate key → conflict
  if (original?.code === 11000) {
    return { message: 'That record already exists.', extensions: { code: 'CONFLICT' } };
  }
  if (original?.name === 'CastError') {
    return { message: 'Invalid identifier.', extensions: { code: 'BAD_USER_INPUT' } };
  }
  if (!known.includes(code)) {
    console.error('[GraphQL]', error);
    if (process.env.NODE_ENV === 'production') {
      return { message: 'Something went wrong. Please try again.', extensions: { code: 'INTERNAL_SERVER_ERROR' } };
    }
  }
  return formatted;
}
