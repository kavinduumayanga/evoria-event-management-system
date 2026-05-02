import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const reviewSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  eventId: { type: String, required: true, index: true },
  userId: { type: String, default: null, index: true },
  registrationId: { type: String, required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, default: '' },
}, {
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    },
  },
});

reviewSchema.index({ eventId: 1, createdAt: -1 });
reviewSchema.index({ eventId: 1, registrationId: 1 }, { unique: true });

export const ReviewModel = mongoose.model('Review', reviewSchema);
