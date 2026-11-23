import DataLoader from 'dataloader';
import { Skill, SkillCategory, Session, User, SwapRequest } from '../../models/index.js';
import { requireAuth } from '../../middleware/auth.js';
import { ForbiddenError, NotFoundError, InputError, ConflictError } from '../../utils/errors.js';
import { normalizeSkill } from '../../utils/skillNames.js';
import { scoresFor } from '../../services/matchingService.js';
import * as v from '../../utils/validate.js';
import { ref, sid } from './helpers.js';

const LEVEL_RANK = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3, EXPERT: 4 };

/** Per-request memo of skill counts per category (one aggregation for all categories). */
function categoryCounts(ctx) {
  if (!ctx._categoryCounts) {
    ctx._categoryCounts = Skill.aggregate([{ $group: { _id: { c: '$category', t: '$type' }, n: { $sum: 1 } } }]).then((rows) => {
      const m = new Map();
      for (const r of rows) m.set(`${r._id.c}:${r._id.t}`, r.n);
      return m;
    });
  }
  return ctx._categoryCounts;
}

/** Batched compatibility scores for skill owners shown on one page. */
function matchScoreLoader(ctx) {
  if (!ctx._matchScore) {
    ctx._matchScore = new DataLoader(async (ownerIds) => {
      const map = await scoresFor(ctx.user._id, ownerIds);
      return ownerIds.map((id) => map.get(String(id)) ?? null);
    }, { cacheKeyFn: String });
  }
  return ctx._matchScore;
}

async function ownSkill(ctx, id) {
  const me = requireAuth(ctx);
  const skill = await Skill.findById(v.id(id));
  if (!skill) throw NotFoundError('Skill not found.');
  if (String(skill.owner) !== String(me._id)) throw ForbiddenError('You can only change your own skills.');
  return skill;
}

async function validCategory(id) {
  const cat = await SkillCategory.findById(v.id(id, 'categoryId'));
  if (!cat || !cat.isActive) throw InputError('Please choose a valid category.', { field: 'categoryId' });
  return cat;
}

export async function buildSkillDNA(userId, loaders) {
  const user = await loaders.user.load(String(userId));
  if (!user) throw NotFoundError('User not found.');
  const [skills, sessionsBySkill] = await Promise.all([
    Skill.find({ owner: userId }).lean(),
    Session.aggregate([
      { $match: { status: 'COMPLETED', $or: [{ teacher: user._id }, { learner: user._id }] } },
      { $group: { _id: { s: { $toLower: '$skillName' }, teacher: { $eq: ['$teacher', user._id] } }, n: { $sum: 1 } } },
    ]),
  ]);
  const taughtCount = new Map();
  const learnedCount = new Map();
  for (const r of sessionsBySkill) (r._id.teacher ? taughtCount : learnedCount).set(normalizeSkill(r._id.s), r.n);

  const nodes = [];
  const cat = new Map();
  const bump = (c, field, w) => {
    const k = String(c);
    if (!cat.has(k)) cat.set(k, { categoryId: k, score: 0, teach: 0, learn: 0 });
    const e = cat.get(k);
    e.score += w;
    if (field) e[field] += 1;
  };

  for (const s of skills) {
    const sessions = (s.type === 'TEACH' ? taughtCount : learnedCount).get(s.normalizedName) || 0;
    let kind = s.type;
    if (s.type === 'TEACH' && (s.level === 'EXPERT' || sessions >= 3)) kind = 'MASTERED';
    if (s.type === 'LEARN' && s.status === 'COMPLETED') kind = 'LEARNED';
    const weight = s.type === 'TEACH'
      ? LEVEL_RANK[s.level] * 0.25 + Math.min(1, sessions / 5) * 0.4 + Math.min(1, s.experienceMonths / 60) * 0.2
      : 0.35 + Math.min(1, sessions / 5) * 0.4 + (kind === 'LEARNED' ? 0.25 : 0);
    nodes.push({ id: String(s._id), label: s.name, kind, categoryId: s.category, level: s.level, weight: Math.min(1, Math.round(weight * 100) / 100), sessions });
    bump(s.category, s.type === 'TEACH' ? 'teach' : 'learn', s.type === 'TEACH' ? 1 + LEVEL_RANK[s.level] / 2 + sessions * 0.3 : 0.6 + sessions * 0.2);
  }
  const known = new Set(skills.map((s) => s.normalizedName));
  for (const interest of user.learningInterests || []) {
    if (known.has(normalizeSkill(interest))) continue;
    nodes.push({ id: `interest:${interest}`, label: interest, kind: 'INTEREST', categoryId: null, level: null, weight: 0.25, sessions: 0 });
  }

  const categories = [...cat.values()].sort((a, b) => b.score - a.score);
  const max = categories[0]?.score || 1;
  const count = (k) => nodes.filter((n) => n.kind === k).length;
  return {
    user,
    nodes,
    categories: categories.map((c) => ({ ...c, score: Math.round((c.score / max) * 100) / 100 })),
    strongestCategoryId: categories[0]?.categoryId || null,
    totals: {
      teach: count('TEACH') + count('MASTERED'),
      learn: count('LEARN') + count('LEARNED'),
      mastered: count('MASTERED'),
      learned: count('LEARNED'),
      interests: count('INTEREST'),
    },
  };
}

const SORTS = { NEWEST: { createdAt: -1 }, NAME: { name: 1 }, LEVEL: { level: -1, experienceMonths: -1 } };

