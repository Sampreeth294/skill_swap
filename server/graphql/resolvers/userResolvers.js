import { User, Skill, SkillCategory, Connection, Session } from '../../models/index.js';
import { signToken } from '../../services/tokenService.js';
import { addCredits, CREDIT_RULES } from '../../services/creditService.js';
import { notify } from '../../services/notificationService.js';
import { pubsub, EVENTS } from '../../services/pubsub.js';
import { requireAuth, isSelfOrAdmin } from '../../middleware/auth.js';
import { AuthError, ConflictError, InputError } from '../../utils/errors.js';
import * as v from '../../utils/validate.js';
import { DAYS, toHHMM } from '../../utils/time.js';
import { normalizeSkill } from '../../utils/skillNames.js';
import { withFilter } from 'graphql-subscriptions';

export const PROFILE_CHECKS = [
  ['avatarUrl', 'Add a profile photo', (u) => !!u.avatarUrl],
  ['headline', 'Write a headline', (u) => !!u.headline],
  ['bio', 'Write a short bio', (u) => (u.bio || '').length >= 30],
  ['location', 'Add your location', (u) => !!u.location],
  ['availability', 'Set weekly availability', (u) => (u.availability || []).length > 0],
  ['learningInterests', 'Add learning interests', (u) => (u.learningInterests || []).length > 0],
];

export async function profileStatus(user, loaders) {
  const skills = await loaders.skillsByOwner.load(String(user._id));
  const checks = [
    ...PROFILE_CHECKS.map(([, label, fn]) => [label, fn(user)]),
    ['Add a skill you can teach', skills.some((s) => s.type === 'TEACH')],
    ['Add a skill you want to learn', skills.some((s) => s.type === 'LEARN')],
  ];
  const done = checks.filter(([, ok]) => ok).length;
  return { percent: Math.round((done / checks.length) * 100), missing: checks.filter(([, ok]) => !ok).map(([l]) => l) };
}

const sortMap = {
  TOP_RATED: { ratingAvg: -1, ratingCount: -1, completedExchanges: -1 },
  MOST_EXCHANGES: { completedExchanges: -1, ratingAvg: -1 },
  NEWEST: { createdAt: -1 },
};

