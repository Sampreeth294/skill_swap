import { Session, Connection, User } from '../../models/index.js';
import { requireAuth } from '../../middleware/auth.js';
import { ConflictError, ForbiddenError, InputError, NotFoundError } from '../../utils/errors.js';
import { addCredits, creditsForSession } from '../../services/creditService.js';
import { notify } from '../../services/notificationService.js';
import { recordActivity } from '../../services/streakService.js';
import { evaluateAchievements } from '../../services/achievementService.js';
import * as v from '../../utils/validate.js';
import { ref, same, sid, memberConnection, partnerOf } from './helpers.js';

const ACTIVE = ['PROPOSED', 'ACCEPTED'];

/** Prevent double-booking for either participant. */
async function assertNoConflict(userIds, startsAt, endsAt, excludeId, statuses = ACTIVE) {
  const clash = await Session.findOne({
    _id: { $ne: excludeId },
    status: { $in: statuses },
    $or: [{ teacher: { $in: userIds } }, { learner: { $in: userIds } }],
    startsAt: { $lt: endsAt },
    endsAt: { $gt: startsAt },
  });
  if (clash) {
    const when = clash.startsAt.toISOString().slice(0, 16).replace('T', ' ');
    throw ConflictError(`This time clashes with another session ("${clash.title}" at ${when} UTC). Pick a different slot.`);
  }
}

async function participantSession(ctx, id) {
  const me = requireAuth(ctx);
  const s = await Session.findById(v.id(id));
  if (!s) throw NotFoundError('Session not found.');
  if (!same(s.teacher, me._id) && !same(s.learner, me._id)) throw ForbiddenError('You are not part of this session.');
  return s;
}

/** Runs exactly once per session (guarded by the atomic status transition). */
async function awardCompletedSession(s) {
  const minutes = s.durationMinutes;
  const credits = creditsForSession(minutes);
  await Promise.all([
    User.updateOne({ _id: s.teacher }, { $inc: { teachingMinutes: minutes } }),
    User.updateOne({ _id: s.learner }, { $inc: { learningMinutes: minutes } }),
    Connection.updateOne({ _id: s.connection }, { $inc: { completedSessions: 1 } }),
  ]);
  const txn = await addCredits({ userId: s.teacher, amount: credits, type: 'EARN', reason: `Taught "${s.skillName}" (${minutes} min)`, refType: 'SESSION', refId: s._id });
  if (txn) await notify({ user: s.teacher, type: 'CREDITS_EARNED', refId: s._id, link: '/passport', title: `+${credits} Knowledge Credits earned`, body: `For teaching ${s.skillName}.` });
  for (const uid of [s.teacher, s.learner]) {
    await recordActivity(uid);
    await notify({ user: uid, type: 'SESSION_UPDATE', refId: s._id, link: '/sessions', title: `Session completed: ${s.title}`, body: 'Both partners confirmed. Hours added to your Skill Passport.' });
    await evaluateAchievements(uid);
  }
}

