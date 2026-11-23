import { Notification } from '../models/index.js';
import { pubsub, EVENTS } from './pubsub.js';

/** Persists a notification and pushes it to the recipient's live subscription. */
export async function notify({ user, actor, type, title, body = '', link = '', refId = '' }) {
  if (!user || (actor && String(actor) === String(user))) return null;
  const n = await Notification.create({ user, actor, type, title, body, link, refId: String(refId || '') });
  pubsub.publish(EVENTS.NOTIFICATION_ADDED, { notificationAdded: n.toObject() });
  return n;
}
