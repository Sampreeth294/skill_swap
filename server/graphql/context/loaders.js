import DataLoader from 'dataloader';
import { User, Skill, SkillCategory, Connection, LearningQuest, LearningRoom } from '../../models/index.js';

/** Batches `findById` calls into one `$in` query per tick — kills N+1. */
const byId = (Model, cache) =>
  new DataLoader(
    async (ids) => {
      const docs = await Model.find({ _id: { $in: ids } });
      const map = new Map(docs.map((d) => [String(d._id), d]));
      return ids.map((id) => map.get(String(id)) || null);
    },
    { cache, cacheKeyFn: String }
  );

/** Groups child documents by a parent field, e.g. all skills per owner. */
const byField = (Model, field, cache, extra = {}) =>
  new DataLoader(
    async (keys) => {
      const docs = await Model.find({ [field]: { $in: keys }, ...extra }).sort({ createdAt: 1 });
      const groups = new Map(keys.map((k) => [String(k), []]));
      for (const d of docs) groups.get(String(d[field]))?.push(d);
      return keys.map((k) => groups.get(String(k)) || []);
    },
    { cache, cacheKeyFn: String }
  );

export function createLoaders({ cache = true } = {}) {
  return {
    user: byId(User, cache),
    skill: byId(Skill, cache),
    category: byId(SkillCategory, cache),
    connection: byId(Connection, cache),
    quest: byId(LearningQuest, cache),
    room: byId(LearningRoom, cache),
    skillsByOwner: byField(Skill, 'owner', cache),
  };
}
