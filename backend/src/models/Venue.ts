import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const venueSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  ownerId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  address: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  capacity: { type: Number, min: 1, default: 1 },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  type: { type: String, enum: ['physical', 'online', 'hybrid'], required: true },
  contactInfo: { type: String, trim: true, default: '' }
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
