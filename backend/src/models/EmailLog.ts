import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const emailLogSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  recipientEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
  recipientUserId: { type: String, default: null, index: true },
  eventId: { type: String, default: null, index: true },
  registrationId: { type: String, default: null, index: true },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['registration_pending', 'registration_confirmed', 'registration_declined', 'invite', 'blast', 'reminder', 'system'],
    default: 'system',
  },
  status: {
    type: String,
    enum: ['queued', 'sent', 'failed', 'mock'],
    default: 'mock',
  },
  provider: {
    type: String,
    enum: ['gmail', 'mock'],
    default: 'mock',
  },
  errorMessage: { type: String, default: null, trim: true },
  sentAt: { type: Date, default: Date.now },
  metadata: { type: Schema.Types.Mixed, default: null },
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

emailLogSchema.index({ eventId: 1, createdAt: -1 });
emailLogSchema.index({ registrationId: 1, createdAt: -1 });
emailLogSchema.index({ recipientEmail: 1, createdAt: -1 });
emailLogSchema.index({ type: 1, createdAt: -1 });

export const EmailLogModel = mongoose.model('EmailLog', emailLogSchema);
