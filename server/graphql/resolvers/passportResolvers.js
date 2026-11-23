import { Session, Skill, Review, Achievement, QuestMilestone, Connection, SwapRequest, LearningQuest, Notification, Message } from '../../models/index.js';
import { requireAuth, isSelfOrAdmin } from '../../middleware/auth.js';
import { NotFoundError } from '../../utils/errors.js';
import { ACHIEVEMENTS } from '../../services/achievementService.js';
import { buildSkillDNA } from './skillResolvers.js';
import { profileStatus } from './userResolvers.js';
import { dayKey } from '../../utils/time.js';
import * as v from '../../utils/validate.js';

const LEVELS = [
  { at: 0, name: 'Newcomer' },
  { at: 100, name: 'Contributor' },
  { at: 300, name: 'Mentor' },
  { at: 600, name: 'Expert' },
  { at: 1000, name: 'Luminary' },
];

export function reputationOf(user, badgeCount) {
  const ratingPart = (user.ratingAvg || 0) * 20 * Math.min(1, (user.ratingCount || 0) / 5);
  const score = Math.round(ratingPart + (user.completedExchanges || 0) * 25 + ((user.teachingMinutes || 0) / 60) * 8 + ((user.learningMinutes || 0) / 60) * 4 + badgeCount * 15);
  const idx = LEVELS.findLastIndex((l) => score >= l.at);
  return { score, level: LEVELS[idx].name, nextLevelAt: LEVELS[idx + 1]?.at ?? null };
}

const hours = (min) => Math.round((min / 60) * 10) / 10;

export default {
  Query: {
    skillPassport: async (_p, { userId }, ctx) => {
      const targetId = userId ? v.id(userId, 'userId') : String(requireAuth(ctx)._id);
      const user = await ctx.loaders.user.load(targetId);
      if (!user) throw NotFoundError('User not found.');
      const isSelf = isSelfOrAdmin(ctx, targetId);

      const [bySkill, earned, endorsements, milestonesCompleted, recentMilestones, learned, dna] = await Promise.all([
        Session.aggregate([
          { $match: { status: 'COMPLETED', $or: [{ teacher: user._id }, { learner: user._id }] } },
          { $group: { _id: { skill: '$skillName', teacher: { $eq: ['$teacher', user._id] } }, minutes: { $sum: '$durationMinutes' }, sessions: { $sum: 1 } } },
          { $sort: { minutes: -1 } },
        ]),
        Achievement.find({ user: user._id }).lean(),
        Review.aggregate([
          { $match: { reviewee: user._id, endorsedSkill: { $ne: '' }, hidden: { $ne: true } } },
          { $group: { _id: '$endorsedSkill', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        QuestMilestone.countDocuments({ owner: user._id, completed: true }),
        isSelf ? QuestMilestone.find({ owner: user._id, completed: true }).sort({ completedAt: -1 }).limit(8) : [],
        Skill.find({ owner: user._id, type: 'LEARN', status: 'COMPLETED' }).select('name').lean(),
        buildSkillDNA(user._id, ctx.loaders),
      ]);
      const earnedMap = new Map(earned.map((a) => [a.code, a]));
      const sessionsCompleted = bySkill.filter((r) => r._id.teacher).reduce((s, r) => s + r.sessions, 0) + bySkill.filter((r) => !r._id.teacher).reduce((s, r) => s + r.sessions, 0);
      return {
        user,
        teachingHours: hours(user.teachingMinutes || 0),
        learningHours: hours(user.learningMinutes || 0),
        completedExchanges: user.completedExchanges || 0,
        sessionsCompleted,
        skillsTaught: bySkill.filter((r) => r._id.teacher).map((r) => ({ skillName: r._id.skill, hours: hours(r.minutes), sessions: r.sessions })),
        skillsLearned: bySkill.filter((r) => !r._id.teacher).map((r) => ({ skillName: r._id.skill, hours: hours(r.minutes), sessions: r.sessions })),
        masteredSkills: dna.nodes.filter((n) => n.kind === 'MASTERED').map((n) => n.label),
        learnedSkills: learned.map((s) => s.name),
        achievements: ACHIEVEMENTS.map((a) => ({
          code: a.code, title: a.title, description: a.description, icon: a.icon, tier: a.tier,
          earned: earnedMap.has(a.code), awardedAt: earnedMap.get(a.code)?.createdAt || null,
        })),
        endorsements: endorsements.map((e) => ({ skillName: e._id, count: e.count })),
        milestonesCompleted,
        recentMilestones,
        reputation: reputationOf(user, earned.length),
        memberSince: user.createdAt,
      };
    },

    dashboardStats: async (_p, _a, ctx) => {
      const me = requireAuth(ctx);
      const [skills, connections, pendingIncoming, upcomingSessions, activeQuests, unreadNotifications, unreadMessages, profile] = await Promise.all([
        ctx.loaders.skillsByOwner.load(String(me._id)),
        Connection.countDocuments({ users: me._id }),
        SwapRequest.countDocuments({ to: me._id, status: 'PENDING' }),
        Session.countDocuments({ $or: [{ teacher: me._id }, { learner: me._id }], status: 'ACCEPTED', endsAt: { $gte: new Date() } }),
        LearningQuest.countDocuments({ owner: me._id, status: 'ACTIVE' }),
        Notification.countDocuments({ user: me._id, read: false }),
        Message.countDocuments({ recipient: me._id, readAt: null }),
        profileStatus(me, ctx.loaders),
      ]);
      return {
        teachCount: skills.filter((s) => s.type === 'TEACH').length,
        learnCount: skills.filter((s) => s.type === 'LEARN').length,
        connections, pendingIncoming, upcomingSessions, activeQuests, unreadNotifications, unreadMessages,
        credits: me.credits,
        profileCompletion: profile.percent,
        missingProfileItems: profile.missing,
      };
    },

    myActivity: async (_p, { days }, ctx) => {
      const me = requireAuth(ctx);
      const n = Math.min(60, Math.max(7, days || 14));
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      since.setDate(since.getDate() - (n - 1));
      const fmt = { $dateToString: { format: '%Y-%m-%d', date: '$d' } };
      const group = (dateField) => [{ $addFields: { d: `$${dateField}` } }, { $group: { _id: fmt, n: { $sum: 1 } } }];
      const [ms, ss, msg] = await Promise.all([
        QuestMilestone.aggregate([{ $match: { owner: me._id, completed: true, completedAt: { $gte: since } } }, ...group('completedAt')]),
        Session.aggregate([{ $match: { status: 'COMPLETED', completedAt: { $gte: since }, $or: [{ teacher: me._id }, { learner: me._id }] } }, ...group('completedAt')]),
        Message.aggregate([{ $match: { sender: me._id, createdAt: { $gte: since } } }, ...group('createdAt')]),
      ]);
      const toMap = (rows) => new Map(rows.map((r) => [r._id, r.n]));
      const [mM, sM, gM] = [toMap(ms), toMap(ss), toMap(msg)];
      return Array.from({ length: n }, (_, i) => {
        const d = new Date(since.getTime() + i * 86400000);
        const utcKey = d.toISOString().slice(0, 10);
        return { date: dayKey(d), milestones: mM.get(utcKey) || 0, sessions: sM.get(utcKey) || 0, messages: gM.get(utcKey) || 0 };
      });
    },
  },
};
