import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const userSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ['host_admin', 'attendee'], required: true },
  phone: { type: String },
  profileImage: { type: String },
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

export const UserModel = mongoose.model('User', userSchema);
