import mongoose from 'mongoose';
import { normalizeSkill } from '../utils/skillNames.js';

export const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

const skillSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['TEACH', 'LEARN'], required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    normalizedName: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'SkillCategory', required: true },
    description: { type: String, default: '', maxlength: 500 },
    // TEACH: the teacher's proficiency. LEARN: the learner's current level.
    level: { type: String, enum: LEVELS, default: 'BEGINNER' },
    experienceMonths: { type: Number, default: 0, min: 0, max: 600 },
    // LEARN skills move to COMPLETED when a learning quest for it is finished
    status: { type: String, enum: ['ACTIVE', 'COMPLETED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

skillSchema.pre('validate', function setNormalized() {
  if (this.name) this.normalizedName = normalizeSkill(this.name);
});

skillSchema.index({ owner: 1, type: 1, normalizedName: 1 }, { unique: true });
skillSchema.index({ type: 1, normalizedName: 1, status: 1 });
skillSchema.index({ category: 1, type: 1, level: 1 });
skillSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Skill', skillSchema);
