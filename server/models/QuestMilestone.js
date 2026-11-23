import mongoose from 'mongoose';

const questMilestoneSchema = new mongoose.Schema(
  {
    quest: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningQuest', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 120 },
    order: { type: Number, required: true },
    dueDate: Date,
    completed: { type: Boolean, default: false },
    completedAt: Date,
  },
  { timestamps: true }
);

questMilestoneSchema.index({ quest: 1, order: 1 });
questMilestoneSchema.index({ owner: 1, completed: 1, completedAt: -1 });

export default mongoose.model('QuestMilestone', questMilestoneSchema);
