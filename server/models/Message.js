import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    // A message belongs either to a 1:1 connection or to a learning room
    connection: { type: mongoose.Schema.Types.ObjectId, ref: 'Connection' },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningRoom' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 1:1 only
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    readAt: Date,
    hidden: { type: Boolean, default: false }, // moderated by admin
  },
  { timestamps: true }
);

messageSchema.index({ connection: 1, createdAt: -1 });
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, readAt: 1, connection: 1 });
messageSchema.index({ sender: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
