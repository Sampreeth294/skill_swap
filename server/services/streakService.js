import { User } from '../models/index.js';
import { dayKey } from '../utils/time.js';

/** Records verified learning activity for today and updates the streak. */
export async function recordActivity(userId) {
  const user = await User.findById(userId);
  if (!user) return null;
  const today = dayKey();
  const yesterday = dayKey(Date.now() - 86400000);
  const s = user.streak || { current: 0, longest: 0, lastDate: '' };
  if (s.lastDate === today) return s;
  s.current = s.lastDate === yesterday ? s.current + 1 : 1;
  s.longest = Math.max(s.longest || 0, s.current);
  s.lastDate = today;
  user.streak = s;
  await user.save();
  return s;
}
