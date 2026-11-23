import mongoose from 'mongoose';

const skillCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: '', maxlength: 300 },
    icon: { type: String, default: '✦' },
    color: { type: String, default: '#7357E8' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('SkillCategory', skillCategorySchema);
