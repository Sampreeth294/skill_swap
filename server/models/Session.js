import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    connection: { type: mongoose.Schema.Types.ObjectId, ref: 'Connection', required: true },
    proposer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    invitee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    learner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    skillName: { type: String, required: true, maxlength: 60 },
    title: { type: String, required: true, maxlength: 120 },
    agenda: { type: String, default: '', maxlength: 1000 },
    meetingLink: { type: String, default: '' },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 15, max: 240 },
    status: { type: String, enum: ['PROPOSED', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'], default: 'PROPOSED' },
    confirmations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // both must confirm completion
    completedAt: Date,
  },
  { timestamps: true }
);

sessionSchema.index({ teacher: 1, status: 1, startsAt: 1 });
sessionSchema.index({ learner: 1, status: 1, startsAt: 1 });
sessionSchema.index({ connection: 1, startsAt: -1 });

export default mongoose.model('Session', sessionSchema);
