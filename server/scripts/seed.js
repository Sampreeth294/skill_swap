/**
 * Seeds categories, an admin and a realistic demo community.
 *   npm run seed            → wipes SkillSwap collections and re-seeds
 * Demo login: raju@skillswap.dev / Demo@1234 (and the others below)
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import * as M from '../models/index.js';
import { pairKeyOf } from '../models/Connection.js';
import { CREDIT_RULES, creditsForSession } from '../services/creditService.js';
import { evaluateAchievements } from '../services/achievementService.js';

const CATEGORIES = [
  ['Programming', '💻', '#7357E8', 'Languages, frameworks and software craft'],
  ['Design', '🎨', '#E86FA3', 'UI, UX, graphic and product design'],
  ['Data & AI', '📊', '#3B82F6', 'Data science, analytics and machine learning'],
  ['Languages', '🗣️', '#14B8A6', 'Spoken languages and communication'],
  ['Music', '🎸', '#F59E0B', 'Instruments, theory and production'],
  ['Business', '📈', '#22C55E', 'Marketing, finance and entrepreneurship'],
  ['Photography', '📷', '#8B5CF6', 'Photo, video and editing'],
  ['Wellness', '🧘', '#10B981', 'Fitness, yoga and mindfulness'],
  ['Cooking', '🍳', '#EF4444', 'Cuisines, baking and nutrition'],
  ['Writing', '✍️', '#6366F1', 'Creative, technical and content writing'],
];

const avail = (...slots) => slots.map(([day, s, e]) => ({ day, startMin: s * 60, endMin: e * 60 }));
const avatar = (seed) => `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=e8e1ff,dceaff,ddf4f0`;

const PEOPLE = [
  { name: 'Raju Sharma', email: 'raju', location: 'Bengaluru, IN', headline: 'Backend engineer who loves Python', bio: 'Five years building APIs in Python and Django. I want to finally get good at React so I can ship full-stack side projects.', teach: [['Python', 'Programming', 'EXPERT', 60], ['SQL', 'Data & AI', 'ADVANCED', 48]], learn: [['React', 'Programming', 'BEGINNER'], ['UI Design', 'Design', 'BEGINNER']], interests: ['Open source', 'System design'], availability: avail([1, 19, 22], [3, 19, 22], [6, 10, 13]) },
  { name: 'Rahul Verma', email: 'rahul', location: 'Pune, IN', headline: 'Frontend developer · React enthusiast', bio: 'I build polished React apps for a fintech startup. Data science is my next adventure — Python first!', teach: [['React', 'Programming', 'EXPERT', 54], ['JavaScript', 'Programming', 'ADVANCED', 72]], learn: [['Python', 'Programming', 'BEGINNER'], ['Machine Learning', 'Data & AI', 'BEGINNER']], interests: ['Data visualisation'], availability: avail([1, 20, 23], [3, 18, 21], [6, 11, 14]) },
  { name: 'Ananya Iyer', email: 'ananya', location: 'Chennai, IN', headline: 'Product designer & illustrator', bio: 'Designing calm, human interfaces. I teach Figma and UI fundamentals and want to learn to code what I design.', teach: [['UI Design', 'Design', 'EXPERT', 84], ['Figma', 'Design', 'EXPERT', 60]], learn: [['JavaScript', 'Programming', 'BEGINNER'], ['React', 'Programming', 'BEGINNER']], interests: ['Accessibility', 'Motion design'], availability: avail([2, 18, 21], [4, 18, 21], [0, 10, 12]) },
  { name: 'Meera Nair', email: 'meera', location: 'Kochi, IN', headline: 'Data scientist · ML mentor', bio: 'Applied ML at a healthtech company. I love mentoring and want to pick up Spanish for an upcoming move.', teach: [['Machine Learning', 'Data & AI', 'EXPERT', 66], ['Python', 'Programming', 'ADVANCED', 70]], learn: [['Spanish', 'Languages', 'BEGINNER'], ['Photography', 'Photography', 'INTERMEDIATE']], interests: ['Travel'], availability: avail([1, 20, 22], [5, 19, 22], [6, 9, 12]) },
  { name: 'Carlos Méndez', email: 'carlos', location: 'Remote · Madrid', headline: 'Spanish teacher & guitarist', bio: 'Native Spanish speaker, certified teacher. Learning machine learning to build a language-learning app.', teach: [['Spanish', 'Languages', 'EXPERT', 120], ['Guitar', 'Music', 'ADVANCED', 96]], learn: [['Machine Learning', 'Data & AI', 'BEGINNER'], ['Python', 'Programming', 'BEGINNER']], interests: ['EdTech'], availability: avail([1, 19, 22], [5, 20, 23], [6, 10, 13]) },
  { name: 'Priya Kapoor', email: 'priya', location: 'Delhi, IN', headline: 'Growth marketer', bio: 'I scale startups with content and performance marketing. I want to understand SQL and dashboards properly.', teach: [['Digital Marketing', 'Business', 'EXPERT', 80], ['Copywriting', 'Writing', 'ADVANCED', 60]], learn: [['SQL', 'Data & AI', 'BEGINNER'], ['Figma', 'Design', 'BEGINNER']], interests: ['Startups'], availability: avail([2, 19, 22], [4, 19, 21], [0, 16, 19]) },
  { name: 'Arjun Reddy', email: 'arjun', location: 'Hyderabad, IN', headline: 'Wedding photographer', bio: 'Ten years behind the lens. Learning digital marketing to grow my studio.', teach: [['Photography', 'Photography', 'EXPERT', 120], ['Lightroom', 'Photography', 'ADVANCED', 84]], learn: [['Digital Marketing', 'Business', 'BEGINNER'], ['Guitar', 'Music', 'BEGINNER']], interests: ['Film', 'Travel'], availability: avail([1, 10, 13], [5, 19, 22], [6, 9, 12]) },
  { name: 'Sara Thomas', email: 'sara', location: 'Mumbai, IN', headline: 'Yoga instructor · home baker', bio: 'Certified yoga teacher and sourdough nerd. I want to learn photography to shoot my own content.', teach: [['Yoga', 'Wellness', 'EXPERT', 96], ['Baking', 'Cooking', 'ADVANCED', 60]], learn: [['Photography', 'Photography', 'BEGINNER'], ['Copywriting', 'Writing', 'BEGINNER']], interests: ['Mindfulness'], availability: avail([0, 8, 11], [3, 7, 9], [6, 8, 11]) },
  { name: 'Vikram Singh', email: 'vikram', location: 'Jaipur, IN', headline: 'Full-stack MERN developer', bio: 'MERN stack all day. Happy to teach Node.js and MongoDB; I want to learn UI design and yoga for balance.', teach: [['Node.js', 'Programming', 'EXPERT', 60], ['MongoDB', 'Programming', 'ADVANCED', 48], ['React', 'Programming', 'ADVANCED', 40]], learn: [['UI Design', 'Design', 'INTERMEDIATE'], ['Yoga', 'Wellness', 'BEGINNER']], interests: ['GraphQL', 'DevOps'], availability: avail([2, 20, 23], [4, 20, 23], [0, 9, 11]) },
  { name: 'Fatima Khan', email: 'fatima', location: 'Lucknow, IN', headline: 'Technical writer · poet', bio: 'I write docs for developer tools. Learning Node.js to understand the products I document.', teach: [['Technical Writing', 'Writing', 'EXPERT', 72], ['Copywriting', 'Writing', 'ADVANCED', 50]], learn: [['Node.js', 'Programming', 'BEGINNER'], ['Baking', 'Cooking', 'BEGINNER']], interests: ['Poetry', 'Docs-as-code'], availability: avail([2, 20, 22], [4, 20, 22], [0, 10, 12]) },
];

const daysAgo = (d, h = 19) => { const x = new Date(Date.now() - d * 86400000); x.setHours(h, 0, 0, 0); return x; };
const daysAhead = (d, h = 19) => { const x = new Date(Date.now() + d * 86400000); x.setHours(h, 0, 0, 0); return x; };

async function run() {
  await connectDB();
  console.log('Clearing collections…');
  await Promise.all(Object.values(M).filter((m) => m?.deleteMany).map((m) => m.deleteMany({})));
  await Promise.all(Object.values(M).filter((m) => m?.syncIndexes).map((m) => m.syncIndexes()));

  const cats = {};
  for (const [name, icon, color, description] of CATEGORIES) {
    cats[name] = await M.SkillCategory.create({ name, icon, color, description, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
  }

  const admin = await M.User.create({ name: 'SkillSwap Admin', email: process.env.ADMIN_EMAIL || 'admin@skillswap.dev', password: process.env.ADMIN_PASSWORD || 'Admin@12345', role: 'ADMIN', headline: 'Community team', avatarUrl: avatar('admin') });

  const users = {};
  for (const p of PEOPLE) {
    const u = await M.User.create({
      name: p.name, email: `${p.email}@skillswap.dev`, password: 'Demo@1234', location: p.location, headline: p.headline, bio: p.bio,
      avatarUrl: avatar(p.name), learningInterests: p.interests, availability: p.availability, experience: `${Math.round(p.teach[0][3] / 12)} years of hands-on ${p.teach[0][0]}`,
      credits: CREDIT_RULES.SIGNUP_BONUS, createdAt: daysAgo(40 - Object.keys(users).length * 2),
    });
    await M.CreditTransaction.create({ user: u._id, type: 'BONUS', amount: CREDIT_RULES.SIGNUP_BONUS, balanceAfter: CREDIT_RULES.SIGNUP_BONUS, reason: 'Welcome bonus', refType: 'SIGNUP', refId: String(u._id) });
    for (const [name, cat, level, months] of p.teach) await M.Skill.create({ owner: u._id, type: 'TEACH', name, category: cats[cat]._id, level, experienceMonths: months, description: `I can teach ${name} from fundamentals to real projects.` });
    for (const [name, cat, level] of p.learn) await M.Skill.create({ owner: u._id, type: 'LEARN', name, category: cats[cat]._id, level, description: `I'd love to learn ${name}.` });
    users[p.email] = u;
  }

  // A completed-style exchange between Raju (Python) and Rahul (React)
  async function connect(a, b, aTeaches, bTeaches) {
    const ta = await M.Skill.findOne({ owner: a._id, type: 'TEACH', name: aTeaches });
    const tb = await M.Skill.findOne({ owner: b._id, type: 'TEACH', name: bTeaches });
    const req = await M.SwapRequest.create({ from: a._id, to: b._id, requestedSkill: tb._id, offeredSkill: ta._id, message: `Hi! I'd love to swap ${aTeaches} for ${bTeaches}.`, status: 'ACCEPTED', respondedAt: daysAgo(20), createdAt: daysAgo(21) });
    return M.Connection.create({ users: [a._id, b._id], pairKey: pairKeyOf(a._id, b._id), request: req._id, exchanges: [{ teacher: b._id, learner: a._id, skillName: bTeaches }, { teacher: a._id, learner: b._id, skillName: aTeaches }], lastMessageAt: daysAgo(1), createdAt: daysAgo(20) });
  }

  async function completedSession(conn, teacher, learner, skillName, title, ago, minutes = 60) {
    const startsAt = daysAgo(ago);
    const s = await M.Session.create({ connection: conn._id, proposer: learner._id, invitee: teacher._id, teacher: teacher._id, learner: learner._id, skillName, title, startsAt, endsAt: new Date(startsAt.getTime() + minutes * 60000), durationMinutes: minutes, status: 'COMPLETED', confirmations: [teacher._id, learner._id], completedAt: new Date(startsAt.getTime() + minutes * 60000) });
    const credits = creditsForSession(minutes);
    const t = await M.User.findByIdAndUpdate(teacher._id, { $inc: { credits, teachingMinutes: minutes } }, { returnDocument: 'after' });
    await M.User.updateOne({ _id: learner._id }, { $inc: { learningMinutes: minutes } });
    await M.CreditTransaction.create({ user: teacher._id, type: 'EARN', amount: credits, balanceAfter: t.credits, reason: `Taught "${skillName}" (${minutes} min)`, refType: 'SESSION', refId: String(s._id), createdAt: s.completedAt });
    await M.Connection.updateOne({ _id: conn._id }, { $inc: { completedSessions: 1 } });
    return s;
  }

  const { raju, rahul, meera, carlos, ananya, vikram, arjun, sara, priya } = users;
  const c1 = await connect(raju, rahul, 'Python', 'React');
  await completedSession(c1, rahul, raju, 'React', 'React fundamentals & JSX', 14, 60);
  await completedSession(c1, raju, rahul, 'Python', 'Python basics: types & loops', 12, 90);
  await completedSession(c1, rahul, raju, 'React', 'Components, props & state', 7, 60);
  await completedSession(c1, raju, rahul, 'Python', 'Pandas for data wrangling', 4, 60);
  await M.Session.create({ connection: c1._id, proposer: raju._id, invitee: rahul._id, teacher: rahul._id, learner: raju._id, skillName: 'React', title: 'Hooks deep-dive: useEffect & custom hooks', agenda: 'Bring your todo app — we will refactor it with hooks.', startsAt: daysAhead(2), endsAt: new Date(daysAhead(2).getTime() + 3600000), durationMinutes: 60, status: 'ACCEPTED' });
  await M.Session.create({ connection: c1._id, proposer: rahul._id, invitee: raju._id, teacher: raju._id, learner: rahul._id, skillName: 'Python', title: 'Intro to scikit-learn', startsAt: daysAhead(5, 20), endsAt: new Date(daysAhead(5, 20).getTime() + 3600000), durationMinutes: 60, status: 'PROPOSED' });

  const chat = [
    [raju, 'Hey Rahul! Excited to finally learn React properly 😄'],
    [rahul, "Same here for Python! Let's start with JSX this week?"],
    [raju, 'Perfect. Wednesday 8pm works for me.'],
    [rahul, 'Booked it. I sent you a short reading list too.'],
    [raju, 'That components session was super helpful, thanks!'],
    [rahul, 'Your pandas walkthrough was 🔥 — see you Saturday.'],
  ];
  for (let i = 0; i < chat.length; i++) {
    const [sender, body] = chat[i];
    await M.Message.create({ connection: c1._id, sender: sender._id, recipient: sender === raju ? rahul._id : raju._id, body, createdAt: daysAgo(15 - i * 2, 21), readAt: i < chat.length - 1 ? daysAgo(15 - i * 2, 22) : null });
  }

  await M.Review.create({ connection: c1._id, reviewer: raju._id, reviewee: rahul._id, rating: 5, comment: 'Rahul explains React with so much clarity. Highly recommended!', endorsedSkill: 'React' });
  await M.Review.create({ connection: c1._id, reviewer: rahul._id, reviewee: raju._id, rating: 5, comment: 'Patient, structured and fun. Python finally clicked for me.', endorsedSkill: 'Python' });

  const c2 = await connect(meera, carlos, 'Machine Learning', 'Spanish');
  await completedSession(c2, carlos, meera, 'Spanish', 'Spanish: greetings & everyday phrases', 10, 60);
  await completedSession(c2, meera, carlos, 'Machine Learning', 'What is a model? Regression 101', 8, 90);
  await M.Review.create({ connection: c2._id, reviewer: meera._id, reviewee: carlos._id, rating: 5, comment: '¡Excelente profesor!', endorsedSkill: 'Spanish' });
  await M.Review.create({ connection: c2._id, reviewer: carlos._id, reviewee: meera._id, rating: 4, comment: 'Great intuition-first ML explanations.', endorsedSkill: 'Machine Learning' });

  const c3 = await connect(ananya, vikram, 'UI Design', 'React');
  await completedSession(c3, ananya, vikram, 'UI Design', 'Design systems & spacing scales', 6, 60);
  await M.Review.create({ connection: c3._id, reviewer: vikram._id, reviewee: ananya._id, rating: 5, comment: 'My apps look 10x better already.', endorsedSkill: 'UI Design' });

  // Pending requests so inboxes are not empty
  const arjunPhoto = await M.Skill.findOne({ owner: arjun._id, type: 'TEACH', name: 'Photography' });
  await M.SwapRequest.create({ from: sara._id, to: arjun._id, requestedSkill: arjunPhoto._id, mode: 'CREDIT', creditCost: CREDIT_RULES.CREDIT_REQUEST_COST, message: 'Would love to learn food photography basics!' });
  const priyaMkt = await M.Skill.findOne({ owner: priya._id, type: 'TEACH', name: 'Digital Marketing' });
  await M.SwapRequest.create({ from: arjun._id, to: priya._id, requestedSkill: priyaMkt._id, offeredSkill: arjunPhoto._id, message: 'I can shoot your product photos in exchange for marketing tips 📸' });
  const rajuSql = await M.Skill.findOne({ owner: raju._id, type: 'TEACH', name: 'SQL' });
  await M.SwapRequest.create({ from: priya._id, to: raju._id, requestedSkill: rajuSql._id, mode: 'CREDIT', creditCost: CREDIT_RULES.CREDIT_REQUEST_COST, message: 'Hi Raju, I need SQL for my marketing dashboards. Could you help?' });

  // Learning quests
  const q1 = await M.LearningQuest.create({ owner: raju._id, title: 'Learn React in 21 days', skillName: 'React', description: 'From zero to a deployed portfolio app.', targetDays: 21, startDate: daysAgo(14) });
  const ms = ['React fundamentals', 'Components and props', 'State management', 'API integration', 'Build a project'];
  for (let i = 0; i < ms.length; i++) await M.QuestMilestone.create({ quest: q1._id, owner: raju._id, title: ms[i], order: i + 1, dueDate: daysAgo(14 - Math.round(((i + 1) / ms.length) * 21)), completed: i < 3, completedAt: i < 3 ? daysAgo(12 - i * 3) : undefined });
  const q2 = await M.LearningQuest.create({ owner: raju._id, title: 'SQL window functions sprint', skillName: 'SQL', targetDays: 7, startDate: daysAgo(30), status: 'COMPLETED', completedAt: daysAgo(24) });
  for (const [i, t] of ['ROW_NUMBER & RANK', 'Running totals', 'Teach it back'].entries()) await M.QuestMilestone.create({ quest: q2._id, owner: raju._id, title: t, order: i + 1, completed: true, completedAt: daysAgo(29 - i * 2) });
  await M.User.updateOne({ _id: raju._id }, { streak: { current: 3, longest: 6, lastDate: '' } });

  // Learning room
  const room = await M.LearningRoom.create({ name: 'React ⇄ Python Lab', description: 'Our shared space for the Raju × Rahul exchange.', skillName: 'React', type: 'ONE_TO_ONE', owner: raju._id, participants: [raju._id, rahul._id], maxParticipants: 2, schedule: 'Wed & Sat evenings', agenda: [{ text: 'Finish todo app with hooks', done: true, doneBy: raju._id }, { text: 'Deploy to Vercel', done: false }, { text: 'Pandas cheat-sheet', done: false }] });
  await M.RoomNote.create({ room: room._id, title: 'React hooks cheat-sheet', content: '# Hooks\n\n- useState → local state\n- useEffect → side effects, cleanup on return\n- useMemo / useCallback → memoise expensive work\n\n## Rules\n1. Only call hooks at the top level\n2. Only call hooks from React functions', createdBy: rahul._id, updatedBy: raju._id });
  await M.Message.create({ room: room._id, sender: rahul._id, body: 'Added the hooks cheat-sheet to our notes 📝', createdAt: daysAgo(2) });

  // Notifications
  await M.Notification.create({ user: raju._id, actor: priya._id, type: 'SWAP_REQUEST', title: 'Priya Kapoor wants to learn SQL', body: 'They will pay 10 Knowledge Credits.', link: '/requests' });
  await M.Notification.create({ user: raju._id, actor: rahul._id, type: 'SESSION_INVITATION', title: 'Rahul Verma invited you to "Intro to scikit-learn"', link: '/sessions' });

  // Ratings, exchanges & badges from real seeded activity
  for (const u of Object.values(users)) {
    const [agg] = await M.Review.aggregate([{ $match: { reviewee: u._id } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
    await M.User.updateOne({ _id: u._id }, { ratingAvg: agg?.avg || 0, ratingCount: agg?.n || 0 });
  }
  await M.User.updateMany({ _id: { $in: [raju._id, rahul._id] } }, { $inc: { completedExchanges: 1 } });
  for (const u of [...Object.values(users), admin]) await evaluateAchievements(u._id);

  console.log('\n✔ Seed complete');
  console.log(`  Admin: ${admin.email} / ${process.env.ADMIN_PASSWORD || 'Admin@12345'}`);
  console.log('  Demo users (password Demo@1234):', Object.keys(users).map((k) => `${k}@skillswap.dev`).join(', '));
  await mongoose.disconnect();
}

run().catch(async (e) => { console.error(e); await mongoose.disconnect(); process.exit(1); });
