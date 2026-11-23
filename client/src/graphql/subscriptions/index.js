import { gql } from '@apollo/client';
import { MESSAGE_FIELDS, NOTIFICATION_FIELDS, NOTE_FIELDS, ROOM_FIELDS } from '../fragments.js';

export const MESSAGE_ADDED = gql`subscription MessageAdded($connectionId: ID) { messageAdded(connectionId: $connectionId) { ...MessageFields } } ${MESSAGE_FIELDS}`;
export const TYPING = gql`subscription Typing($connectionId: ID!) { typing(connectionId: $connectionId) { connectionId userId isTyping } }`;
export const NOTIFICATION_ADDED = gql`subscription NotificationAdded { notificationAdded { ...NotificationFields } } ${NOTIFICATION_FIELDS}`;
export const PRESENCE_CHANGED = gql`subscription PresenceChanged { presenceChanged { userId isOnline lastSeen } }`;
export const REQUEST_UPDATED = gql`subscription RequestUpdated { requestUpdated { id status } }`;
export const ROOM_MESSAGE_ADDED = gql`subscription RoomMessageAdded($roomId: ID!) { roomMessageAdded(roomId: $roomId) { ...MessageFields } } ${MESSAGE_FIELDS}`;
export const ROOM_NOTE_UPDATED = gql`subscription RoomNoteUpdated($roomId: ID!) { roomNoteUpdated(roomId: $roomId) { roomId deletedId note { ...NoteFields } editor { id name } } } ${NOTE_FIELDS}`;
export const ROOM_UPDATED = gql`subscription RoomUpdated($roomId: ID!) { roomUpdated(roomId: $roomId) { ...RoomFields } } ${ROOM_FIELDS}`;
