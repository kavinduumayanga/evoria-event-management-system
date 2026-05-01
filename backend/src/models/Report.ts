import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const reportSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  reporterId: { type: String, required: true, index: true },
  targetType: { type: String, enum: ['event', 'user'], required: true },
  targetId: { type: String, required: true, index: true },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  isResolved: { type: Boolean, default: false },
  resolvedBy: { type: String, default: null },
  resolvedAt: { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    },
  },
});

reportSchema.index({ isResolved: 1, createdAt: -1 });

export const ReportModel = mongoose.model('Report', reportSchema);
