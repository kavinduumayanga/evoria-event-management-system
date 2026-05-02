import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const checkInHistorySchema = new Schema({
  _id: { type: String, default: uuidv4 },
  eventId: { type: String, default: null, index: true },
  registrationId: { type: String, default: null, index: true },
  bookingId: { type: String, default: null, index: true },
  qrCodeValue: { type: String, required: true, trim: true, index: true },
  scannedBy: { type: String, required: true, index: true },
  result: {
    type: String,
    enum: ['success', 'duplicate', 'invalid', 'rejected'],
    required: true,
    index: true,
  },
  reason: { type: String, trim: true, default: '' },
  scannedAt: { type: Date, default: Date.now, index: true },
}, {
  timestamps: false,
  toJSON: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
    },
  },
});

checkInHistorySchema.index({ eventId: 1, scannedAt: -1 });
checkInHistorySchema.index({ scannedBy: 1, scannedAt: -1 });

export const CheckInHistoryModel = mongoose.model('CheckInHistory', checkInHistorySchema);
