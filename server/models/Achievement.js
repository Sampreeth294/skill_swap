import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '🏅' },
    tier: { type: String, enum: ['BRONZE', 'SILVER', 'GOLD'], default: 'BRONZE' },
  },
  { timestamps: true }
);

achievementSchema.index({ user: 1, code: 1 }, { unique: true });

export default mongoose.model('Achievement', achievementSchema);
