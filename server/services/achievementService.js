import { Achievement, User, Session, Connection, LearningQuest, QuestMilestone } from '../models/index.js';
import { notify } from './notificationService.js';

/**
 * Every badge is derived from verified platform data. Nothing here can be
 * triggered directly by a client — it only reads what really happened.
 */
export const ACHIEVEMENTS = [
  { code: 'FIRST_SESSION', title: 'First Spark', description: 'Completed your first verified session.', icon: '✨', tier: 'BRONZE',
    check: (s) => s.sessions >= 1 },
  { code: 'FIRST_TEACH', title: 'Knowledge Giver', description: 'Taught your first verified session.', icon: '🎓', tier: 'BRONZE',
    check: (s) => s.taught >= 1 },
  { code: 'FIRST_EXCHANGE', title: 'Two-Way Street', description: 'Completed your first full skill exchange.', icon: '🔁', tier: 'SILVER',
    check: (s) => s.user.completedExchanges >= 1 },
  { code: 'MENTOR_10H', title: 'Mentor', description: 'Taught 10+ verified hours.', icon: '🧭', tier: 'GOLD',
    check: (s) => s.user.teachingMinutes >= 600 },
  { code: 'LEARNER_10H', title: 'Deep Diver', description: 'Learned for 10+ verified hours.', icon: '🌊', tier: 'GOLD',
    check: (s) => s.user.learningMinutes >= 600 },
  { code: 'QUEST_COMPLETE', title: 'Quest Champion', description: 'Completed a learning quest.', icon: '🏆', tier: 'SILVER',
    check: (s) => s.quests >= 1 },
  { code: 'MILESTONE_10', title: 'Milestone Maker', description: 'Completed 10 learning milestones.', icon: '🪜', tier: 'SILVER',
    check: (s) => s.milestones >= 10 },
  { code: 'STREAK_7', title: 'On Fire', description: 'Kept a 7-day learning streak.', icon: '🔥', tier: 'SILVER',
    check: (s) => (s.user.streak?.longest || 0) >= 7 },
  { code: 'CONNECTOR', title: 'Community Builder', description: 'Connected with 5 skill partners.', icon: '🤝', tier: 'SILVER',
    check: (s) => s.connections >= 5 },
  { code: 'TOP_RATED', title: 'Top Rated', description: 'Average rating of 4.5+ from at least 3 reviews.', icon: '⭐', tier: 'GOLD',
    check: (s) => s.user.ratingCount >= 3 && s.user.ratingAvg >= 4.5 },
];

export async function evaluateAchievements(userId) {
  const user = await User.findById(userId).lean();
  if (!user) return [];
  const [sessions, taught, quests, milestones, connections, existing] = await Promise.all([
    Session.countDocuments({ status: 'COMPLETED', $or: [{ teacher: userId }, { learner: userId }] }),
    Session.countDocuments({ status: 'COMPLETED', teacher: userId }),
    LearningQuest.countDocuments({ owner: userId, status: 'COMPLETED' }),
    QuestMilestone.countDocuments({ owner: userId, completed: true }),
    Connection.countDocuments({ users: userId }),
    Achievement.find({ user: userId }).select('code').lean(),
  ]);
  const stats = { user, sessions, taught, quests, milestones, connections };
  const have = new Set(existing.map((a) => a.code));
  const awarded = [];

  for (const a of ACHIEVEMENTS) {
    if (have.has(a.code) || !a.check(stats)) continue;
    try {
      const doc = await Achievement.create({ user: userId, code: a.code, title: a.title, description: a.description, icon: a.icon, tier: a.tier });
      awarded.push(doc);
      await notify({ user: userId, type: 'ACHIEVEMENT', title: `Badge unlocked: ${a.title}`, body: a.description, link: '/passport' });
    } catch (err) {
      if (err.code !== 11000) throw err; // already awarded concurrently
    }
  }
  return awarded;
}
