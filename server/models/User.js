import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const availabilitySchema = new mongoose.Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true }, // 0 = Sunday
    startMin: { type: Number, min: 0, max: 1440, required: true },
    endMin: { type: Number, min: 0, max: 1440, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER', index: true },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE', index: true },

    avatarUrl: { type: String, default: '' },
    headline: { type: String, default: '', maxlength: 120 },
    bio: { type: String, default: '', maxlength: 1000 },
    location: { type: String, default: '', maxlength: 120 },
    experience: { type: String, default: '', maxlength: 500 },
    learningInterests: { type: [String], default: [] },
    availability: { type: [availabilitySchema], default: [] },

    // Reputation & activity — only ever updated by server-side services
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    completedExchanges: { type: Number, default: 0 },
    teachingMinutes: { type: Number, default: 0 },
    learningMinutes: { type: Number, default: 0 },
    credits: { type: Number, default: 0, min: 0 },
    streak: {
      current: { type: Number, default: 0 },
      longest: { type: Number, default: 0 },
      lastDate: { type: String, default: '' },
    },

    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userSchema.index({ name: 'text', headline: 'text', bio: 'text' });
userSchema.index({ ratingAvg: -1, completedExchanges: -1 });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
