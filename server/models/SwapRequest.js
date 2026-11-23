import mongoose from 'mongoose';

const swapRequestSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // EXCHANGE = reciprocal skill swap; CREDIT = learner pays Knowledge Credits
    mode: { type: String, enum: ['EXCHANGE', 'CREDIT'], default: 'EXCHANGE' },
    requestedSkill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true }, // a TEACH skill of `to`
    offeredSkill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }, // a TEACH skill of `from`
    creditCost: { type: Number, default: 0 }, // server-calculated
    message: { type: String, default: '', maxlength: 500 },
    status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'], default: 'PENDING' },
    respondedAt: Date,
  },
  { timestamps: true }
);

swapRequestSchema.index({ to: 1, status: 1, createdAt: -1 });
swapRequestSchema.index({ from: 1, status: 1, createdAt: -1 });
// At most one pending request per direction per pair
swapRequestSchema.index({ from: 1, to: 1 }, { unique: true, partialFilterExpression: { status: 'PENDING' } });

export default mongoose.model('SwapRequest', swapRequestSchema);
