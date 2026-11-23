import { User } from '../models/index.js';
import { pubsub, EVENTS } from './pubsub.js';

// userId -> number of open websocket connections (multiple tabs)
const sockets = new Map();

export async function userConnected(userId) {
  const id = String(userId);
  const n = (sockets.get(id) || 0) + 1;
  sockets.set(id, n);
  if (n === 1) {
    await User.updateOne({ _id: id }, { isOnline: true, lastSeen: new Date() });
    pubsub.publish(EVENTS.PRESENCE_CHANGED, { presenceChanged: { userId: id, isOnline: true, lastSeen: new Date() } });
  }
}

export async function userDisconnected(userId) {
  const id = String(userId);
  const n = Math.max(0, (sockets.get(id) || 1) - 1);
  if (n === 0) {
    sockets.delete(id);
    const lastSeen = new Date();
    await User.updateOne({ _id: id }, { isOnline: false, lastSeen });
    pubsub.publish(EVENTS.PRESENCE_CHANGED, { presenceChanged: { userId: id, isOnline: false, lastSeen } });
  } else {
    sockets.set(id, n);
  }
}

export const isOnline = (userId) => sockets.has(String(userId));

/** On boot nobody is connected yet. */
export const resetPresence = () => User.updateMany({ isOnline: true }, { isOnline: false });
