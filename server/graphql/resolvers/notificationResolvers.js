import { withFilter } from 'graphql-subscriptions';
import { Notification } from '../../models/index.js';
import { requireAuth } from '../../middleware/auth.js';
import { NotFoundError } from '../../utils/errors.js';
import { pubsub, EVENTS } from '../../services/pubsub.js';
import * as v from '../../utils/validate.js';
import { ref, same } from './helpers.js';

export default {
  Query: {
    notifications: async (_p, { unreadOnly, page }, ctx) => {
      const me = requireAuth(ctx);
      const pg = v.pagination(page, 50);
      const q = { user: me._id, ...(unreadOnly ? { read: false } : {}) };
      const [items, total] = await Promise.all([Notification.find(q).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit), Notification.countDocuments(q)]);
      return v.pageResult(items, total, pg);
    },
    unreadNotificationCount: (_p, _a, ctx) => Notification.countDocuments({ user: requireAuth(ctx)._id, read: false }),
  },

  Mutation: {
    markNotificationRead: async (_p, { id }, ctx) => {
      const me = requireAuth(ctx);
      const n = await Notification.findOneAndUpdate({ _id: v.id(id), user: me._id }, { read: true }, { returnDocument: 'after' });
      if (!n) throw NotFoundError('Notification not found.');
      return n;
    },
    markAllNotificationsRead: async (_p, _a, ctx) => {
      const res = await Notification.updateMany({ user: requireAuth(ctx)._id, read: false }, { read: true });
      return res.modifiedCount || 0;
    },
    deleteNotification: async (_p, { id }, ctx) => {
      const res = await Notification.deleteOne({ _id: v.id(id), user: requireAuth(ctx)._id });
      if (!res.deletedCount) throw NotFoundError('Notification not found.');
      return id;
    },
  },

  Subscription: {
    notificationAdded: {
      subscribe: withFilter(
        (_p, _a, ctx) => { requireAuth(ctx); return pubsub.asyncIterableIterator(EVENTS.NOTIFICATION_ADDED); },
        ({ notificationAdded: n }, _a, ctx) => same(n.user, ctx.user._id) // users only ever receive their own
      ),
    },
  },

  Notification: {
    actor: ref('actor', 'user'),
  },
};
