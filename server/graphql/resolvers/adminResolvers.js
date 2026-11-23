import { User, Skill, SkillCategory, SwapRequest, Connection, Session, Message, Report, Review } from '../../models/index.js';
import { requireAdmin, requireAuth } from '../../middleware/auth.js';
import { ConflictError, InputError, NotFoundError } from '../../utils/errors.js';
import { notify } from '../../services/notificationService.js';
import { recalcRating } from './reviewResolvers.js';
import * as v from '../../utils/validate.js';
import { ref, same } from './helpers.js';

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function targetOf(type, id) {
  if (type === 'USER') { const u = await User.findById(id); return u && { owner: u._id, preview: `${u.name} — ${u.headline || u.email}` }; }
  if (type === 'MESSAGE') { const m = await Message.findById(id); return m && { owner: m.sender, preview: m.body.slice(0, 200) }; }
  if (type === 'REVIEW') { const r = await Review.findById(id); return r && { owner: r.reviewer, preview: `${r.rating}★ ${r.comment}`.slice(0, 200) }; }
  if (type === 'SKILL') { const s = await Skill.findById(id); return s && { owner: s.owner, preview: `${s.name}: ${s.description}`.slice(0, 200) }; }
  return null;
}

export default {
  Query: {
    adminStats: async (_p, _a, ctx) => {
      requireAdmin(ctx);
      const since = new Date(Date.now() - 13 * 86400000);
      since.setUTCHours(0, 0, 0, 0);
      const perDay = (Model, match, field = 'createdAt') =>
        Model.aggregate([{ $match: { ...match, [field]: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: `$${field}` } }, n: { $sum: 1 } } }]);
      const [users, activeUsers, suspendedUsers, onlineUsers, skills, connections, requests, pendingRequests, sessionsCompleted, messages, openReports, credits, su, rq, ss, topSkills] = await Promise.all([
        User.countDocuments(), User.countDocuments({ status: 'ACTIVE' }), User.countDocuments({ status: 'SUSPENDED' }), User.countDocuments({ isOnline: true }),
        Skill.countDocuments(), Connection.countDocuments(), SwapRequest.countDocuments(), SwapRequest.countDocuments({ status: 'PENDING' }),
        Session.countDocuments({ status: 'COMPLETED' }), Message.countDocuments(), Report.countDocuments({ status: 'OPEN' }),
        User.aggregate([{ $group: { _id: null, c: { $sum: '$credits' } } }]),
        perDay(User, {}), perDay(SwapRequest, {}), perDay(Session, { status: 'COMPLETED' }, 'completedAt'),
        Skill.aggregate([
          { $group: { _id: '$normalizedName', name: { $first: '$name' }, category: { $first: '$category' }, teachers: { $sum: { $cond: [{ $eq: ['$type', 'TEACH'] }, 1, 0] } }, learners: { $sum: { $cond: [{ $eq: ['$type', 'LEARN'] }, 1, 0] } } } },
          { $sort: { learners: -1, teachers: -1 } }, { $limit: 8 },
        ]),
      ]);
      const m = (rows) => new Map(rows.map((r) => [r._id, r.n]));
      const [a, b, c] = [m(su), m(rq), m(ss)];
      const timeline = Array.from({ length: 14 }, (_, i) => {
        const key = new Date(since.getTime() + i * 86400000).toISOString().slice(0, 10);
        return { date: key, signups: a.get(key) || 0, requests: b.get(key) || 0, sessions: c.get(key) || 0 };
      });
      return { users, activeUsers, suspendedUsers, onlineUsers, skills, connections, requests, pendingRequests, sessionsCompleted, messages, openReports, creditsInCirculation: credits[0]?.c || 0, timeline, topSkills };
    },

    adminUsers: async (_p, { filter = {}, page }, ctx) => {
      requireAdmin(ctx);
      const pg = v.pagination(page, 50);
      const q = {};
      if (filter.search) { const rx = new RegExp(v.escapeRegex(filter.search.trim()), 'i'); q.$or = [{ name: rx }, { email: rx }]; }
      if (filter.status) q.status = filter.status;
      if (filter.role) q.role = filter.role;
      const [items, total] = await Promise.all([User.find(q).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit), User.countDocuments(q)]);
      return v.pageResult(items, total, pg);
    },

    adminRequests: async (_p, { status, page }, ctx) => {
      requireAdmin(ctx);
      const pg = v.pagination(page, 50);
      const q = status ? { status } : {};
      const [items, total] = await Promise.all([SwapRequest.find(q).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit), SwapRequest.countDocuments(q)]);
      return v.pageResult(items, total, pg);
    },

    adminReports: async (_p, { status, page }, ctx) => {
      requireAdmin(ctx);
      const pg = v.pagination(page, 50);
      const q = status ? { status } : {};
      const [items, total] = await Promise.all([Report.find(q).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit), Report.countDocuments(q)]);
      return v.pageResult(items, total, pg);
    },

    adminActivity: async (_p, { limit }, ctx) => {
      requireAdmin(ctx);
      const l = Math.min(50, limit || 20);
      const [users, reqs, sessions, reports] = await Promise.all([
        User.find().sort({ createdAt: -1 }).limit(l).lean(),
        SwapRequest.find().sort({ updatedAt: -1 }).limit(l).lean(),
        Session.find({ status: 'COMPLETED' }).sort({ completedAt: -1 }).limit(l).lean(),
        Report.find().sort({ createdAt: -1 }).limit(l).lean(),
      ]);
      return [
        ...users.map((u) => ({ id: `u${u._id}`, kind: 'SIGNUP', text: `${u.name} joined SkillSwap`, actorId: u._id, createdAt: u.createdAt })),
        ...reqs.map((r) => ({ id: `r${r._id}${r.status}`, kind: `REQUEST_${r.status}`, text: `Swap request ${r.status.toLowerCase()}`, actorId: r.from, createdAt: r.updatedAt })),
        ...sessions.map((s) => ({ id: `s${s._id}`, kind: 'SESSION_COMPLETED', text: `Session completed: ${s.title} (${s.skillName})`, actorId: s.teacher, createdAt: s.completedAt })),
        ...reports.map((r) => ({ id: `p${r._id}`, kind: 'REPORT', text: `New ${r.targetType.toLowerCase()} report: ${r.reason.slice(0, 60)}`, actorId: r.reporter, createdAt: r.createdAt })),
      ].sort((a, b) => b.createdAt - a.createdAt).slice(0, l);
    },

    adminCategories: (_p, _a, ctx) => { requireAdmin(ctx); return SkillCategory.find().sort({ name: 1 }); },
  },

  Mutation: {
    reportContent: async (_p, { input }, ctx) => {
      const me = requireAuth(ctx);
      const targetId = v.id(input.targetId, 'targetId');
      const target = await targetOf(input.targetType, targetId);
      if (!target) throw NotFoundError('The reported item no longer exists.');
      if (same(target.owner, me._id)) throw InputError('You cannot report your own content.');
      if (await Report.exists({ reporter: me._id, targetType: input.targetType, targetId })) throw ConflictError('You have already reported this. Our team will review it.');
      return Report.create({ reporter: me._id, targetType: input.targetType, targetId, targetUser: target.owner, reason: v.str(input.reason, 'Reason', { min: 5, max: 500 }) });
    },

    adminSetUserStatus: async (_p, { userId, status }, ctx) => {
      const admin = requireAdmin(ctx);
      if (same(userId, admin._id)) throw InputError('You cannot change your own status.');
      const u = await User.findByIdAndUpdate(v.id(userId, 'userId'), { status }, { returnDocument: 'after' });
      if (!u) throw NotFoundError('User not found.');
      if (status === 'SUSPENDED') await SwapRequest.updateMany({ status: 'PENDING', $or: [{ from: u._id }, { to: u._id }] }, { status: 'CANCELLED' });
      return u;
    },

    adminSetUserRole: async (_p, { userId, role }, ctx) => {
      const admin = requireAdmin(ctx);
      if (same(userId, admin._id)) throw InputError('You cannot change your own role.');
      const u = await User.findByIdAndUpdate(v.id(userId, 'userId'), { role }, { returnDocument: 'after' });
      if (!u) throw NotFoundError('User not found.');
      return u;
    },

    createCategory: async (_p, { input }, ctx) => {
      requireAdmin(ctx);
      const name = v.str(input.name, 'Name', { min: 2, max: 60 });
      return SkillCategory.create({ name, slug: slugify(name), description: input.description || '', icon: input.icon || '✦', color: input.color || '#7357E8', isActive: input.isActive ?? true });
    },

    updateCategory: async (_p, { id, input }, ctx) => {
      requireAdmin(ctx);
      const name = v.str(input.name, 'Name', { min: 2, max: 60 });
      const patch = { name, slug: slugify(name), description: input.description || '', icon: input.icon || '✦', color: input.color || '#7357E8' };
      if (input.isActive !== undefined && input.isActive !== null) patch.isActive = input.isActive;
      const c = await SkillCategory.findByIdAndUpdate(v.id(id), patch, { returnDocument: 'after' });
      if (!c) throw NotFoundError('Category not found.');
      return c;
    },

    deleteCategory: async (_p, { id }, ctx) => {
      requireAdmin(ctx);
      if (await Skill.exists({ category: v.id(id) })) throw ConflictError('This category is in use. Deactivate it instead.');
      await SkillCategory.deleteOne({ _id: id });
      return id;
    },

    resolveReport: async (_p, { id, action, note }, ctx) => {
      const admin = requireAdmin(ctx);
      const report = await Report.findById(v.id(id));
      if (!report) throw NotFoundError('Report not found.');
      if (report.status !== 'OPEN') throw ConflictError('This report is already closed.');

      if (action === 'HIDE_CONTENT') {
        if (report.targetType === 'MESSAGE') await Message.updateOne({ _id: report.targetId }, { hidden: true });
        else if (report.targetType === 'REVIEW') { const r = await Review.findByIdAndUpdate(report.targetId, { hidden: true }); if (r) await recalcRating(r.reviewee); }
        else if (report.targetType === 'SKILL') await Skill.deleteOne({ _id: report.targetId });
        else throw InputError('Use SUSPEND_USER for user reports.');
      }
      if (action === 'SUSPEND_USER' && report.targetUser) {
        if (same(report.targetUser, admin._id)) throw InputError('You cannot suspend yourself.');
        await User.updateOne({ _id: report.targetUser }, { status: 'SUSPENDED' });
        await SwapRequest.updateMany({ status: 'PENDING', $or: [{ from: report.targetUser }, { to: report.targetUser }] }, { status: 'CANCELLED' });
      }
      report.status = action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED';
      report.resolution = `${action}${note ? `: ${note.slice(0, 300)}` : ''}`;
      report.resolvedBy = admin._id;
      await report.save();
      await notify({ user: report.reporter, type: 'SYSTEM', title: 'Your report was reviewed', body: 'Thank you for helping keep SkillSwap safe.' });
      return report;
    },
  },

  Report: {
    reporter: ref('reporter', 'user'),
    targetUser: ref('targetUser', 'user'),
    targetPreview: async (r) => (await targetOf(r.targetType, r.targetId))?.preview || '(deleted)',
  },

  ActivityEvent: {
    actor: (e, _a, ctx) => (e.actorId ? ctx.loaders.user.load(String(e.actorId)) : null),
  },
};

