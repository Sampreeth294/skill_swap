import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = [
  'SWAP_REQUEST', 'REQUEST_ACCEPTED', 'REQUEST_REJECTED', 'NEW_MESSAGE',
  'SESSION_INVITATION', 'SESSION_UPDATE', 'LEARNING_MILESTONE', 'EXCHANGE_COMPLETED',
  'CREDITS_EARNED', 'ACHIEVEMENT', 'NEW_REVIEW', 'ROOM_INVITE', 'SYSTEM',
];

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, default: '', maxlength: 400 },
    link: { type: String, default: '' },
    refId: { type: String, default: '' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
