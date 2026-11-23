import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMatch, proficiencyFit } from '../services/matchingService.js';
import { normalizeSkill } from '../utils/skillNames.js';
import { availabilityOverlap } from '../utils/time.js';

const user = (id, name, availability = [], rating = [0, 0]) => ({ _id: id, name, availability, ratingAvg: rating[0], ratingCount: rating[1] });
const skill = (owner, type, name, level = 'BEGINNER') => ({ _id: `${owner}-${type}-${name}`, owner, type, name, normalizedName: normalizeSkill(name), level, status: 'ACTIVE' });

const raju = user('a', 'Raju Sharma', [{ day: 1, startMin: 1140, endMin: 1320 }]);
const rahul = user('b', 'Rahul Verma', [{ day: 1, startMin: 1200, endMin: 1380 }], [4.8, 5]);
const rajuSkills = [skill('a', 'TEACH', 'Python', 'EXPERT'), skill('a', 'LEARN', 'React', 'BEGINNER')];
const rahulSkills = [skill('b', 'TEACH', 'ReactJS', 'EXPERT'), skill('b', 'LEARN', 'Python', 'BEGINNER')];

test('alias normalisation matches React variants', () => {
  assert.equal(normalizeSkill(' React.js '), 'react');
  assert.equal(normalizeSkill('ReactJS'), 'react');
});

test('mutual Python ↔ React swap is detected with a high score', () => {
  const m = computeMatch(raju, rahul, rajuSkills, rahulSkills);
  assert.equal(m.matchType, 'MUTUAL');
  assert.equal(m.youLearn[0].skillName, 'ReactJS');
  assert.equal(m.youTeach[0].skillName, 'Python');
  assert.ok(m.score >= 85, `score ${m.score}`);
  assert.equal(m.overlapMinutes, 120);
  assert.ok(m.reasons[0].startsWith('Perfect swap'));
});

test('one-way match scores lower than mutual', () => {
  const m = computeMatch(raju, rahul, rajuSkills, [skill('b', 'TEACH', 'React', 'EXPERT')]);
  assert.equal(m.matchType, 'THEY_TEACH_YOU');
  assert.ok(m.score < computeMatch(raju, rahul, rajuSkills, rahulSkills).score);
});

test('no shared skills → no match', () => {
  assert.equal(computeMatch(raju, rahul, rajuSkills, [skill('b', 'TEACH', 'Yoga')]), null);
});

test('proficiency fit rewards a teacher who is ahead', () => {
  assert.equal(proficiencyFit('EXPERT', 'BEGINNER'), 1);
  assert.ok(proficiencyFit('BEGINNER', 'EXPERT') < proficiencyFit('INTERMEDIATE', 'INTERMEDIATE'));
});

test('availability overlap ignores windows under 30 minutes', () => {
  assert.deepEqual(availabilityOverlap([{ day: 2, startMin: 600, endMin: 620 }], [{ day: 2, startMin: 600, endMin: 700 }]), []);
});
