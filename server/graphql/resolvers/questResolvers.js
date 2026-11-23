import { LearningQuest, QuestMilestone, Skill } from '../../models/index.js';
import { requireAuth } from '../../middleware/auth.js';
import { ConflictError, ForbiddenError, InputError, NotFoundError } from '../../utils/errors.js';
import { notify } from '../../services/notificationService.js';
import { recordActivity } from '../../services/streakService.js';
import { evaluateAchievements } from '../../services/achievementService.js';
import { normalizeSkill } from '../../utils/skillNames.js';
import * as v from '../../utils/validate.js';
import { same, sid } from './helpers.js';

async function ownQuest(ctx, id) {
  const me = requireAuth(ctx);
  const q = await LearningQuest.findById(v.id(id, 'questId'));
  if (!q) throw NotFoundError('Quest not found.');
  if (!same(q.owner, me._id)) throw ForbiddenError('This is not your quest.');
  return q;
}

const milestonesOf = (questId) => QuestMilestone.find({ quest: questId }).sort({ order: 1 });

/** Spreads milestone due dates evenly across the quest duration. */
function dueDates(start, days, count) {
  return Array.from({ length: count }, (_, i) => new Date(start.getTime() + Math.round(((i + 1) / count) * days) * 86400000));
}

export default {
  Query: {
    quests: (_p, { status }, ctx) => {
      const me = requireAuth(ctx);
      return LearningQuest.find({ owner: me._id, ...(status ? { status } : {}) }).sort({ status: 1, createdAt: -1 });
    },
    quest: (_p, { id }, ctx) => ownQuest(ctx, id),
  },

  Mutation: {
    createQuest: async (_p, { input }, ctx) => {
      const me = requireAuth(ctx);
      const titles = (input.milestones || []).map((t, i) => v.str(t, `Milestone ${i + 1}`, { min: 1, max: 120 }));
      if (titles.length < 1 || titles.length > 20) throw InputError('Add between 1 and 20 milestones.');
      if ((await LearningQuest.countDocuments({ owner: me._id, status: 'ACTIVE' })) >= 10) throw ConflictError('You can have up to 10 active quests.');
      const targetDays = v.int(input.targetDays, 'Target days', { min: 1, max: 365, fallback: 21 });
      const quest = await LearningQuest.create({
        owner: me._id,
        title: v.str(input.title, 'Title', { min: 2, max: 120 }),
        skillName: v.str(input.skillName, 'Skill', { min: 1, max: 60 }),
        description: v.str(input.description, 'Description', { max: 600, optional: true }) || '',
        targetDays,
      });
      const dates = dueDates(quest.startDate, targetDays, titles.length);
      await QuestMilestone.insertMany(titles.map((title, i) => ({ quest: quest._id, owner: me._id, title, order: i + 1, dueDate: dates[i] })));
      return quest;
    },

    addMilestone: async (_p, { questId, title }, ctx) => {
      const quest = await ownQuest(ctx, questId);
      if (quest.status === 'COMPLETED') throw ConflictError('This quest is already completed.');
      const last = await QuestMilestone.findOne({ quest: quest._id }).sort({ order: -1 });
      if ((last?.order || 0) >= 20) throw InputError('A quest can have up to 20 milestones.');
      await QuestMilestone.create({ quest: quest._id, owner: quest.owner, title: v.str(title, 'Milestone', { min: 1, max: 120 }), order: (last?.order || 0) + 1, dueDate: new Date(quest.startDate.getTime() + quest.targetDays * 86400000) });
      return quest;
    },

    toggleMilestone: async (_p, { id }, ctx) => {
      const me = requireAuth(ctx);
      const m = await QuestMilestone.findById(v.id(id));
      if (!m || !same(m.owner, me._id)) throw NotFoundError('Milestone not found.');
      const quest = await LearningQuest.findById(m.quest);
      if (quest.status === 'COMPLETED') throw ConflictError('Completed quests are locked.');

      m.completed = !m.completed;
      m.completedAt = m.completed ? new Date() : undefined;
      await m.save();

      if (m.completed) {
        await recordActivity(me._id);
        await notify({ user: me._id, type: 'LEARNING_MILESTONE', refId: quest._id, link: '/quests', title: `Milestone reached: ${m.title}`, body: `Quest: ${quest.title}` });
        const remaining = await QuestMilestone.countDocuments({ quest: quest._id, completed: false });
        if (remaining === 0) {
          quest.status = 'COMPLETED';
          quest.completedAt = new Date();
          await quest.save();
          // Mark the matching "want to learn" skill as learned — feeds Skill DNA & Passport
          await Skill.updateOne({ owner: me._id, type: 'LEARN', normalizedName: normalizeSkill(quest.skillName) }, { status: 'COMPLETED' });
          await notify({ user: me._id, type: 'LEARNING_MILESTONE', refId: quest._id, link: '/quests', title: `Quest complete: ${quest.title} 🏆`, body: `${quest.skillName} has been added to your learned skills.` });
        }
        await evaluateAchievements(me._id);
      }
      return quest;
    },

    deleteMilestone: async (_p, { id }, ctx) => {
      const me = requireAuth(ctx);
      const m = await QuestMilestone.findById(v.id(id));
      if (!m || !same(m.owner, me._id)) throw NotFoundError('Milestone not found.');
      const quest = await LearningQuest.findById(m.quest);
      if (quest.status === 'COMPLETED') throw ConflictError('Completed quests are locked.');
      if ((await QuestMilestone.countDocuments({ quest: quest._id })) <= 1) throw InputError('A quest needs at least one milestone.');
      await m.deleteOne();
      return quest;
    },

    deleteQuest: async (_p, { id }, ctx) => {
      const quest = await ownQuest(ctx, id);
      if (quest.status === 'COMPLETED') throw ConflictError('Completed quests are part of your Skill Passport and cannot be deleted.');
      await QuestMilestone.deleteMany({ quest: quest._id });
      await quest.deleteOne();
      return String(quest._id);
    },
  },

  LearningQuest: {
    milestones: (q) => milestonesOf(q._id),
    endDate: (q) => new Date(q.startDate.getTime() + q.targetDays * 86400000),
    daysLeft: (q) => Math.max(0, Math.ceil((q.startDate.getTime() + q.targetDays * 86400000 - Date.now()) / 86400000)),
    totalCount: (q) => QuestMilestone.countDocuments({ quest: q._id }),
    completedCount: (q) => QuestMilestone.countDocuments({ quest: q._id, completed: true }),
    progress: async (q) => {
      const [total, done] = await Promise.all([QuestMilestone.countDocuments({ quest: q._id }), QuestMilestone.countDocuments({ quest: q._id, completed: true })]);
      return total ? Math.round((done / total) * 100) : 0;
    },
  },

  QuestMilestone: {
    questId: (m) => sid(m.quest),
  },
};
