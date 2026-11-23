import DataLoader from 'dataloader';
import { Connection, SwapRequest, Skill } from '../../models/index.js';
import { requireAuth } from '../../middleware/auth.js';
import { findMatches, matchWith, WEIGHTS } from '../../services/matchingService.js';
import { NotFoundError } from '../../utils/errors.js';
import * as v from '../../utils/validate.js';

/** Batched relationship lookup (connected / pending) between me and many users. */
export function relationLoader(ctx) {
  if (!ctx._relation) {
    ctx._relation = new DataLoader(async (ids) => {
      const me = ctx.user._id;
      const [conns, reqs] = await Promise.all([
        Connection.find({ users: me }).select('users').lean(),
        SwapRequest.find({ status: 'PENDING', $or: [{ from: me, to: { $in: ids } }, { to: me, from: { $in: ids } }] }).select('from to').lean(),
      ]);
      const connected = new Set(conns.flatMap((c) => c.users.map(String)));
      return ids.map((id) => {
        if (String(id) === String(me)) return 'SELF';
        if (connected.has(String(id))) return 'CONNECTED';
        if (reqs.some((r) => String(r.from) === String(me) && String(r.to) === String(id))) return 'PENDING_SENT';
        if (reqs.some((r) => String(r.to) === String(me) && String(r.from) === String(id))) return 'PENDING_RECEIVED';
        return 'NONE';
      });
    }, { cacheKeyFn: String });
  }
  return ctx._relation;
}

export default {
  Query: {
    matches: async (_p, { filter = {}, page }, ctx) => {
      const me = requireAuth(ctx);
      const pg = v.pagination(page, 30);
      const all = await findMatches(me._id, { matchType: filter.matchType, minScore: filter.minScore || 0, limit: 200 });
      return v.pageResult(all.slice(pg.skip, pg.skip + pg.limit), all.length, pg);
    },

    exchangeBlueprint: async (_p, { userId }, ctx) => {
      const me = requireAuth(ctx);
      const otherId = v.id(userId, 'userId');
      const partner = await ctx.loaders.user.load(otherId);
      if (!partner || partner.status !== 'ACTIVE') throw NotFoundError('User not found.');
      const [match, mySkills, theirSkills] = await Promise.all([
        matchWith(me._id, otherId),
        Skill.find({ owner: me._id }),
        Skill.find({ owner: otherId }),
      ]);
      return {
        me,
        partner,
        match,
        myOffers: mySkills.filter((s) => s.type === 'TEACH'),
        myWants: mySkills.filter((s) => s.type === 'LEARN'),
        theirOffers: theirSkills.filter((s) => s.type === 'TEACH'),
        theirWants: theirSkills.filter((s) => s.type === 'LEARN'),
        weights: WEIGHTS,
        otherId,
      };
    },

    relationWith: (_p, { userId }, ctx) => {
      requireAuth(ctx);
      return relationLoader(ctx).load(v.id(userId, 'userId'));
    },
  },

  Match: {
    user: (m, _a, ctx) => ctx.loaders.user.load(m.userId),
    relation: (m, _a, ctx) => relationLoader(ctx).load(m.userId),
  },

  ExchangeBlueprint: {
    relation: (b, _a, ctx) => relationLoader(ctx).load(b.otherId),
  },

  SkillPair: {
    teacher: (p, _a, ctx) => ctx.loaders.user.load(p.teacherId),
    learner: (p, _a, ctx) => ctx.loaders.user.load(p.learnerId),
    teacherSkill: (p, _a, ctx) => ctx.loaders.skill.load(p.teacherSkillId),
    learnerSkill: (p, _a, ctx) => ctx.loaders.skill.load(p.learnerSkillId),
    fitPercent: (p) => Math.round(p.fit * 100),
  },
};
