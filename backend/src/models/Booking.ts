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
  bookingDate: { type: String, required: true }
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

export const BookingModel = mongoose.model('Booking', bookingSchema);
