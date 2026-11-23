export const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const toHHMM = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

export const dayKey = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

/** Returns every overlapping weekly window between two availability lists. */
export function availabilityOverlap(a = [], b = []) {
  const out = [];
  for (const x of a) {
    for (const y of b) {
      if (x.day !== y.day) continue;
      const start = Math.max(x.startMin, y.startMin);
      const end = Math.min(x.endMin, y.endMin);
      if (end - start >= 30) out.push({ day: x.day, startMin: start, endMin: end });
    }
  }
  return out.sort((p, q) => p.day - q.day || p.startMin - q.startMin);
}
