import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const ticketTypeSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  eventId: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'LKR', trim: true, uppercase: true },
  isFree: { type: Boolean, default: false },
  quantity: { type: Number, required: true },
  soldCount: { type: Number, default: 0 },
  maxPerUser: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  promoCodes: {
    type: [{
      code: { type: String, required: true, trim: true, uppercase: true },
      discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
      value: { type: Number, required: true, min: 0 },
      isActive: { type: Boolean, default: true },
    }],
    default: [],
  },
  unlockCode: { type: String, trim: true }
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

ticketTypeSchema.pre('validate', function () {
  if (this.isFree) {
    this.price = 0;
  }

  if (this.soldCount > this.quantity) {
    throw new Error('soldCount cannot exceed quantity');
  }
});

export const TicketTypeModel = mongoose.model('TicketType', ticketTypeSchema);
