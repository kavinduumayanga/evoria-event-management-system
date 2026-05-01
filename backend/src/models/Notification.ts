import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const notificationSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  userId: { type: String, required: true },
  eventId: { type: String, default: null },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['booking', 'reminder', 'announcement', 'checkin', 'system'],
    default: 'system',
  },
  channel: {
    type: String,
    enum: ['in_app', 'email_mock', 'sms_mock'],
    default: 'in_app',
  },
  status: {
    type: String,
    enum: ['sent', 'scheduled', 'failed'],
    default: 'sent',
  },
  isRead: { type: Boolean, default: false },
  scheduledAt: { type: Date, default: null },
  sentAt: { type: Date, default: null },
  createdBy: { type: String, default: null },
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

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ eventId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, scheduledAt: 1 });

export const NotificationModel = mongoose.model('Notification', notificationSchema);
