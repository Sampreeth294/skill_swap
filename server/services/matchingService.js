import { User, Skill } from '../models/index.js';
import { availabilityOverlap, toHHMM, DAYS } from '../utils/time.js';

/**
 * SkillSwap transparent, rule-based two-way matching.
 *
 * Score (0–100) =
 *   Reciprocity   35  both people can teach each other something
 *   Coverage      15  how much of each person's wish-list the other covers
 *   Proficiency   25  teacher is meaningfully ahead of the learner
 *   Availability  20  overlapping weekly free time (3h+ = full marks)
 *   Reputation     5  peer rating (neutral if no reviews yet)
 */
export const WEIGHTS = { reciprocity: 35, coverage: 15, proficiency: 25, availability: 20, reputation: 5 };
const LEVEL_RANK = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 };

export function proficiencyFit(teacherLevel, learnerLevel) {
  const gap = (LEVEL_RANK[teacherLevel] || 1) - (LEVEL_RANK[learnerLevel] || 1);
  if (gap >= 2) return 1;
  if (gap === 1) return 0.85;
  if (gap === 0) return 0.45;
  return 0.2;
}

const split = (skills) => ({
  teach: skills.filter((s) => s.type === 'TEACH'),
  learn: skills.filter((s) => s.type === 'LEARN' && s.status !== 'COMPLETED'),
});

function pairsBetween(teacherSkills, learnerSkills, teacherId, learnerId) {
  const byName = new Map(teacherSkills.map((s) => [s.normalizedName, s]));
  const out = [];
  for (const want of learnerSkills) {
    const t = byName.get(want.normalizedName);
    if (!t) continue;
    out.push({
      skillName: t.name,
      teacherId: String(teacherId),
      learnerId: String(learnerId),
      teacherSkillId: String(t._id),
      learnerSkillId: String(want._id),
      teacherLevel: t.level,
      learnerLevel: want.level,
      fit: proficiencyFit(t.level, want.level),
    });
  }
  return out;
}

/** Computes a full, explainable match between `me` and `them`. */
export function computeMatch(me, them, mySkills, theirSkills) {
  const mine = split(mySkills);
  const theirs = split(theirSkills);

  const youLearn = pairsBetween(theirs.teach, mine.learn, them._id, me._id); // they teach me
  const youTeach = pairsBetween(mine.teach, theirs.learn, me._id, them._id); // I teach them
  if (!youLearn.length && !youTeach.length) return null;

  const matchType = youLearn.length && youTeach.length ? 'MUTUAL' : youLearn.length ? 'THEY_TEACH_YOU' : 'YOU_TEACH_THEM';

  const reciprocity = matchType === 'MUTUAL' ? 1 : matchType === 'THEY_TEACH_YOU' ? 0.35 : 0.25;
  const coverage =
    ((mine.learn.length ? youLearn.length / mine.learn.length : 0) +
      (theirs.learn.length ? youTeach.length / theirs.learn.length : 0)) / 2;
  const allPairs = [...youLearn, ...youTeach];
  const proficiency = allPairs.reduce((sum, p) => sum + p.fit, 0) / allPairs.length;

  const overlap = availabilityOverlap(me.availability, them.availability);
  const overlapMinutes = overlap.reduce((s, w) => s + (w.endMin - w.startMin), 0);
  const availabilityKnown = (me.availability?.length || 0) > 0 && (them.availability?.length || 0) > 0;
  const availability = availabilityKnown ? Math.min(1, overlapMinutes / 180) : 0.4;

  const reputation = them.ratingCount ? them.ratingAvg / 5 : 0.6;

  const breakdown = {
    reciprocity: Math.round(reciprocity * WEIGHTS.reciprocity),
    coverage: Math.round(coverage * WEIGHTS.coverage),
    proficiency: Math.round(proficiency * WEIGHTS.proficiency),
    availability: Math.round(availability * WEIGHTS.availability),
    reputation: Math.round(reputation * WEIGHTS.reputation),
  };
  const score = Math.min(100, Object.values(breakdown).reduce((a, b) => a + b, 0));

  // Human-readable explanation
  const reasons = [];
  const first = (name) => them.name.split(' ')[0] || name;
  if (matchType === 'MUTUAL') {
    reasons.push(`Perfect swap: you teach ${youTeach.map((p) => p.skillName).join(', ')} and ${first()} teaches ${youLearn.map((p) => p.skillName).join(', ')}.`);
  } else if (matchType === 'THEY_TEACH_YOU') {
    reasons.push(`${first()} teaches ${youLearn.map((p) => p.skillName).join(', ')}, which is on your learning list. You can use Knowledge Credits for this.`);
  } else {
    reasons.push(`${first()} wants to learn ${youTeach.map((p) => p.skillName).join(', ')} — a skill you teach. Teach to earn credits.`);
  }
  const strong = allPairs.filter((p) => p.fit >= 0.85);
  if (strong.length) reasons.push(`Strong proficiency fit on ${strong.map((p) => p.skillName).join(', ')} — the teacher is clearly ahead of the learner.`);
  else reasons.push('Similar proficiency levels — great for peer-style practice.');
  if (!availabilityKnown) reasons.push('Add your weekly availability to sharpen this score.');
  else if (overlapMinutes >= 60) reasons.push(`You share ${Math.round(overlapMinutes / 60)}h of free time per week, e.g. ${DAYS[overlap[0].day]} ${toHHMM(overlap[0].startMin)}–${toHHMM(overlap[0].endMin)}.`);
  else reasons.push('Your weekly schedules barely overlap — you may need to be flexible.');
  if (them.ratingCount >= 1) reasons.push(`${first()} is rated ${them.ratingAvg.toFixed(1)}★ by ${them.ratingCount} peer${them.ratingCount > 1 ? 's' : ''}.`);

  return {
    id: String(them._id),
    userId: String(them._id),
    matchType,
    score,
    breakdown,
    reasons,
    youLearn,
    youTeach,
    overlap: overlap.map((w) => ({ day: w.day, dayLabel: DAYS[w.day], start: toHHMM(w.startMin), end: toHHMM(w.endMin), minutes: w.endMin - w.startMin })),
    overlapMinutes,
    mySkills: mine,
    theirSkills: theirs,
  };
}

