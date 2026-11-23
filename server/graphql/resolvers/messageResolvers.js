import { withFilter } from 'graphql-subscriptions';
import { Message, Connection, Notification } from '../../models/index.js';
import { requireAuth } from '../../middleware/auth.js';
import { notify } from '../../services/notificationService.js';
import { pubsub, EVENTS } from '../../services/pubsub.js';
import * as v from '../../utils/validate.js';
import { ref, same, sid, memberConnection, partnerOf } from './helpers.js';

export async function pageMessages(query, { before, limit }) {
  const l = Math.min(100, Math.max(1, limit || 30));
  const q = { ...query, hidden: { $ne: true } };
  if (before) q.createdAt = { $lt: new Date(before) };
  const docs = await Message.find(q).sort({ createdAt: -1 }).limit(l + 1);
  return { items: docs.slice(0, l).reverse(), hasMore: docs.length > l };
}

export default {
  Query: {
    messages: async (_p, { connectionId, before, limit }, ctx) => {
      const conn = await memberConnection(ctx, v.id(connectionId, 'connectionId'));
      return pageMessages({ connection: conn._id }, { before, limit });
    },

    unreadMessageCount: (_p, _a, ctx) => {
      const me = requireAuth(ctx);
      return Message.countDocuments({ recipient: me._id, readAt: null, hidden: { $ne: true } });
    },
  },

  Mutation: {
    sendMessage: async (_p, { connectionId, body }, ctx) => {
      const me = requireAuth(ctx);
      const conn = await memberConnection(ctx, v.id(connectionId, 'connectionId')); // only accepted connections can chat
      const text = v.str(body, 'Message', { min: 1, max: 2000 });
      const recipient = partnerOf(conn, me._id);
      const msg = await Message.create({ connection: conn._id, sender: me._id, recipient, body: text });
      await Connection.updateOne({ _id: conn._id }, { lastMessageAt: msg.createdAt });

      pubsub.publish(EVENTS.MESSAGE_ADDED, { messageAdded: msg.toObject() });
      pubsub.publish(EVENTS.TYPING, { typing: { connectionId: String(conn._id), userId: String(me._id), isTyping: false } });

      // One "new message" notification per unread conversation — no spam
      const alreadyNotified = await Notification.exists({ user: recipient, type: 'NEW_MESSAGE', refId: String(conn._id), read: false });
      if (!alreadyNotified) {
        await notify({ user: recipient, actor: me._id, type: 'NEW_MESSAGE', refId: conn._id, link: `/chat/${conn._id}`, title: `New message from ${me.name}`, body: text.slice(0, 120) });
      }
      return msg;
    },

    markConversationRead: async (_p, { connectionId }, ctx) => {
      const me = requireAuth(ctx);
      const conn = await memberConnection(ctx, v.id(connectionId, 'connectionId'));
      const res = await Message.updateMany({ connection: conn._id, recipient: me._id, readAt: null }, { readAt: new Date() });
      await Notification.updateMany({ user: me._id, type: 'NEW_MESSAGE', refId: String(conn._id), read: false }, { read: true });
      return res.modifiedCount || 0;
    },

    setTyping: async (_p, { connectionId, isTyping }, ctx) => {
      const me = requireAuth(ctx);
      const conn = await memberConnection(ctx, v.id(connectionId, 'connectionId'));
      pubsub.publish(EVENTS.TYPING, { typing: { connectionId: String(conn._id), userId: String(me._id), isTyping } });
      return true;
    },
  },

  Subscription: {
    messageAdded: {
      subscribe: withFilter(
        async (_p, { connectionId }, ctx) => {
          requireAuth(ctx);
          if (connectionId) await memberConnection(ctx, v.id(connectionId, 'connectionId')); // authorize before streaming
          return pubsub.asyncIterableIterator(EVENTS.MESSAGE_ADDED);
        },
        ({ messageAdded: m }, { connectionId }, ctx) => {
          if (connectionId) return same(m.connection, connectionId);
          return same(m.recipient, ctx.user._id);
        }
      ),
    },
    typing: {
      subscribe: withFilter(
        async (_p, { connectionId }, ctx) => {
          await memberConnection(ctx, v.id(connectionId, 'connectionId'));
          return pubsub.asyncIterableIterator(EVENTS.TYPING);
        },
        ({ typing }, { connectionId }, ctx) => typing.connectionId === String(connectionId) && typing.userId !== String(ctx.user._id)
      ),
    },
  },

  Message: {
    connectionId: (m) => sid(m.connection),
    roomId: (m) => sid(m.room),
    sender: ref('sender', 'user'),
    isMine: (m, _a, ctx) => same(m.sender, ctx.user?._id),
  },
};
