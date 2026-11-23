import mongoose from 'mongoose';

const roomNoteSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningRoom', required: true },
    title: { type: String, required: true, maxlength: 120 },
    content: { type: String, default: '', maxlength: 20000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    version: { type: Number, default: 1 }, // optimistic concurrency for collaborative editing
  },
  { timestamps: true }
);

roomNoteSchema.index({ room: 1, updatedAt: -1 });

export default mongoose.model('RoomNote', roomNoteSchema);