export default {
  Query: {
    categories: () => SkillCategory.find({ isActive: true }).sort({ name: 1 }),

    skills: async (_p, { filter = {}, page, sort }, ctx) => {
      const pg = v.pagination(page);
      const q = { type: filter.type || 'TEACH' };
      if (filter.search?.trim()) {
        const term = filter.search.trim();
        const rx = new RegExp(v.escapeRegex(term), 'i');
        q.$or = [{ name: rx }, { normalizedName: new RegExp(v.escapeRegex(normalizeSkill(term)), 'i') }, { description: rx }];
      }
      if (filter.categoryId) q.category = v.id(filter.categoryId, 'categoryId');
      if (filter.level) q.level = filter.level;
      if (filter.ownerId) q.owner = v.id(filter.ownerId, 'ownerId');
      // Hide suspended users' skills and (when signed in) your own
      const hidden = await User.distinct('_id', { status: 'SUSPENDED' });
      if (ctx.user && !filter.ownerId) hidden.push(ctx.user._id);
      if (hidden.length && !filter.ownerId) q.owner = { $nin: hidden };

      const [items, total] = await Promise.all([
        Skill.find(q).sort(SORTS[sort] || SORTS.NEWEST).skip(pg.skip).limit(pg.limit),
        Skill.countDocuments(q),
      ]);
      return v.pageResult(items, total, pg);
    },

    popularSkills: async (_p, { limit }) => {
      const rows = await Skill.aggregate([
        { $group: { _id: '$normalizedName', name: { $first: '$name' }, category: { $first: '$category' }, teachers: { $sum: { $cond: [{ $eq: ['$type', 'TEACH'] }, 1, 0] } }, learners: { $sum: { $cond: [{ $eq: ['$type', 'LEARN'] }, 1, 0] } } } },
        { $addFields: { total: { $add: ['$teachers', '$learners'] } } },
        { $sort: { total: -1, name: 1 } },
        { $limit: Math.min(20, limit || 8) },
      ]);
      return rows;
    },

    mySkills: (_p, { type }, ctx) => {
      const me = requireAuth(ctx);
      return Skill.find({ owner: me._id, ...(type ? { type } : {}) }).sort({ createdAt: 1 });
    },

    skillDNA: async (_p, { userId }, ctx) => {
      const target = userId ? v.id(userId, 'userId') : requireAuth(ctx)._id;
      return buildSkillDNA(target, ctx.loaders);
    },
  },

  Mutation: {
    addSkill: async (_p, { input }, ctx) => {
      const me = requireAuth(ctx);
      const name = v.str(input.name, 'Skill name', { min: 1, max: 60 });
      await validCategory(input.categoryId);
      const count = await Skill.countDocuments({ owner: me._id, type: input.type });
      if (count >= 25) throw InputError('You can list up to 25 skills of each type.');
      if (await Skill.exists({ owner: me._id, type: input.type, normalizedName: normalizeSkill(name) })) {
        throw ConflictError(`"${name}" is already in your ${input.type === 'TEACH' ? 'teaching' : 'learning'} list.`);
      }
      return Skill.create({
        owner: me._id,
        type: input.type,
        name,
        category: input.categoryId,
        description: v.str(input.description, 'Description', { max: 500, optional: true }) || '',
        level: input.level || 'BEGINNER',
        experienceMonths: v.int(input.experienceMonths, 'Experience (months)', { min: 0, max: 600, fallback: 0 }),
      });
    },

    updateSkill: async (_p, { id, input }, ctx) => {
      const skill = await ownSkill(ctx, id);
      if (input.name !== undefined) skill.name = v.str(input.name, 'Skill name', { min: 1, max: 60 });
      if (input.categoryId !== undefined) skill.category = (await validCategory(input.categoryId))._id;
      if (input.description !== undefined) skill.description = v.str(input.description, 'Description', { max: 500, optional: true }) || '';
      if (input.level !== undefined) skill.level = input.level;
      if (input.experienceMonths !== undefined) skill.experienceMonths = v.int(input.experienceMonths, 'Experience (months)', { min: 0, max: 600 });
      if (input.status !== undefined) {
        if (skill.type !== 'LEARN') throw InputError('Only learning skills can be marked as completed.');
        skill.status = input.status;
      }
      await skill.save();
      return skill;
    },

    deleteSkill: async (_p, { id }, ctx) => {
      const skill = await ownSkill(ctx, id);
      const pending = await SwapRequest.exists({ status: 'PENDING', $or: [{ requestedSkill: skill._id }, { offeredSkill: skill._id }] });
      if (pending) throw ConflictError('This skill is part of a pending swap request. Resolve the request first.');
      await skill.deleteOne();
      return String(skill._id);
    },
  },

  Skill: {
    owner: ref('owner', 'user'),
    category: ref('category', 'category'),
    status: (s) => s.status || 'ACTIVE',
    experienceMonths: (s) => s.experienceMonths || 0,
    matchScore: (s, _a, ctx) => (ctx.user && String(s.owner) !== String(ctx.user._id) ? matchScoreLoader(ctx).load(sid(s.owner)) : null),
  },

  SkillCategory: {
    teachCount: async (c, _a, ctx) => (await categoryCounts(ctx)).get(`${c._id}:TEACH`) || 0,
    learnCount: async (c, _a, ctx) => (await categoryCounts(ctx)).get(`${c._id}:LEARN`) || 0,
    isActive: (c) => c.isActive !== false,
  },

  PopularSkill: {
    category: ref('category', 'category'),
  },

  SkillDNA: {
    strongestCategory: (d, _a, ctx) => (d.strongestCategoryId ? ctx.loaders.category.load(String(d.strongestCategoryId)) : null),
  },
  DNANode: {
    category: (n, _a, ctx) => (n.categoryId ? ctx.loaders.category.load(String(n.categoryId)) : null),
  },
  DNACategory: {
    category: (c, _a, ctx) => ctx.loaders.category.load(String(c.categoryId)),
  },
};
