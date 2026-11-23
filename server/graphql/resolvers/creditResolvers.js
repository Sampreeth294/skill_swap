import { CreditTransaction } from '../../models/index.js';
import { requireAuth } from '../../middleware/auth.js';
import { CREDIT_RULES } from '../../services/creditService.js';
import * as v from '../../utils/validate.js';

export default {
  Query: {
    myCredits: async (_p, _a, ctx) => {
      const me = requireAuth(ctx);
      const rows = await CreditTransaction.aggregate([{ $match: { user: me._id } }, { $group: { _id: '$type', total: { $sum: '$amount' } } }]);
      const sum = (t) => rows.find((r) => r._id === t)?.total || 0;
      return {
        userId: me._id,
        balance: me.credits,
        earned: sum('EARN') + sum('BONUS') + sum('REFUND'),
        spent: sum('SPEND'),
        rules: {
          signupBonus: CREDIT_RULES.SIGNUP_BONUS,
          perTeachingHour: CREDIT_RULES.PER_TEACHING_HOUR,
          maxPerSession: CREDIT_RULES.MAX_PER_SESSION,
          creditRequestCost: CREDIT_RULES.CREDIT_REQUEST_COST,
        },
      };
    },
  },
  CreditWallet: {
    transactions: async (w, { page }) => {
      const pg = v.pagination(page, 50);
      const q = { user: w.userId };
      const [items, total] = await Promise.all([CreditTransaction.find(q).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit), CreditTransaction.countDocuments(q)]);
      return v.pageResult(items, total, pg);
    },
  },
};
