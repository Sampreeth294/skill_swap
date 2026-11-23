import mongoose from 'mongoose';

const learningQuestSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 120 },
    skillName: { type: String, required: true, maxlength: 60 },
    description: { type: String, default: '', maxlength: 600 },
    targetDays: { type: Number, default: 21, min: 1, max: 365 },
    startDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['ACTIVE', 'COMPLETED'], default: 'ACTIVE' },
    completedAt: Date,
  },
  { timestamps: true }
);

learningQuestSchema.index({ owner: 1, status: 1, createdAt: -1 });

export default mongoose.model('LearningQuest', learningQuestSchema);
