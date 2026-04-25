import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const ticketTypeSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  eventId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  soldCount: { type: Number, default: 0 },
  maxPerUser: { type: Number, required: true },
  isActive: { type: Boolean, default: true }
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

export const TicketTypeModel = mongoose.model('TicketType', ticketTypeSchema);
