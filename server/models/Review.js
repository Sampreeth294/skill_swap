import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    connection: { type: mongoose.Schema.Types.ObjectId, ref: 'Connection', required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '', maxlength: 1000 },
    endorsedSkill: { type: String, default: '' }, // peer endorsement
    hidden: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ reviewer: 1, connection: 1 }, { unique: true }); // one review per exchange
reviewSchema.index({ reviewee: 1, createdAt: -1 });

export default mongoose.model('Review', reviewSchema);
