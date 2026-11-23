import { withFilter } from 'graphql-subscriptions';
import { LearningRoom, RoomNote, Message, Connection } from '../../models/index.js';
import { requireAuth } from '../../middleware/auth.js';
import { ConflictError, ForbiddenError, InputError, NotFoundError } from '../../utils/errors.js';
import { notify } from '../../services/notificationService.js';
import { pubsub, EVENTS } from '../../services/pubsub.js';
import * as v from '../../utils/validate.js';
import { ref, refs, same, sid } from './helpers.js';
import { pageMessages } from './messageResolvers.js';

async function memberRoom(ctx, roomId) {
  const me = requireAuth(ctx);
  const room = await LearningRoom.findById(v.id(roomId, 'roomId'));
  if (!room) throw NotFoundError('Room not found.');
  if (!room.participants.some((p) => same(p, me._id))) throw ForbiddenError('You are not a participant of this room.');
  return room;
}

async function ownerRoom(ctx, roomId) {
  const room = await memberRoom(ctx, roomId);
  if (!same(room.owner, ctx.user._id)) throw ForbiddenError('Only the room owner can do that.');
  return room;
}

/** Everyone invited must be an accepted connection of the inviter. */
async function assertConnected(meId, userIds) {
  if (!userIds.length) return;
  const conns = await Connection.find({ users: meId }).select('users').lean();
  const ok = new Set(conns.flatMap((c) => c.users.map(String)));
  const bad = userIds.filter((u) => !ok.has(String(u)));
  if (bad.length) throw ForbiddenError('You can only invite people you are connected with.');
}

const publishRoom = (room) => pubsub.publish(EVENTS.ROOM_UPDATED, { roomUpdated: room.toObject() });

