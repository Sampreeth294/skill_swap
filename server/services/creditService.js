import { User, CreditTransaction } from '../models/index.js';
import { withTransaction } from '../config/db.js';
import { ConflictError, InputError } from '../utils/errors.js';

// All credit amounts are decided here — never by the client.
export const CREDIT_RULES = {
  SIGNUP_BONUS: 20,
  PER_TEACHING_HOUR: 10,
  MAX_PER_SESSION: 30,
  CREDIT_REQUEST_COST: 10,
};

export const creditsForSession = (minutes) =>
  Math.min(CREDIT_RULES.MAX_PER_SESSION, Math.max(1, Math.round((minutes / 60) * CREDIT_RULES.PER_TEACHING_HOUR)));

/**
 * Adds credits. Idempotent per (user, refType, refId, type) via a unique index.
 */
export async function addCredits({ userId, amount, type = 'EARN', reason, refType, refId }, session) {
  if (!Number.isInteger(amount) || amount <= 0) throw InputError('Invalid credit amount.');
  const exists = await CreditTransaction.exists({ user: userId, refType, refId: String(refId), type }).session(session || null);
  if (exists) return null;
  const user = await User.findByIdAndUpdate(userId, { $inc: { credits: amount } }, { returnDocument: 'after', session });
  const [txn] = await CreditTransaction.create(
    [{ user: userId, type, amount, balanceAfter: user.credits, reason, refType, refId: String(refId) }],
    { session }
  );
  return txn;
}

/**
 * Deducts credits atomically. The `credits >= amount` guard in the update
 * filter makes double-spending impossible even without a transaction.
 */
export async function spendCredits({ userId, amount, reason, refType, refId }, session) {
  const user = await User.findOneAndUpdate(
    { _id: userId, credits: { $gte: amount } },
    { $inc: { credits: -amount } },
    { returnDocument: 'after', session }
  );
  if (!user) throw ConflictError(`Not enough Knowledge Credits. This needs ${amount} credits.`);
  const [txn] = await CreditTransaction.create(
    [{ user: userId, type: 'SPEND', amount, balanceAfter: user.credits, reason, refType, refId: String(refId) }],
    { session }
  );
  return txn;
}

/** Moves credits from learner to teacher as a single unit of work. */
export async function transferCredits({ fromId, toId, amount, reason, refType, refId }) {
  return withTransaction(async (session) => {
    await spendCredits({ userId: fromId, amount, reason, refType, refId }, session);
    try {
      await addCredits({ userId: toId, amount, type: 'EARN', reason, refType, refId }, session);
    } catch (err) {
      if (!session) {
        // No transaction available: compensate so balances stay consistent
        await addCredits({ userId: fromId, amount, type: 'REFUND', reason: `Refund: ${reason}`, refType, refId });
      }
      throw err;
    }
  });
}
