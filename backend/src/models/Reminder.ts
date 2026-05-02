import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const reminderSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  eventId: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  scheduledAt: { type: Date, required: true, index: true },
  channels: {
    type: [String],
    enum: ['email', 'push'],
    default: ['email'],
  },
  status: {
    type: String,
    enum: ['scheduled', 'sent', 'failed'],
    default: 'scheduled',
    index: true,
  },
  createdBy: { type: String, required: true, index: true },
  sentAt: { type: Date, default: null },
  errorMessage: { type: String, trim: true, default: null },
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

reminderSchema.index({ eventId: 1, scheduledAt: -1 });
reminderSchema.index({ status: 1, scheduledAt: 1 });

export const ReminderModel = mongoose.model('Reminder', reminderSchema);
