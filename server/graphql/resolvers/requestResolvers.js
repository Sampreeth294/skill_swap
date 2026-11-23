import DataLoader from 'dataloader';
import { withFilter } from 'graphql-subscriptions';
import { SwapRequest, Skill, User, Connection, Message, Review, pairKeyOf } from '../../models/index.js';
import { requireAuth } from '../../middleware/auth.js';
import { ConflictError, ForbiddenError, InputError, NotFoundError } from '../../utils/errors.js';
import { CREDIT_RULES, transferCredits } from '../../services/creditService.js';
import { notify } from '../../services/notificationService.js';
import { evaluateAchievements } from '../../services/achievementService.js';
import { pubsub, EVENTS } from '../../services/pubsub.js';
import * as v from '../../utils/validate.js';
import { ref, refs, same, sid, memberConnection, partnerOf } from './helpers.js';

const publish = (req) => pubsub.publish(EVENTS.REQUEST_UPDATED, { requestUpdated: req.toObject ? req.toObject() : req });

/** Per-request loaders used by Connection fields (lists of conversations). */
function connLoaders(ctx) {
  if (!ctx._conn) {
    const me = ctx.user._id;
    ctx._conn = {
      unread: new DataLoader(async (ids) => {
        const rows = await Message.aggregate([
          { $match: { connection: { $in: ids }, recipient: me, readAt: null } },
          { $group: { _id: '$connection', n: { $sum: 1 } } },
        ]);
        const m = new Map(rows.map((r) => [String(r._id), r.n]));
        return ids.map((id) => m.get(String(id)) || 0);
      }, { cacheKeyFn: String }),
      last: new DataLoader(async (ids) => {
        const rows = await Message.aggregate([
          { $match: { connection: { $in: ids }, hidden: { $ne: true } } },
          { $sort: { createdAt: -1 } },
          { $group: { _id: '$connection', doc: { $first: '$$ROOT' } } },
        ]);
        const m = new Map(rows.map((r) => [String(r._id), r.doc]));
        return ids.map((id) => m.get(String(id)) || null);
      }, { cacheKeyFn: String }),
      review: new DataLoader(async (ids) => {
        const rows = await Review.find({ connection: { $in: ids }, reviewer: me });
        const m = new Map(rows.map((r) => [String(r.connection), r]));
        return ids.map((id) => m.get(String(id)) || null);
      }, { cacheKeyFn: String }),
    };
  }
  return ctx._conn;
}

async function loadOwnRequest(ctx, id, role) {
  const me = requireAuth(ctx);
  const req = await SwapRequest.findById(v.id(id));
  if (!req) throw NotFoundError('Request not found.');
  if (!same(req[role], me._id)) {
    throw ForbiddenError(role === 'to' ? 'Only the person who received this request can respond to it.' : 'Only the sender can cancel this request.');
  }
  if (req.status !== 'PENDING') throw ConflictError(`This request is already ${req.status.toLowerCase()}.`);
  return req;
}

