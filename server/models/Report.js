import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetType: { type: String, enum: ['USER', 'MESSAGE', 'REVIEW', 'SKILL'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // owner of reported content
    reason: { type: String, required: true, maxlength: 500 },
    status: { type: String, enum: ['OPEN', 'RESOLVED', 'DISMISSED'], default: 'OPEN' },
    resolution: { type: String, default: '' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporter: 1, targetType: 1, targetId: 1 }, { unique: true });

export default mongoose.model('Report', reportSchema);
