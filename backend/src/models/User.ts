import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: [true, 'Name is required'], trim: true },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [emailRegex, 'Please provide a valid email address'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false,
  },
  role: { type: String, enum: ['host_admin', 'attendee'], required: true },
  phone: { type: String, trim: true },
  profileImage: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  reportCount: { type: Number, default: 0 },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
    }
  }
});

userSchema.index({ email: 1 }, { unique: true });

export const UserModel = mongoose.model('User', userSchema);