export default {
  Query: {
    sessions: async (_p, { scope, page }, ctx) => {
      const me = requireAuth(ctx);
      const pg = v.pagination(page, 50);
      const base = { $or: [{ teacher: me._id }, { learner: me._id }] };
      let q = base;
      let sort = { startsAt: 1 };
      if (scope === 'UPCOMING') q = { ...base, status: 'ACCEPTED' };
      else if (scope === 'INVITATIONS') q = { ...base, status: 'PROPOSED' };
      else if (scope === 'PAST') { q = { ...base, status: { $in: ['COMPLETED', 'CANCELLED', 'REJECTED'] } }; sort = { startsAt: -1 }; }
      else sort = { startsAt: -1 };
      const [items, total] = await Promise.all([Session.find(q).sort(sort).skip(pg.skip).limit(pg.limit), Session.countDocuments(q)]);
      return v.pageResult(items, total, pg);
    },
    session: (_p, { id }, ctx) => participantSession(ctx, id),
  },

  Mutation: {
    proposeSession: async (_p, { input }, ctx) => {
      const me = requireAuth(ctx);
      const conn = await memberConnection(ctx, v.id(input.connectionId, 'connectionId'));
      if (conn.status !== 'ACTIVE') throw ConflictError('This exchange is completed. Start a new swap request to schedule more sessions.');
      const partner = partnerOf(conn, me._id);
      const teacherId = v.id(input.teacherId, 'teacherId');
      if (!conn.users.some((u) => same(u, teacherId))) throw InputError('The teacher must be you or your partner.');
      const learnerId = same(teacherId, me._id) ? partner : me._id;

      const startsAt = v.date(input.startsAt, 'Start time');
      if (startsAt.getTime() < Date.now() + 5 * 60000) throw InputError('Sessions must be scheduled at least 5 minutes in the future.', { field: 'startsAt' });
      if (startsAt.getTime() > Date.now() + 180 * 86400000) throw InputError('Sessions can be scheduled up to 6 months ahead.', { field: 'startsAt' });
      const durationMinutes = v.int(input.durationMinutes, 'Duration', { min: 15, max: 240 });
      if (durationMinutes % 15) throw InputError('Duration must be in 15-minute steps.');
      const endsAt = new Date(startsAt.getTime() + durationMinutes * 60000);
      await assertNoConflict([me._id, partner], startsAt, endsAt);

      const s = await Session.create({
        connection: conn._id, proposer: me._id, invitee: partner, teacher: teacherId, learner: learnerId,
        skillName: v.str(input.skillName, 'Skill', { min: 1, max: 60 }),
        title: v.str(input.title, 'Title', { min: 2, max: 120 }),
        agenda: v.str(input.agenda, 'Agenda', { max: 1000, optional: true }) || '',
        meetingLink: v.url(input.meetingLink, 'Meeting link'),
        startsAt, endsAt, durationMinutes,
      });
      await notify({ user: partner, actor: me._id, type: 'SESSION_INVITATION', refId: s._id, link: '/sessions', title: `${me.name} invited you to "${s.title}"`, body: `${s.skillName} · ${durationMinutes} min` });
      return s;
    },

    respondSession: async (_p, { id, accept }, ctx) => {
      const me = requireAuth(ctx);
      const s = await participantSession(ctx, id);
      if (!same(s.invitee, me._id)) throw ForbiddenError('Only the invited partner can respond.');
      if (s.status !== 'PROPOSED') throw ConflictError(`This session is already ${s.status.toLowerCase()}.`);
      if (accept) await assertNoConflict([s.teacher, s.learner], s.startsAt, s.endsAt, s._id, ['ACCEPTED']);
      const updated = await Session.findOneAndUpdate({ _id: s._id, status: 'PROPOSED' }, { status: accept ? 'ACCEPTED' : 'REJECTED' }, { returnDocument: 'after' });
      if (!updated) throw ConflictError('This session was already handled.');
      await notify({ user: s.proposer, actor: me._id, type: 'SESSION_UPDATE', refId: s._id, link: '/sessions', title: `${me.name} ${accept ? 'accepted' : 'declined'} "${s.title}"` });
      return updated;
    },

    cancelSession: async (_p, { id }, ctx) => {
      const me = requireAuth(ctx);
      const s = await participantSession(ctx, id);
      const updated = await Session.findOneAndUpdate({ _id: s._id, status: { $in: ACTIVE } }, { status: 'CANCELLED' }, { returnDocument: 'after' });
      if (!updated) throw ConflictError('Only proposed or accepted sessions can be cancelled.');
      const other = same(s.teacher, me._id) ? s.learner : s.teacher;
      await notify({ user: other, actor: me._id, type: 'SESSION_UPDATE', refId: s._id, link: '/sessions', title: `${me.name} cancelled "${s.title}"` });
      return updated;
    },

    completeSession: async (_p, { id }, ctx) => {
      const me = requireAuth(ctx);
      const s = await participantSession(ctx, id);
      if (s.status !== 'ACCEPTED') throw ConflictError('Only accepted sessions can be completed.');
      if (s.startsAt.getTime() > Date.now()) throw ConflictError('You can confirm a session once it has started.');
      const confirmed = await Session.findOneAndUpdate({ _id: s._id, status: 'ACCEPTED' }, { $addToSet: { confirmations: me._id } }, { returnDocument: 'after' });
      if (!confirmed) throw ConflictError('This session was already handled.');

      const bothConfirmed = [s.teacher, s.learner].every((u) => confirmed.confirmations.some((c) => same(c, u)));
      if (!bothConfirmed) {
        const other = same(s.teacher, me._id) ? s.learner : s.teacher;
        await notify({ user: other, actor: me._id, type: 'SESSION_UPDATE', refId: s._id, link: '/sessions', title: `${me.name} marked "${s.title}" as done`, body: 'Confirm it too to award hours and credits.' });
        return confirmed;
      }
      // Atomic transition — only one request can award credits
      const done = await Session.findOneAndUpdate({ _id: s._id, status: 'ACCEPTED' }, { status: 'COMPLETED', completedAt: new Date() }, { returnDocument: 'after' });
      if (done) await awardCompletedSession(done);
      return done || Session.findById(s._id);
    },
  },

  Session: {
    connection: ref('connection', 'connection'),
    proposer: ref('proposer', 'user'),
    invitee: ref('invitee', 'user'),
    teacher: ref('teacher', 'user'),
    learner: ref('learner', 'user'),
    partner: (s, _a, ctx) => ctx.loaders.user.load(same(s.teacher, ctx.user._id) ? sid(s.learner) : sid(s.teacher)),
    myRole: (s, _a, ctx) => (same(s.teacher, ctx.user._id) ? 'TEACHER' : 'LEARNER'),
    confirmedByMe: (s, _a, ctx) => (s.confirmations || []).some((c) => same(c, ctx.user._id)),
    confirmationsCount: (s) => (s.confirmations || []).length,
    canConfirm: (s, _a, ctx) => s.status === 'ACCEPTED' && s.startsAt <= new Date() && !(s.confirmations || []).some((c) => same(c, ctx.user._id)),
    canRespond: (s, _a, ctx) => s.status === 'PROPOSED' && same(s.invitee, ctx.user._id),
    creditsForTeacher: (s) => creditsForSession(s.durationMinutes),
  },
};
