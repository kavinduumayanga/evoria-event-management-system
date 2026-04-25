import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const eventSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  hostAdminId: { type: String, required: true },
  venueId: { type: String, required: true },
  coverImage: { type: String },
  capacity: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'published', 'cancelled'], default: 'draft' },
  visibility: { type: String, enum: ['public', 'private'], default: 'public' }
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
