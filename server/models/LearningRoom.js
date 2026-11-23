import mongoose from 'mongoose';

const agendaItemSchema = new mongoose.Schema({
  text: { type: String, required: true, maxlength: 200 },
  done: { type: Boolean, default: false },
  doneBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const learningRoomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 80 },
    description: { type: String, default: '', maxlength: 500 },
    skillName: { type: String, default: '', maxlength: 60 },
    type: { type: String, enum: ['ONE_TO_ONE', 'GROUP'], default: 'ONE_TO_ONE' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    maxParticipants: { type: Number, default: 8, min: 2, max: 12 },
    schedule: { type: String, default: '', maxlength: 200 },
    agenda: { type: [agendaItemSchema], default: [] },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

learningRoomSchema.index({ participants: 1, isArchived: 1, updatedAt: -1 });

export default mongoose.model('LearningRoom', learningRoomSchema);
