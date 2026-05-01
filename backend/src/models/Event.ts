import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const eventSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  hostAdminId: { type: String, required: true, index: true },
  venueId: { type: String, default: null },
  type: { type: String, enum: ['online', 'physical', 'hybrid'], required: true },
  coverImage: { type: String, trim: true },
  capacity: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'published', 'cancelled'], default: 'draft' },
  visibility: { type: String, enum: ['public', 'private', 'unlisted'], default: 'public' },
  requiresApproval: { type: Boolean, default: false },
  customQuestions: {
    type: [{
      id: { type: String, required: true, trim: true },
      question: { type: String, required: true, trim: true },
      type: { type: String, enum: ['text', 'number', 'choice'], required: true },
      required: { type: Boolean, default: false },
    }],
    default: [],
  },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    }
  }
});

export const EventModel = mongoose.model('Event', eventSchema);
