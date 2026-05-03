import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const venueSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  ownerId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, trim: true, default: '' },
  address: { type: String, required: true },
  city: { type: String, required: true },
  capacity: { type: Number, required: true },
  type: { type: String, enum: ['physical', 'online', 'hybrid'], required: true },
  contactInfo: { type: String }
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

export const VenueModel = mongoose.model('Venue', venueSchema);