export default {
  Query: {
    swapRequests: async (_p, { box, status, page }, ctx) => {
      const me = requireAuth(ctx);
      const pg = v.pagination(page, 50);
      const q = box === 'INCOMING' ? { to: me._id } : box === 'OUTGOING' ? { from: me._id } : { $or: [{ to: me._id }, { from: me._id }] };
      if (status) q.status = status;
      const [items, total] = await Promise.all([
        SwapRequest.find(q).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
        SwapRequest.countDocuments(q),
      ]);
      return v.pageResult(items, total, pg);
    },

    connections: async (_p, { status }, ctx) => {
      const me = requireAuth(ctx);
      return Connection.find({ users: me._id, ...(status ? { status } : {}) }).sort({ lastMessageAt: -1, createdAt: -1 });
    },

    connection: async (_p, { id }, ctx) => memberConnection(ctx, v.id(id)),
  },

  Mutation: {
    sendSwapRequest: async (_p, { input }, ctx) => {
      const me = requireAuth(ctx);
      const toId = v.id(input.toUserId, 'toUserId');
      if (same(toId, me._id)) throw InputError('You cannot send a request to yourself.');
      const to = await User.findById(toId);
      if (!to || to.status !== 'ACTIVE') throw NotFoundError('That user is not available.');

      const requested = await Skill.findById(v.id(input.requestedSkillId, 'requestedSkillId'));
      if (!requested || !same(requested.owner, toId) || requested.type !== 'TEACH') throw InputError('Choose a skill this person teaches.');

      const mode = input.mode || 'EXCHANGE';
      let offered = null;
      let creditCost = 0;
      if (mode === 'EXCHANGE') {
        if (!input.offeredSkillId) throw InputError('Choose a skill you will teach in return, or use Knowledge Credits.');
        offered = await Skill.findById(v.id(input.offeredSkillId, 'offeredSkillId'));
        if (!offered || !same(offered.owner, me._id) || offered.type !== 'TEACH') throw InputError('The offered skill must be one you teach.');
      } else {
        creditCost = CREDIT_RULES.CREDIT_REQUEST_COST; // server decides the price
        if (me.credits < creditCost) throw ConflictError(`You need ${creditCost} Knowledge Credits for this request (you have ${me.credits}).`);
      }

      if (await Connection.exists({ pairKey: pairKeyOf(me._id, toId) })) throw ConflictError('You are already connected with this person. Plan a new session from Sessions.');
      const pending = await SwapRequest.findOne({ status: 'PENDING', $or: [{ from: me._id, to: toId }, { from: toId, to: me._id }] });
      if (pending) {
        throw ConflictError(same(pending.from, me._id) ? 'You already have a pending request with this person.' : 'This person already sent you a request — check your inbox to accept it.');
      }

      const req = await SwapRequest.create({
        from: me._id, to: toId, mode, requestedSkill: requested._id, offeredSkill: offered?._id, creditCost,
        message: v.str(input.message, 'Message', { max: 500, optional: true }) || '',
      });
      await notify({
        user: toId, actor: me._id, type: 'SWAP_REQUEST', refId: req._id, link: '/requests',
        title: `${me.name} wants to learn ${requested.name}`,
        body: mode === 'EXCHANGE' ? `They offer to teach you ${offered.name} in return.` : `They will pay ${creditCost} Knowledge Credits.`,
      });
      publish(req);
      return req;
    },

    acceptSwapRequest: async (_p, { id }, ctx) => {
      const me = requireAuth(ctx);
      await loadOwnRequest(ctx, id, 'to');
      // Atomic claim: only one accept can ever win
      const req = await SwapRequest.findOneAndUpdate({ _id: id, to: me._id, status: 'PENDING' }, { status: 'ACCEPTED', respondedAt: new Date() }, { returnDocument: 'after' });
      if (!req) throw ConflictError('This request was already handled.');

      if (req.mode === 'CREDIT' && req.creditCost > 0) {
        try {
          await transferCredits({ fromId: req.from, toId: req.to, amount: req.creditCost, reason: 'Learning request accepted', refType: 'REQUEST', refId: req._id });
        } catch (err) {
          await SwapRequest.updateOne({ _id: req._id }, { status: 'PENDING', $unset: { respondedAt: 1 } });
          throw err;
        }
      }

      const [requested, offered] = await Promise.all([Skill.findById(req.requestedSkill), req.offeredSkill ? Skill.findById(req.offeredSkill) : null]);
      const exchanges = [{ teacher: req.to, learner: req.from, skillName: requested?.name || 'Skill' }];
      if (offered) exchanges.push({ teacher: req.from, learner: req.to, skillName: offered.name });
      await Connection.findOneAndUpdate(
        { pairKey: pairKeyOf(req.from, req.to) },
        { $setOnInsert: { users: [req.from, req.to], request: req._id, status: 'ACTIVE' }, $push: { exchanges: { $each: exchanges } } },
        { upsert: true, returnDocument: 'after' }
      );

      await notify({ user: req.from, actor: me._id, type: 'REQUEST_ACCEPTED', refId: req._id, link: '/chat', title: `${me.name} accepted your swap request 🎉`, body: 'You can now chat and schedule your first session.' });
      if (req.mode === 'CREDIT') {
        await notify({ user: me._id, type: 'CREDITS_EARNED', refId: req._id, link: '/passport', title: `+${req.creditCost} Knowledge Credits`, body: 'Received for accepting a learning request.' });
      }
      evaluateAchievements(req.from).catch(() => {});
      evaluateAchievements(req.to).catch(() => {});
      publish(req);
      return req;
    },

    rejectSwapRequest: async (_p, { id }, ctx) => {
      const me = requireAuth(ctx);
      await loadOwnRequest(ctx, id, 'to');
      const req = await SwapRequest.findOneAndUpdate({ _id: id, to: me._id, status: 'PENDING' }, { status: 'REJECTED', respondedAt: new Date() }, { returnDocument: 'after' });
      if (!req) throw ConflictError('This request was already handled.');
      await notify({ user: req.from, actor: me._id, type: 'REQUEST_REJECTED', refId: req._id, link: '/requests', title: `${me.name} declined your swap request`, body: 'No worries — check Matches for other great partners.' });
      publish(req);
      return req;
    },

    cancelSwapRequest: async (_p, { id }, ctx) => {
      const me = requireAuth(ctx);
      await loadOwnRequest(ctx, id, 'from');
      const req = await SwapRequest.findOneAndUpdate({ _id: id, from: me._id, status: 'PENDING' }, { status: 'CANCELLED', respondedAt: new Date() }, { returnDocument: 'after' });
      if (!req) throw ConflictError('This request was already handled.');
      publish(req);
      return req;
    },

    completeExchange: async (_p, { connectionId }, ctx) => {
      const me = requireAuth(ctx);
      const conn = await memberConnection(ctx, v.id(connectionId, 'connectionId'));
      if (conn.completedSessions < 1) throw ConflictError('Complete at least one verified session before finishing the exchange.');
      const updated = await Connection.findOneAndUpdate({ _id: conn._id, status: 'ACTIVE' }, { status: 'COMPLETED', completedAt: new Date() }, { returnDocument: 'after' });
      if (!updated) throw ConflictError('This exchange is already completed.');
      await User.updateMany({ _id: { $in: conn.users } }, { $inc: { completedExchanges: 1 } });
      for (const uid of conn.users) {
        await notify({ user: uid, actor: same(uid, me._id) ? null : me._id, type: 'EXCHANGE_COMPLETED', refId: conn._id, link: '/chat', title: 'Exchange completed 🎓', body: 'Leave a review to help your partner build their reputation.' });
        await evaluateAchievements(uid);
      }
      return updated;
    },
  },

  Subscription: {
    requestUpdated: {
      subscribe: withFilter(
        (_p, _a, ctx) => {
          requireAuth(ctx);
          return pubsub.asyncIterableIterator(EVENTS.REQUEST_UPDATED);
        },
        ({ requestUpdated: r }, _a, ctx) => same(r.from, ctx.user._id) || same(r.to, ctx.user._id)
      ),
    },
  },

  SwapRequest: {
    from: ref('from', 'user'),
    to: ref('to', 'user'),
    requestedSkill: ref('requestedSkill', 'skill'),
    offeredSkill: ref('offeredSkill', 'skill'),
    creditCost: (r) => r.creditCost || 0,
    isIncoming: (r, _a, ctx) => same(r.to, ctx.user?._id),
  },

  Connection: {
    users: refs('users', 'user'),
    partner: (c, _a, ctx) => ctx.loaders.user.load(sid(partnerOf(c, ctx.user._id))),
    lastMessage: (c, _a, ctx) => connLoaders(ctx).last.load(c._id),
    unreadCount: (c, _a, ctx) => connLoaders(ctx).unread.load(c._id),
    myReview: (c, _a, ctx) => connLoaders(ctx).review.load(c._id),
    canReview: async (c, _a, ctx) => c.completedSessions > 0 && !(await connLoaders(ctx).review.load(c._id)),
  },

  Exchange: {
    teacher: ref('teacher', 'user'),
    learner: ref('learner', 'user'),
  },
};