/** Finds and ranks all compatible partners for a user. */
export async function findMatches(userId, { matchType, minScore = 0, limit = 50 } = {}) {
  const me = await User.findById(userId).lean();
  const mySkills = await Skill.find({ owner: userId }).lean();
  const mine = split(mySkills);
  const learnNames = mine.learn.map((s) => s.normalizedName);
  const teachNames = mine.teach.map((s) => s.normalizedName);
  if (!learnNames.length && !teachNames.length) return [];

  // 1 + 2. Users who teach what I want, and users who want what I teach
  const [teachersOfMyWants, learnersOfMyOffers] = await Promise.all([
    learnNames.length ? Skill.distinct('owner', { type: 'TEACH', normalizedName: { $in: learnNames }, owner: { $ne: me._id } }) : [],
    teachNames.length ? Skill.distinct('owner', { type: 'LEARN', status: 'ACTIVE', normalizedName: { $in: teachNames }, owner: { $ne: me._id } }) : [],
  ]);

  // 8 + 9. Exclude self and de-duplicate
  const ids = [...new Set([...teachersOfMyWants, ...learnersOfMyOffers].map(String))].filter((id) => id !== String(userId)).slice(0, 400);
  if (!ids.length) return [];

  const [users, skills] = await Promise.all([
    User.find({ _id: { $in: ids }, status: 'ACTIVE' }).lean(),
    Skill.find({ owner: { $in: ids } }).lean(),
  ]);
  const skillsByOwner = new Map();
  for (const s of skills) {
    const k = String(s.owner);
    if (!skillsByOwner.has(k)) skillsByOwner.set(k, []);
    skillsByOwner.get(k).push(s);
  }

  // 3–7. Reciprocity, proficiency, availability, score and explanation
  return users
    .map((u) => computeMatch(me, u, mySkills, skillsByOwner.get(String(u._id)) || []))
    .filter(Boolean)
    .filter((m) => (!matchType || m.matchType === matchType) && m.score >= minScore)
    .sort((a, b) => b.score - a.score || (b.matchType === 'MUTUAL') - (a.matchType === 'MUTUAL'))
    .slice(0, limit);
}

/** Match between me and one specific user (for profiles and the Blueprint). */
export async function matchWith(userId, otherId) {
  const [me, them, mySkills, theirSkills] = await Promise.all([
    User.findById(userId).lean(),
    User.findById(otherId).lean(),
    Skill.find({ owner: userId }).lean(),
    Skill.find({ owner: otherId }).lean(),
  ]);
  if (!me || !them) return null;
  return computeMatch(me, them, mySkills, theirSkills);
}

/** Lightweight scores for many users at once (Explore marketplace cards). */
export async function scoresFor(userId, otherIds) {
  if (!userId || !otherIds.length) return new Map();
  const ids = [...new Set(otherIds.map(String))].filter((id) => id !== String(userId));
  const [me, mySkills, users, skills] = await Promise.all([
    User.findById(userId).lean(),
    Skill.find({ owner: userId }).lean(),
    User.find({ _id: { $in: ids } }).lean(),
    Skill.find({ owner: { $in: ids } }).lean(),
  ]);
  const map = new Map();
  for (const u of users) {
    const m = computeMatch(me, u, mySkills, skills.filter((s) => String(s.owner) === String(u._id)));
    if (m) map.set(String(u._id), m.score);
  }
  return map;
}
