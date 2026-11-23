import mongoose from 'mongoose';
import { Review, User } from '../../models/index.js';
import { requireAuth } from '../../middleware/auth.js';
import { ConflictError } from '../../utils/errors.js';
import { notify } from '../../services/notificationService.js';
import { evaluateAchievements } from '../../services/achievementService.js';
import * as v from '../../utils/validate.js';
import { ref, memberConnection, partnerOf } from './helpers.js';

export async function recalcRating(userId) {
  const [agg] = await Review.aggregate([
    { $match: { reviewee: new mongoose.Types.ObjectId(String(userId)), hidden: { $ne: true } } },
    { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } },
  ]);
  await User.updateOne({ _id: userId }, { ratingAvg: agg?.avg || 0, ratingCount: agg?.n || 0 });
}

export default {
  Query: {
    reviews: async (_p, { userId, page }) => {
      const pg = v.pagination(page, 30);
      const q = { reviewee: v.id(userId, 'userId'), hidden: { $ne: true } };
      const [items, total] = await Promise.all([Review.find(q).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit), Review.countDocuments(q)]);
      return v.pageResult(items, total, pg);
    },
    featuredReviews: (_p, { limit }) =>
      Review.find({ hidden: { $ne: true }, rating: { $gte: 4 }, comment: { $ne: '' } }).sort({ createdAt: -1 }).limit(Math.min(6, limit || 3)),
    ratingSummary: async (_p, { userId }) => {
      const rows = await Review.aggregate([
        { $match: { reviewee: new mongoose.Types.ObjectId(v.id(userId, 'userId')), hidden: { $ne: true } } },
        { $group: { _id: '$rating', n: { $sum: 1 } } },
      ]);
      const distribution = [1, 2, 3, 4, 5].map((r) => rows.find((x) => x._id === r)?.n || 0);
      const count = distribution.reduce((a, b) => a + b, 0);
      const average = count ? distribution.reduce((s, n, i) => s + n * (i + 1), 0) / count : 0;
      return { average: Math.round(average * 10) / 10, count, distribution };
    },
  },

  Mutation: {
    createReview: async (_p, { input }, ctx) => {
      const me = requireAuth(ctx);
      const conn = await memberConnection(ctx, v.id(input.connectionId, 'connectionId'));
      // Completed-exchange verification: at least one session confirmed by both
      if (conn.completedSessions < 1) throw ConflictError('You can review a partner after completing at least one session together.');
      if (await Review.exists({ reviewer: me._id, connection: conn._id })) throw ConflictError('You have already reviewed this exchange.');
      const reviewee = partnerOf(conn, me._id);
      const endorsed = v.str(input.endorsedSkill, 'Endorsed skill', { max: 60, optional: true }) || '';
      if (endorsed && !conn.exchanges.some((e) => String(e.teacher) === String(reviewee) && e.skillName.toLowerCase() === endorsed.toLowerCase())) {
        throw ConflictError('You can only endorse a skill your partner taught you.');
      }
      const review = await Review.create({
        connection: conn._id, reviewer: me._id, reviewee,
        rating: v.int(input.rating, 'Rating', { min: 1, max: 5 }),
        comment: v.str(input.comment, 'Comment', { max: 1000, optional: true }) || '',
        endorsedSkill: endorsed,
      });
      await recalcRating(reviewee);
      await notify({ user: reviewee, actor: me._id, type: 'NEW_REVIEW', refId: review._id, link: '/passport', title: `${me.name} left you a ${review.rating}★ review`, body: review.comment.slice(0, 120) });
      await evaluateAchievements(reviewee);
      return review;
    },
  },

  Review: {
    reviewer: ref('reviewer', 'user'),
    reviewee: ref('reviewee', 'user'),
  },
};
