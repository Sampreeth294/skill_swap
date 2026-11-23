import mongoose from 'mongoose';

let transactionsSupported = false;

/**
 * Connects to MongoDB and detects whether multi-document transactions are
 * available (they require a replica set or sharded cluster, e.g. Atlas).
 */
export async function connectDB(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { autoIndex: true });

  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    transactionsSupported = Boolean(hello.setName) || hello.msg === 'isdbgrid';
  } catch {
    transactionsSupported = false;
  }

  console.log(`✔ MongoDB connected (${mongoose.connection.name}) · transactions ${transactionsSupported ? 'enabled' : 'unavailable — using atomic single-document updates'}`);
  return mongoose.connection;
}

export const supportsTransactions = () => transactionsSupported;

/**
 * Runs `fn(session)` inside a transaction when supported, otherwise runs it
 * with `session = undefined`. Callers must still use conditional atomic
 * updates so correctness never depends on the transaction alone.
 */
export async function withTransaction(fn) {
  if (!transactionsSupported) return fn(undefined);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}
