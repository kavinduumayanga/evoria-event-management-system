import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const sessionSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  eventId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  speakerName: { type: String },
  sessionDate: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  hallOrRoom: { type: String },
  bannerImage: { type: String },
  status: { type: String, enum: ['scheduled', 'cancelled', 'completed'], default: 'scheduled' }
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

export const SessionModel = mongoose.model('Session', sessionSchema);