export default {
  Query: {
    rooms: (_p, _a, ctx) => {
      const me = requireAuth(ctx);
      return LearningRoom.find({ participants: me._id, isArchived: false }).sort({ updatedAt: -1 });
    },
    room: (_p, { id }, ctx) => memberRoom(ctx, id),
    roomMessages: async (_p, { roomId, before, limit }, ctx) => {
      const room = await memberRoom(ctx, roomId);
      return pageMessages({ room: room._id }, { before, limit });
    },
  },

  Mutation: {
    createRoom: async (_p, { input }, ctx) => {
      const me = requireAuth(ctx);
      const ids = [...new Set((input.participantIds || []).map((id) => v.id(id, 'participantId')))].filter((id) => !same(id, me._id));
      const type = input.type || 'ONE_TO_ONE';
      if (!ids.length) throw InputError('Invite at least one connected partner.');
      if (type === 'ONE_TO_ONE' && ids.length !== 1) throw InputError('A one-to-one room has exactly one partner.');
      if (ids.length > 11) throw InputError('Group rooms can have up to 12 people.');
      await assertConnected(me._id, ids);
      const room = await LearningRoom.create({
        name: v.str(input.name, 'Room name', { min: 2, max: 80 }),
        description: v.str(input.description, 'Description', { max: 500, optional: true }) || '',
        skillName: v.str(input.skillName, 'Skill', { max: 60, optional: true }) || '',
        schedule: v.str(input.schedule, 'Schedule', { max: 200, optional: true }) || '',
        type,
        owner: me._id,
        participants: [me._id, ...ids],
        maxParticipants: type === 'GROUP' ? 12 : 2,
      });
      await RoomNote.create({ room: room._id, title: 'Shared notes', content: `# ${room.name}\n\nWrite together here…`, createdBy: me._id, updatedBy: me._id });
      for (const uid of ids) {
        await notify({ user: uid, actor: me._id, type: 'ROOM_INVITE', refId: room._id, link: `/rooms/${room._id}`, title: `${me.name} added you to "${room.name}"`, body: 'Open the Knowledge Room to chat and take notes together.' });
      }
      return room;
    },

    updateRoom: async (_p, { id, input }, ctx) => {
      const room = await ownerRoom(ctx, id);
      if (input.name !== undefined) room.name = v.str(input.name, 'Room name', { min: 2, max: 80 });
      if (input.description !== undefined) room.description = v.str(input.description, 'Description', { max: 500, optional: true }) || '';
      if (input.skillName !== undefined) room.skillName = v.str(input.skillName, 'Skill', { max: 60, optional: true }) || '';
      if (input.schedule !== undefined) room.schedule = v.str(input.schedule, 'Schedule', { max: 200, optional: true }) || '';
      await room.save();
      publishRoom(room);
      return room;
    },

    addRoomParticipant: async (_p, { roomId, userId }, ctx) => {
      const room = await ownerRoom(ctx, roomId);
      const uid = v.id(userId, 'userId');
      if (room.type !== 'GROUP') throw InputError('Only group rooms can add more people.');
      if (room.participants.some((p) => same(p, uid))) throw ConflictError('Already in this room.');
      if (room.participants.length >= room.maxParticipants) throw ConflictError('This room is full.');
      await assertConnected(ctx.user._id, [uid]);
      room.participants.push(uid);
      await room.save();
      await notify({ user: uid, actor: ctx.user._id, type: 'ROOM_INVITE', refId: room._id, link: `/rooms/${room._id}`, title: `${ctx.user.name} added you to "${room.name}"` });
      publishRoom(room);
      return room;
    },

    leaveRoom: async (_p, { roomId }, ctx) => {
      const room = await memberRoom(ctx, roomId);
      if (same(room.owner, ctx.user._id)) throw InputError('Owners archive a room instead of leaving it.');
      room.participants = room.participants.filter((p) => !same(p, ctx.user._id));
      await room.save();
      publishRoom(room);
      return String(room._id);
    },

    archiveRoom: async (_p, { roomId }, ctx) => {
      const room = await ownerRoom(ctx, roomId);
      room.isArchived = true;
      await room.save();
      publishRoom(room);
      return room;
    },

    sendRoomMessage: async (_p, { roomId, body }, ctx) => {
      const room = await memberRoom(ctx, roomId);
      const msg = await Message.create({ room: room._id, sender: ctx.user._id, body: v.str(body, 'Message', { min: 1, max: 2000 }) });
      await LearningRoom.updateOne({ _id: room._id }, { updatedAt: new Date() });
      pubsub.publish(EVENTS.ROOM_MESSAGE_ADDED, { roomMessageAdded: msg.toObject() });
      return msg;
    },

    createRoomNote: async (_p, { roomId, title }, ctx) => {
      const room = await memberRoom(ctx, roomId);
      if ((await RoomNote.countDocuments({ room: room._id })) >= 30) throw InputError('A room can hold up to 30 notes.');
      const note = await RoomNote.create({ room: room._id, title: v.str(title, 'Title', { min: 1, max: 120 }), createdBy: ctx.user._id, updatedBy: ctx.user._id });
      pubsub.publish(EVENTS.ROOM_NOTE_UPDATED, { roomNoteUpdated: { roomId: String(room._id), note: note.toObject(), editorId: String(ctx.user._id) } });
      return note;
    },

    updateRoomNote: async (_p, { id, title, content, version }, ctx) => {
      const existing = await RoomNote.findById(v.id(id));
      if (!existing) throw NotFoundError('Note not found.');
      await memberRoom(ctx, existing.room);
      const patch = { updatedBy: ctx.user._id };
      if (title !== undefined && title !== null) patch.title = v.str(title, 'Title', { min: 1, max: 120 });
      if (content !== undefined && content !== null) patch.content = v.str(content, 'Content', { max: 20000, optional: true }) || '';
      // Optimistic concurrency: only applies if nobody saved in between
      const note = await RoomNote.findOneAndUpdate({ _id: existing._id, version }, { ...patch, $inc: { version: 1 } }, { returnDocument: 'after' });
      if (!note) {
        const latest = await RoomNote.findById(existing._id);
        throw ConflictError('Someone else just edited this note. Their latest version has been loaded.', { latestVersion: latest.version, latestContent: latest.content });
      }
      pubsub.publish(EVENTS.ROOM_NOTE_UPDATED, { roomNoteUpdated: { roomId: String(note.room), note: note.toObject(), editorId: String(ctx.user._id) } });
      return note;
    },

    deleteRoomNote: async (_p, { id }, ctx) => {
      const note = await RoomNote.findById(v.id(id));
      if (!note) throw NotFoundError('Note not found.');
      const room = await memberRoom(ctx, note.room);
      if (!same(note.createdBy, ctx.user._id) && !same(room.owner, ctx.user._id)) throw ForbiddenError('Only the author or room owner can delete this note.');
      await note.deleteOne();
      pubsub.publish(EVENTS.ROOM_NOTE_UPDATED, { roomNoteUpdated: { roomId: String(room._id), note: null, deletedId: String(note._id), editorId: String(ctx.user._id) } });
      return String(note._id);
    },

    addAgendaItem: async (_p, { roomId, text }, ctx) => {
      const room = await memberRoom(ctx, roomId);
      if (room.agenda.length >= 50) throw InputError('Agenda is full.');
      room.agenda.push({ text: v.str(text, 'Agenda item', { min: 1, max: 200 }) });
      await room.save();
      publishRoom(room);
      return room;
    },

    toggleAgendaItem: async (_p, { roomId, itemId }, ctx) => {
      const room = await memberRoom(ctx, roomId);
      const item = room.agenda.id(v.id(itemId, 'itemId'));
      if (!item) throw NotFoundError('Agenda item not found.');
      item.done = !item.done;
      item.doneBy = item.done ? ctx.user._id : undefined;
      await room.save();
      publishRoom(room);
      return room;
    },

    removeAgendaItem: async (_p, { roomId, itemId }, ctx) => {
      const room = await memberRoom(ctx, roomId);
      room.agenda.pull({ _id: v.id(itemId, 'itemId') });
      await room.save();
      publishRoom(room);
      return room;
    },
  },

  Subscription: {
    roomMessageAdded: {
      subscribe: withFilter(
        async (_p, { roomId }, ctx) => { await memberRoom(ctx, roomId); return pubsub.asyncIterableIterator(EVENTS.ROOM_MESSAGE_ADDED); },
        ({ roomMessageAdded: m }, { roomId }) => same(m.room, roomId)
      ),
    },
    roomNoteUpdated: {
      subscribe: withFilter(
        async (_p, { roomId }, ctx) => { await memberRoom(ctx, roomId); return pubsub.asyncIterableIterator(EVENTS.ROOM_NOTE_UPDATED); },
        ({ roomNoteUpdated: e }, { roomId }) => e.roomId === String(roomId)
      ),
    },
    roomUpdated: {
      subscribe: withFilter(
        async (_p, { roomId }, ctx) => { await memberRoom(ctx, roomId); return pubsub.asyncIterableIterator(EVENTS.ROOM_UPDATED); },
        ({ roomUpdated: r }, { roomId }, ctx) => same(r._id, roomId) && r.participants.some((p) => same(p, ctx.user._id))
      ),
    },
  },

  LearningRoom: {
    owner: ref('owner', 'user'),
    participants: refs('participants', 'user'),
    agenda: (r) => (r.agenda || []).map((a) => ({ ...(a.toObject ? a.toObject() : a), id: String(a._id) })),
    progress: (r) => (r.agenda?.length ? Math.round((r.agenda.filter((a) => a.done).length / r.agenda.length) * 100) : 0),
    notes: (r) => RoomNote.find({ room: r._id }).sort({ updatedAt: -1 }),
    isOwner: (r, _a, ctx) => same(r.owner, ctx.user?._id),
    isArchived: (r) => Boolean(r.isArchived),
  },

  AgendaItem: {
    doneBy: ref('doneBy', 'user'),
  },

  RoomNote: {
    roomId: (n) => sid(n.room),
    createdBy: ref('createdBy', 'user'),
    updatedBy: ref('updatedBy', 'user'),
    content: (n) => n.content || '',
  },

  RoomNoteEvent: {
    editor: (e, _a, ctx) => ctx.loaders.user.load(e.editorId),
  },
};