export default {
  Query: {
    health: () => 'ok',

    me: (_p, _a, ctx) => ctx.user || null,

    user: async (_p, { id }, ctx) => {
      const u = await ctx.loaders.user.load(v.id(id));
      if (!u || (u.status !== 'ACTIVE' && ctx.user?.role !== 'ADMIN')) return null;
      return u;
    },

    users: async (_p, { filter = {}, page, sort }) => {
      const pg = v.pagination(page);
      const q = { status: 'ACTIVE' };
      if (filter.search) {
        const rx = new RegExp(v.escapeRegex(filter.search.trim()), 'i');
        q.$or = [{ name: rx }, { headline: rx }, { bio: rx }];
      }
      if (filter.location) q.location = new RegExp(v.escapeRegex(filter.location.trim()), 'i');
      if (filter.teaches || filter.categoryId) {
        const sq = { type: 'TEACH' };
        if (filter.teaches) sq.normalizedName = new RegExp(v.escapeRegex(normalizeSkill(filter.teaches)), 'i');
        if (filter.categoryId) sq.category = v.id(filter.categoryId, 'categoryId');
        q._id = { $in: await Skill.distinct('owner', sq) };
      }
      const [items, total] = await Promise.all([
        User.find(q).sort(sortMap[sort] || sortMap.TOP_RATED).skip(pg.skip).limit(pg.limit),
        User.countDocuments(q),
      ]);
      return v.pageResult(items, total, pg);
    },

    featuredUsers: async (_p, { limit }) => {
      const owners = await Skill.distinct('owner', { type: 'TEACH' });
      return User.find({ _id: { $in: owners }, status: 'ACTIVE', role: 'USER' })
        .sort({ ratingAvg: -1, completedExchanges: -1, createdAt: 1 })
        .limit(Math.min(12, limit || 6));
    },

    publicStats: async () => {
      const [users, skills, exchanges, sessions, categories, minutes] = await Promise.all([
        User.countDocuments({ status: 'ACTIVE' }),
        Skill.countDocuments(),
        Connection.countDocuments(),
        Session.countDocuments({ status: 'COMPLETED' }),
        SkillCategory.countDocuments({ isActive: true }),
        Session.aggregate([{ $match: { status: 'COMPLETED' } }, { $group: { _id: null, m: { $sum: '$durationMinutes' } } }]),
      ]);
      return { users, skills, exchanges, sessions, categories, hoursShared: Math.round((minutes[0]?.m || 0) / 60) };
    },
  },

  Mutation: {
    register: async (_p, { input }) => {
      const name = v.str(input.name, 'Name', { min: 2, max: 80 });
      const email = v.email(input.email);
      const password = v.password(input.password);
      if (await User.exists({ email })) throw ConflictError('An account with this email already exists.', { field: 'email' });

      const user = await User.create({ name, email, password });
      await addCredits({ userId: user._id, amount: CREDIT_RULES.SIGNUP_BONUS, type: 'BONUS', reason: 'Welcome bonus', refType: 'SIGNUP', refId: user._id });
      await notify({ user: user._id, type: 'SYSTEM', title: 'Welcome to SkillSwap 👋', body: `You received ${CREDIT_RULES.SIGNUP_BONUS} Knowledge Credits. Complete your profile to get better matches.`, link: '/profile' });
      const fresh = await User.findById(user._id);
      return { token: signToken(fresh), user: fresh };
    },

    login: async (_p, { input }) => {
      const email = v.email(input.email);
      const user = await User.findOne({ email }).select('+password');
      // Same message for unknown email & wrong password (no account enumeration)
      if (!user || !(await user.comparePassword(input.password || ''))) throw AuthError('Incorrect email or password.');
      if (user.status !== 'ACTIVE') throw AuthError('This account has been suspended. Contact support.');
      user.lastSeen = new Date();
      await user.save();
      const clean = await User.findById(user._id);
      return { token: signToken(clean), user: clean };
    },

    logout: async (_p, _a, ctx) => {
      if (ctx.user) await User.updateOne({ _id: ctx.user._id }, { lastSeen: new Date() });
      return true; // JWT is stateless — the client discards the token
    },

    updateProfile: async (_p, { input }, ctx) => {
      const me = requireAuth(ctx);
      const patch = {};
      if (input.name !== undefined) patch.name = v.str(input.name, 'Name', { min: 2, max: 80 });
      if (input.avatarUrl !== undefined) patch.avatarUrl = v.url(input.avatarUrl, 'Profile picture URL');
      if (input.headline !== undefined) patch.headline = v.str(input.headline, 'Headline', { max: 120, optional: true }) || '';
      if (input.bio !== undefined) patch.bio = v.str(input.bio, 'Bio', { max: 1000, optional: true }) || '';
      if (input.location !== undefined) patch.location = v.str(input.location, 'Location', { max: 120, optional: true }) || '';
      if (input.experience !== undefined) patch.experience = v.str(input.experience, 'Experience', { max: 500, optional: true }) || '';
      if (input.learningInterests !== undefined) {
        patch.learningInterests = [...new Set(input.learningInterests.map((s) => s.trim()).filter(Boolean))].slice(0, 15).map((s) => s.slice(0, 40));
      }
      if (input.availability !== undefined) {
        if (input.availability.length > 21) throw InputError('Too many availability slots.');
        patch.availability = input.availability.map((slot, i) => {
          const day = v.int(slot.day, `Slot ${i + 1} day`, { min: 0, max: 6 });
          const startMin = v.time(slot.start, `Slot ${i + 1} start`);
          const endMin = v.time(slot.end, `Slot ${i + 1} end`);
          if (endMin - startMin < 30) throw InputError(`Slot ${i + 1}: end must be at least 30 minutes after start.`);
          return { day, startMin, endMin };
        });
      }
      return User.findByIdAndUpdate(me._id, patch, { returnDocument: 'after', runValidators: true });
    },

    changePassword: async (_p, { currentPassword, newPassword }, ctx) => {
      const me = requireAuth(ctx);
      const user = await User.findById(me._id).select('+password');
      if (!(await user.comparePassword(currentPassword))) throw InputError('Current password is incorrect.', { field: 'currentPassword' });
      user.password = v.password(newPassword);
      await user.save();
      return true;
    },
  },

  Subscription: {
    presenceChanged: {
      subscribe: withFilter(
        (_p, _a, ctx) => {
          requireAuth(ctx);
          return pubsub.asyncIterableIterator(EVENTS.PRESENCE_CHANGED);
        },
        async (payload, _a, ctx) => {
          const other = payload.presenceChanged.userId;
          if (String(other) === String(ctx.user._id)) return false;
          return Boolean(await Connection.exists({ users: { $all: [ctx.user._id, other] } }));
        }
      ),
    },
  },

  User: {
    // Private fields are resolved to null for anyone but the owner/admin
    email: (u, _a, ctx) => (isSelfOrAdmin(ctx, u._id) ? u.email : null),
    credits: (u, _a, ctx) => (isSelfOrAdmin(ctx, u._id) ? u.credits : null),
    streak: (u, _a, ctx) => (isSelfOrAdmin(ctx, u._id) ? u.streak || { current: 0, longest: 0 } : null),
    status: (u) => u.status || 'ACTIVE',
    learningInterests: (u) => u.learningInterests || [],
    availability: (u) =>
      (u.availability || []).map((s) => ({ day: s.day, dayLabel: DAYS[s.day], start: toHHMM(s.startMin), end: toHHMM(s.endMin) })),
    teachingHours: (u) => Math.round(((u.teachingMinutes || 0) / 60) * 10) / 10,
    learningHours: (u) => Math.round(((u.learningMinutes || 0) / 60) * 10) / 10,
    ratingAvg: (u) => Math.round((u.ratingAvg || 0) * 10) / 10,
    teachSkills: async (u, _a, ctx) => (await ctx.loaders.skillsByOwner.load(String(u._id))).filter((s) => s.type === 'TEACH'),
    learnSkills: async (u, _a, ctx) => (await ctx.loaders.skillsByOwner.load(String(u._id))).filter((s) => s.type === 'LEARN'),
    profileCompletion: async (u, _a, ctx) => (await profileStatus(u, ctx.loaders)).percent,
  },
};
