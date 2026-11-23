import { PubSub } from 'graphql-subscriptions';

/**
 * In-memory PubSub. For multiple server instances swap this for
 * graphql-redis-subscriptions (same interface) — no resolver changes needed.
 */
export const pubsub = new PubSub();

export const EVENTS = {
  MESSAGE_ADDED: 'MESSAGE_ADDED',
  ROOM_MESSAGE_ADDED: 'ROOM_MESSAGE_ADDED',
  ROOM_NOTE_UPDATED: 'ROOM_NOTE_UPDATED',
  ROOM_UPDATED: 'ROOM_UPDATED',
  NOTIFICATION_ADDED: 'NOTIFICATION_ADDED',
  PRESENCE_CHANGED: 'PRESENCE_CHANGED',
  REQUEST_UPDATED: 'REQUEST_UPDATED',
  TYPING: 'TYPING',
};
