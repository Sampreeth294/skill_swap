import mongoose from 'mongoose';

const exchangeSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    learner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    skillName: { type: String, required: true },
  },
  { _id: false }
);

const connectionSchema = new mongoose.Schema(
  {
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    pairKey: { type: String, required: true, unique: true }, // sorted "idA_idB"
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'SwapRequest' },
    exchanges: { type: [exchangeSchema], default: [] },
    status: { type: String, enum: ['ACTIVE', 'COMPLETED'], default: 'ACTIVE' },
    completedSessions: { type: Number, default: 0 },
    completedAt: Date,
    lastMessageAt: Date,
  },
  { timestamps: true }
);

connectionSchema.index({ users: 1, status: 1 });
connectionSchema.index({ lastMessageAt: -1 });

export const pairKeyOf = (a, b) => [String(a), String(b)].sort().join('_');

export default mongoose.model('Connection', connectionSchema);
