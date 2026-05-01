import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const bookingSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  userId: { type: String, required: true },
  eventId: { type: String, required: true },
  ticketTypeId: { type: String, required: true },
  quantity: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  bookingStatus: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' },
  bookingDate: { type: String, required: true },
  rsvpStatus: { type: String, enum: ['going', 'not_going'], default: 'going' },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  checkInStatus: { type: String, enum: ['not_checked_in', 'checked_in'], default: 'not_checked_in' },
  checkedInAt: { type: Date, default: null },
  checkedInBy: { type: String, default: null },
  checkInMethod: { type: String, enum: ['qr', 'manual', null], default: null },
  qrCodeValue: { type: String, trim: true },
  attendanceNote: { type: String, trim: true },
  customAnswers: {
    type: [{
      questionId: { type: String, required: true, trim: true },
      answer: { type: String, required: true, trim: true },
    }],
    default: [],
  },
  registrationType: { type: String, enum: ['free', 'paid'], default: 'paid' },
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

bookingSchema.index({ qrCodeValue: 1 }, { unique: true, sparse: true });

export const BookingModel = mongoose.model('Booking', bookingSchema);
