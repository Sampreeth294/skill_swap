import mongoose from 'mongoose';

const creditTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['EARN', 'SPEND', 'BONUS', 'REFUND'], required: true },
    amount: { type: Number, required: true, min: 1 },
    balanceAfter: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, maxlength: 200 },
    refType: { type: String, enum: ['SESSION', 'REQUEST', 'SIGNUP', 'ADMIN'], required: true },
    refId: { type: String, required: true },
  },
  { timestamps: true }
);

creditTransactionSchema.index({ user: 1, createdAt: -1 });
// Idempotency: the same event can never pay/charge the same user twice
creditTransactionSchema.index({ user: 1, refType: 1, refId: 1, type: 1 }, { unique: true });

export default mongoose.model('CreditTransaction', creditTransactionSchema);
